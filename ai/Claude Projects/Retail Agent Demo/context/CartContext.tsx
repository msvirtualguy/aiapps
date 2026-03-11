'use client'

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { CartItem, Product } from '@/lib/types'

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD'; product: Product; quantity?: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'UPDATE'; productId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'SYNC'; items: CartItem[] }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => i.product.id === action.product.id)
      if (existing) {
        return {
          items: state.items.map(i =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + (action.quantity ?? 1) }
              : i
          ),
        }
      }
      return { items: [...state.items, { product: action.product, quantity: action.quantity ?? 1 }] }
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.product.id !== action.productId) }
    case 'UPDATE': {
      if (action.quantity <= 0) {
        return { items: state.items.filter(i => i.product.id !== action.productId) }
      }
      return {
        items: state.items.map(i =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      }
    }
    case 'CLEAR':
      return { items: [] }
    case 'SYNC':
      return { items: action.items }
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateItem: (productId: string, quantity: number) => void
  clearCart: () => void
  syncCart: (items: CartItem[]) => void
  totalItems: number
  subtotal: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  // Persist to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('futurestore_cart')
      if (saved) {
        dispatch({ type: 'SYNC', items: JSON.parse(saved) })
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('futurestore_cart', JSON.stringify(state.items))
    } catch { /* ignore */ }
  }, [state.items])

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = state.items.reduce((sum, i) => {
    const price = i.product.salePrice ?? i.product.price
    return sum + price * i.quantity
  }, 0)

  return (
    <CartContext.Provider value={{
      items: state.items,
      addItem: (product, quantity) => dispatch({ type: 'ADD', product, quantity }),
      removeItem: (productId) => dispatch({ type: 'REMOVE', productId }),
      updateItem: (productId, quantity) => dispatch({ type: 'UPDATE', productId, quantity }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      syncCart: (items) => dispatch({ type: 'SYNC', items }),
      totalItems,
      subtotal,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
