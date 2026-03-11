import OpenAI from 'openai'

if (!process.env.NAI_BASE_URL) {
  console.warn('[NAI] NAI_BASE_URL not set — AI features will not work')
}

// NAI uses an internal self-signed cert — disable TLS verification for demo
// This runs server-side only (Next.js API routes), never in the browser
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

export const naiClient = new OpenAI({
  apiKey: process.env.NAI_API_KEY ?? 'demo',
  baseURL: process.env.NAI_BASE_URL ?? 'http://localhost:8080/v1',
})

export const MODELS = {
  llm: process.env.NAI_LLM_MODEL ?? 'meta-llama-3.1-70b-instruct',
  vision: process.env.NAI_VISION_MODEL ?? 'llava-1.6-34b',
  embeddings: process.env.NAI_EMBEDDINGS_MODEL ?? 'nomic-embed-text',
}
