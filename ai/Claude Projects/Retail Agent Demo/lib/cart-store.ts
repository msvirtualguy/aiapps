import type { CartItem } from './types'

// Module-level singleton — shared across all API routes in the same Node.js process
// Sufficient for a single-replica demo deployment
const cartStore = new Map<string, CartItem[]>()

export function getCart(sessionId: string): CartItem[] {
  if (!cartStore.has(sessionId)) {
    cartStore.set(sessionId, [])
  }
  return cartStore.get(sessionId)!
}

export function setCart(sessionId: string, items: CartItem[]): void {
  cartStore.set(sessionId, items)
}
