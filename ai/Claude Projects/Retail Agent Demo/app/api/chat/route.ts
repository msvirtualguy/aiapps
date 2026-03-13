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

You have access to tools. Use them when needed, then always respond with a helpful text message.

Guidelines:
- Always call search_inventory before recommending products. Never fabricate product names or prices.
- When asked about nutrition, calories, fat, protein, etc. — call get_product_details for that product.
- After tool results are returned, respond with a helpful 2-4 sentence answer.
- Include aisle location and sale status when mentioning products.
- Use get_promotions when asked about deals, sales, or BOGOs.
- Use add_to_cart when the customer wants to add something to their cart.
- Be friendly and conversational.`
}

// Normalize: lowercase, strip diacritics (Häagen→haagen), collapse punctuation to spaces
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findProduct(query: string): Product | undefined {
  // 1. Exact ID match
  const byId = productMap.get(query)
  if (byId) return byId

  const needle = normalize(query)
  const needleCompact = needle.replace(/\s/g, '')
  const needleWords = needle.split(' ').filter(w => w.length > 2)

  return (products as Product[]).find(p => {
    const haystack = normalize(p.name)
    // 2. Substring match (handles "grain free" vs "grain-free", diacritics, etc.)
    if (haystack.includes(needle) || needle.includes(haystack.replace(/\s*\([^)]*\)\s*$/, '').trim())) return true
    if (p.id.toLowerCase() === query.toLowerCase()) return true
    // 3. Compact match: strips all spaces so "boars" matches "boar s" (from Boar's)
    const haystackCompact = haystack.replace(/\s/g, '')
    if (haystackCompact.includes(needleCompact)) return true
    // 4. Word-score: ≥70% of significant query words appear in the product name
    if (needleWords.length > 0) {
      const hits = needleWords.filter(w => haystack.includes(w) || haystackCompact.includes(w)).length
      return hits >= Math.ceil(needleWords.length * 0.7)
    }
    return false
  })
}

function buildNutritionTable(product: Product): string | null {
  if (!product.nutrition) return null
  const n = product.nutrition as unknown as Record<string, unknown>
  const KNOWN = ['servingSize','calories','fat','saturatedFat','cholesterol','sodium','carbohydrates','fiber','sugar','protein']
  const rows: [string, string][] = [
    ['Serving Size', String(n.servingSize ?? '—')],
    ['Calories', String(n.calories ?? '—')],
    ['Total Fat', n.fat != null ? `${n.fat}g` : '—'],
    ['Saturated Fat', n.saturatedFat != null ? `${n.saturatedFat}g` : '—'],
    ['Cholesterol', n.cholesterol != null ? `${n.cholesterol}mg` : '—'],
    ['Sodium', n.sodium != null ? `${n.sodium}mg` : '—'],
    ['Total Carbohydrates', n.carbohydrates != null ? `${n.carbohydrates}g` : '—'],
    ['Dietary Fiber', n.fiber != null ? `${n.fiber}g` : '—'],
    ['Total Sugar', n.sugar != null ? `${n.sugar}g` : '—'],
    ['Protein', n.protein != null ? `${n.protein}g` : '—'],
    ...Object.entries(n)
      .filter(([k]) => !KNOWN.includes(k))
      .map(([k, v]): [string, string] => [k, String(v)]),
  ]
  return `**Nutrition Facts — ${product.name}**\n\n| Nutrient | Amount |\n|---|---|\n` + rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')
}

async function dispatchTool(
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
  sessionId: string,
  persona: UserPersona | null
): Promise<{ tool_call_id: string; content: string; summary: string; nutritionTable?: string }> {
  const args = JSON.parse(toolCall.function.arguments || '{}')
  const name = toolCall.function.name

  let result: unknown = null
  let summary = ''
  let nutritionTable: string | undefined

  try {
    if (name === 'search_inventory') {
      const ids = await semanticSearch(args.query ?? '', 8)
      result = ids.map(id => {
        const p = productMap.get(id)
        if (!p) return null
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          salePrice: p.salePrice,
          bogoOffer: p.bogoOffer,
          inStock: p.inStock,
          aisle: p.aisle,
          description: p.description,
        }
      }).filter(Boolean)
      summary = `Found ${(result as Product[]).length} products matching "${args.query}"`

    } else if (name === 'get_product_details') {
      const product = findProduct(String(args.product_id))
      if (!product) {
        result = { error: 'Product not found' }
      } else {
        const table = buildNutritionTable(product)
        if (table) nutritionTable = table
        result = {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          salePrice: product.salePrice,
          bogoOffer: product.bogoOffer,
          inStock: product.inStock,
          aisle: product.aisle,
          description: product.description,
          nutritionSummary: product.nutrition
            ? `${product.nutrition.calories} cal, ${product.nutrition.protein}g protein, ${product.nutrition.fat}g fat, ${product.nutrition.carbohydrates}g carbs per serving (${product.nutrition.servingSize})`
            : null,
        }
      }
      summary = `Nutrition info: ${(result as Product)?.name ?? args.product_id}`

    } else if (name === 'add_to_cart') {
      const cart = getCart(sessionId)
      const product = findProduct(String(args.product_id))
      if (!product) {
        result = { error: 'Product not found' }
        summary = 'Product not found'
      } else {
        const existing = cart.find(i => i.product.id === product.id)
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
    nutritionTable,
  }
}

const NUTRITION_KEYWORDS = ['calori', 'fat', 'protein', 'carb', 'sodium', 'sugar', 'fiber', 'nutrition', 'ingredient', 'vitamin', 'mineral', 'cholesterol', 'saturated', 'serving']

export async function POST(request: Request) {
  const { messages, persona } = await request.json() as {
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
    persona: UserPersona | null
  }

  const lastUserContent = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const isNutritionQuery = typeof lastUserContent === 'string' &&
    NUTRITION_KEYWORDS.some(kw => lastUserContent.toLowerCase().includes(kw))

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

      const MAX_ITERATIONS = 4
      let iterations = 0
      // After the first round of tool calls, force tool_choice:'none' so the
      // model MUST produce a text response instead of looping on more tool calls.
      let hasCalledTools = false

      try {
        while (iterations < MAX_ITERATIONS) {
          iterations++

          const response = await naiClient.chat.completions.create({
            model: MODELS.llm,
            messages: history,
            tools: agentTools,
            // Force text response after first tool round — prevents Qwen 7B looping
            tool_choice: hasCalledTools ? 'none' : 'auto',
            temperature: 0.3,
            max_tokens: 2048,
          })

          const choice = response.choices[0]
          // Qwen sometimes includes preamble text alongside tool_calls — push stripped
          // version to history so tool results attach cleanly
          const msgForHistory = choice.message.tool_calls?.length
            ? { ...choice.message, content: '' }
            : choice.message
          history.push(msgForHistory)

          // Qwen (and some other models) return finish_reason:'stop' even when tool_calls
          // are present — check for tool_calls existence, not finish_reason
          if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            hasCalledTools = true

            // Dispatch all tool calls in parallel
            const toolResults = await Promise.all(
              choice.message.tool_calls.map(tc => dispatchTool(tc, sessionId, persona))
            )

            // Send tool call events to UI for visual feedback
            for (const result of toolResults) {
              send({ type: 'tool_call', name: result.summary })
            }

            // Extract results to push to UI
            for (const tc of choice.message.tool_calls) {
              const matchingResult = toolResults.find(r => r.tool_call_id === tc.id)
              if (!matchingResult) continue

              if (tc.function.name === 'search_inventory') {
                try {
                  const prods = JSON.parse(matchingResult.content)
                  if (Array.isArray(prods) && prods.length > 0) {
                    send({ type: 'products', data: prods })
                  }
                } catch { /* ignore */ }
              }

              if (tc.function.name === 'add_to_cart') {
                try {
                  const parsed = JSON.parse(matchingResult.content)
                  if (parsed.cart) send({ type: 'cart_update', data: parsed.cart })
                } catch { /* ignore */ }
              }

              // Nutrition table: send directly to UI — never rely on model to reproduce it
              if (tc.function.name === 'get_product_details' && matchingResult.nutritionTable) {
                send({ type: 'nutrition', data: matchingResult.nutritionTable })
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

            // Auto-inject get_product_details for nutrition queries if the model skipped it
            if (isNutritionQuery) {
              const alreadyCalledDetails = choice.message.tool_calls.some(
                tc => tc.function.name === 'get_product_details'
              )
              if (!alreadyCalledDetails) {
                for (const tc of choice.message.tool_calls) {
                  if (tc.function.name === 'search_inventory') {
                    const searchResult = toolResults.find(r => r.tool_call_id === tc.id)
                    if (searchResult) {
                      try {
                        const found = JSON.parse(searchResult.content)
                        if (Array.isArray(found) && found.length > 0) {
                          const fakeId = `auto_${Date.now()}`
                          const fakeCall: OpenAI.Chat.ChatCompletionMessageToolCall = {
                            id: fakeId, type: 'function',
                            function: { name: 'get_product_details', arguments: JSON.stringify({ product_id: found[0].id }) },
                          }
                          const detailsResult = await dispatchTool(fakeCall, sessionId, persona)
                          history.push({ role: 'assistant', content: '', tool_calls: [fakeCall] })
                          history.push({ role: 'tool', tool_call_id: fakeId, content: detailsResult.content })
                          send({ type: 'tool_call', name: detailsResult.summary })
                          if (detailsResult.nutritionTable) {
                            send({ type: 'nutrition', data: detailsResult.nutritionTable })
                          }
                        }
                      } catch { /* ignore */ }
                    }
                    break
                  }
                }
              }
            }

          } else {
            // Final response — model produced text
            const content = choice.message.content ?? ''
            if (content) {
              send({ type: 'message', content })
            }
            break
          }
        }

        // Fallback: if we burned through iterations without a text response, give a generic one
        // This should never happen with tool_choice:'none' on the final iteration, but just in case
        const lastMsg = history[history.length - 1]
        if (lastMsg?.role !== 'assistant' || !(lastMsg as OpenAI.Chat.ChatCompletionAssistantMessageParam).content) {
          const hasNutrition = history.some(m => m.role === 'tool')
          if (!hasNutrition) {
            send({ type: 'message', content: "I found some results for you — take a look at the products panel!" })
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
