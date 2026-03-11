import { naiClient, MODELS } from './nai-client'
import products from '@/data/products.json'
import type { Product } from './types'

interface CachedEmbedding {
  id: string
  embedding: number[]
}

let cache: CachedEmbedding[] | null = null
let initPromise: Promise<CachedEmbedding[]> | null = null

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function productToText(p: Product): string {
  return `${p.name} ${p.category} ${p.description} ${p.tags.join(' ')}`
}

async function buildCache(): Promise<CachedEmbedding[]> {
  if (cache) return cache

  const texts = (products as Product[]).map(productToText)

  try {
    const response = await naiClient.embeddings.create({
      model: MODELS.embeddings,
      input: texts,
    })

    cache = response.data.map((item, i) => ({
      id: (products as Product[])[i].id,
      embedding: item.embedding,
    }))

    return cache
  } catch (err) {
    console.error('[Embeddings] Failed to build cache:', err)
    // Return empty cache — semantic search will fall back gracefully
    cache = []
    return cache
  }
}

export async function getEmbeddingsCache(): Promise<CachedEmbedding[]> {
  if (cache) return cache
  if (!initPromise) {
    initPromise = buildCache()
  }
  return initPromise
}

export async function semanticSearch(query: string, topK = 6): Promise<string[]> {
  const productCache = await getEmbeddingsCache()

  if (productCache.length === 0) {
    // Fallback: keyword search when embeddings unavailable
    const q = query.toLowerCase()
    return (products as Product[])
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q)) ||
        p.description.toLowerCase().includes(q)
      )
      .slice(0, topK)
      .map(p => p.id)
  }

  try {
    const queryResponse = await naiClient.embeddings.create({
      model: MODELS.embeddings,
      input: [query],
    })
    const queryEmbedding = queryResponse.data[0].embedding

    const scored = productCache.map(item => ({
      id: item.id,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.id)
  } catch (err) {
    console.error('[Embeddings] Search failed:', err)
    return (products as Product[]).slice(0, topK).map(p => p.id)
  }
}
