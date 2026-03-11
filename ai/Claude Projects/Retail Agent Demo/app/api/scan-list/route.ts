import { NextResponse } from 'next/server'
import { naiClient, MODELS } from '@/lib/nai-client'
import { semanticSearch } from '@/lib/embeddings-cache'
import products from '@/data/products.json'
import type { Product } from '@/lib/types'

const productMap = new Map((products as Product[]).map(p => [p.id, p]))

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Step 1: Vision model reads the handwritten list
    const visionResponse = await naiClient.chat.completions.create({
      model: MODELS.vision,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: `This is a photo of a handwritten grocery list. Extract every item you can read and return them as a JSON array of strings.
Be generous with interpretation — if you can partially read something, include your best guess.
Example output: ["milk", "eggs", "sourdough bread", "chicken breast", "olive oil", "strawberries"]
Return ONLY the JSON array. No explanation, no markdown.`,
            },
          ],
        },
      ],
      max_tokens: 256,
      temperature: 0.2,
    })

    const content = visionResponse.choices[0]?.message?.content ?? '[]'
    const arrayMatch = content.match(/\[[\s\S]*?\]/)
    let items: string[] = []
    if (arrayMatch) {
      try {
        items = JSON.parse(arrayMatch[0])
      } catch {
        items = []
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ items: [], raw: content })
    }

    // Step 2: Semantic search for each item → find best matching product + aisle
    const results = await Promise.all(
      items.map(async (item: string) => {
        const ids = await semanticSearch(item, 1)
        const product = ids.length > 0 ? (productMap.get(ids[0]) ?? null) : null
        return {
          text: item,
          product,
          aisle: product?.aisle ?? null,
        }
      })
    )

    return NextResponse.json({ items: results })
  } catch (err) {
    console.error('[scan-list] Error:', err)
    return NextResponse.json({ error: 'Failed to scan list', items: [] }, { status: 500 })
  }
}
