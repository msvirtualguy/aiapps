import { cookies } from 'next/headers'
import { naiClient, MODELS } from '@/lib/nai-client'
import { agentTools } from '@/lib/agent-tools'
import { semanticSearch } from '@/lib/embeddings-cache'
import { getCart, setCart } from '@/lib/cart-store'
import products from '@/data/products.json'
import type { Product, CartItem, UserPersona } from '@/lib/types'
import type OpenAI from 'openai'

const productMap = new Map((products as Product[]).map(p => [p.id, p]))

function getSessionId(): string {
  const cookieStore = cookies()
  return cookieStore.get('session_id')?.value ?? `sess_${Math.random().toString(36).slice(2)}`
}

function buildSystemPrompt(persona: UserPersona | null, cart: CartItem[]): string {
  const personaInfo = persona
    ? `Customer profile: ${persona.ageGroup}, style: ${persona.style.join(', ')}, interests: ${persona.interests.join(', ')}, vibe: ${persona.vibe}.`
    : 'Customer profile: unknown.'

  const cartInfo = cart.length > 0
    ? `Cart has ${cart.length} item(s): ${cart.map(i => `${i.product.name} x${i.quantity}`).join(', ')}.`
    : 'Cart is empty.'

  return `You are FreshBot, an AI grocery assistant for FreshCart — a modern AI-powered grocery store.

${personaInfo}
${cartInfo}

Rules:
- ALWAYS call search_inventory before recommending products. Never fabricate product names or prices.
- Be helpful, friendly, and knowledgeable about food and nutrition. Max 3-4 sentences per response.
- When mentioning a product, include its aisle location and whether it's on sale.
- Use get_promotions when asked about deals, sales, or BOGOs.
- Use add_to_cart when the customer asks to add something to their cart.
- Use get_product_details to retrieve full nutritional info when a customer asks about calories, sugar, protein, fat, ingredients, carbs, sodium, fiber, or any nutritional details. Always call this tool for nutrition questions — never guess.
- When sharing nutrition info, format it clearly: "Per serving (X): Y calories, Zg protein, Wg sugar, etc."
- Suggest complementary grocery items when relevant (e.g., pasta + marinara sauce, chips + guacamole).
- Stay in character as a knowledgeable, friendly grocery store assistant.`
}

async function dispatchTool(
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
  sessionId: string,
  persona: UserPersona | null
): Promise<{ tool_call_id: string; content: string; summary: string }> {
  const args = JSON.parse(toolCall.function.arguments || '{}')
  const name = toolCall.function.name

  let result: unknown = null
  let summary = ''

  try {
    if (name === 'search_inventory') {
      const ids = await semanticSearch(args.query ?? '', 8)
      result = ids.map(id => productMap.get(id)).filter(Boolean)
      summary = `Found ${(result as Product[]).length} products matching "${args.query}"`

    } else if (name === 'get_product_details') {
      result = productMap.get(args.product_id) ?? { error: 'Product not found' }
      summary = `Retrieved details for ${(result as Product)?.name ?? args.product_id}`

    } else if (name === 'add_to_cart') {
      const cart = getCart(sessionId)
      const product = productMap.get(args.product_id)
      if (!product) {
        result = { error: 'Product not found' }
        summary = 'Product not found'
      } else {
        const existing = cart.find(i => i.product.id === args.product_id)
        const qty = args.quantity ?? 1
        if (existing) {
          existing.quantity += qty
        } else {
          cart.push({ product, quantity: qty })
        }
        setCart(sessionId, cart)
        result = { success: true, product: product.name, quantity: qty, cart }
        summary = `Added ${product.name} to cart`
      }

    } else if (name === 'get_promotions') {
      result = (products as Product[])
        .filter(p => p.salePrice !== null || p.bogoOffer !== null)
        .map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          originalPrice: p.price,
          salePrice: p.salePrice,
          bogoOffer: p.bogoOffer,
          aisle: p.aisle,
        }))
      summary = `Found ${(result as unknown[]).length} active promotions`

    } else if (name === 'get_cart') {
      result = getCart(sessionId)
      const cart = result as CartItem[]
      summary = cart.length > 0
        ? `Cart has ${cart.length} items`
        : 'Cart is empty'

    } else if (name === 'get_personalized_deals') {
      if (persona?.personalizedDeals) {
        const relatedProducts: Product[] = []
        for (const deal of persona.personalizedDeals) {
          const matching = (products as Product[])
            .filter(p => p.category.toLowerCase().includes(deal.category.toLowerCase()))
            .slice(0, 2)
          relatedProducts.push(...matching)
        }
        result = {
          deals: persona.personalizedDeals,
          recommendedProducts: relatedProducts,
        }
        summary = `Generated ${persona.personalizedDeals.length} personalized deals`
      } else {
        result = { deals: [], recommendedProducts: [] }
        summary = 'No personalized deals available'
      }

    } else {
      result = { error: `Unknown tool: ${name}` }
      summary = 'Unknown tool'
    }
  } catch (err) {
    result = { error: String(err) }
    summary = 'Tool error'
  }

  return {
    tool_call_id: toolCall.id,
    content: JSON.stringify(result),
    summary,
  }
}

export async function POST(request: Request) {
  const { messages, persona } = await request.json() as {
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
    persona: UserPersona | null
  }

  const sessionId = getSessionId()
  const cart = getCart(sessionId)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const history: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: buildSystemPrompt(persona, cart) },
        ...messages,
      ]

      const MAX_ITERATIONS = 5
      let iterations = 0

      try {
        while (iterations < MAX_ITERATIONS) {
          iterations++

          const response = await naiClient.chat.completions.create({
            model: MODELS.llm,
            messages: history,
            tools: agentTools,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 1024,
          })

          const choice = response.choices[0]
          history.push(choice.message)

          if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
            // Dispatch all tool calls in parallel
            const toolResults = await Promise.all(
              choice.message.tool_calls.map(tc => dispatchTool(tc, sessionId, persona))
            )

            // Send tool call events to UI for visual feedback
            for (const result of toolResults) {
              send({ type: 'tool_call', name: result.summary })
            }

            // Extract product results to send to UI for grid update
            for (const tc of choice.message.tool_calls) {
              if (tc.function.name === 'search_inventory') {
                const matchingResult = toolResults.find(r => r.tool_call_id === tc.id)
                if (matchingResult) {
                  try {
                    const products = JSON.parse(matchingResult.content)
                    if (Array.isArray(products) && products.length > 0) {
                      send({ type: 'products', data: products })
                    }
                  } catch { /* ignore parse errors */ }
                }
              }

              if (tc.function.name === 'add_to_cart') {
                const matchingResult = toolResults.find(r => r.tool_call_id === tc.id)
                if (matchingResult) {
                  try {
                    const parsed = JSON.parse(matchingResult.content)
                    if (parsed.cart) {
                      send({ type: 'cart_update', data: parsed.cart })
                    }
                  } catch { /* ignore */ }
                }
              }
            }

            // Add tool results to history
            for (const result of toolResults) {
              history.push({
                role: 'tool',
                tool_call_id: result.tool_call_id,
                content: result.content,
              })
            }

          } else {
            // Final response — stream the text
            const content = choice.message.content ?? ''
            send({ type: 'message', content })
            break
          }
        }
      } catch (err) {
        console.error('[chat] Agent error:', err)
        send({ type: 'message', content: "Oops, I hit a snag. Try asking me again?" })
      }

      send({ type: 'done' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
