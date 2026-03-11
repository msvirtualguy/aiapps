import { NextResponse } from 'next/server'
import { semanticSearch } from '@/lib/embeddings-cache'
import products from '@/data/products.json'
import type { Product } from '@/lib/types'

const productMap = new Map((products as Product[]).map(p => [p.id, p]))

export async function POST(request: Request) {
  try {
    const { query, topK = 6 } = await request.json()

    if (!query?.trim()) {
      return NextResponse.json([])
    }

    const ids = await semanticSearch(query, topK)
    const results = ids
      .map(id => productMap.get(id))
      .filter((p): p is Product => p !== undefined)

    return NextResponse.json(results)
  } catch (err) {
    console.error('[search-products] Error:', err)
    return NextResponse.json([])
  }
}
