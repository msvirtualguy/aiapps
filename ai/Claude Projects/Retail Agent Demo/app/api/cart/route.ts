import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import products from '@/data/products.json'
import type { Product } from '@/lib/types'
import { getCart, setCart } from '@/lib/cart-store'

const productMap = new Map((products as Product[]).map(p => [p.id, p]))

function getSessionId(): string {
  const cookieStore = cookies()
  const existing = cookieStore.get('session_id')?.value
  return existing ?? `sess_${Math.random().toString(36).slice(2)}`
}

export async function GET() {
  const sessionId = getSessionId()
  const cart = getCart(sessionId)
  const response = NextResponse.json(cart)
  response.cookies.set('session_id', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 86400 })
  return response
}

export async function POST(request: Request) {
  const sessionId = getSessionId()
  const cart = getCart(sessionId)
  const { action, product_id, quantity = 1 } = await request.json()

  if (action === 'add') {
    const product = productMap.get(product_id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const existing = cart.find(item => item.product.id === product_id)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.push({ product, quantity })
    }
  } else if (action === 'remove') {
    const idx = cart.findIndex(item => item.product.id === product_id)
    if (idx !== -1) cart.splice(idx, 1)
  } else if (action === 'update') {
    const item = cart.find(item => item.product.id === product_id)
    if (item) {
      item.quantity = Math.max(0, quantity)
      if (item.quantity === 0) {
        const idx = cart.findIndex(item => item.product.id === product_id)
        cart.splice(idx, 1)
      }
    }
  } else if (action === 'clear') {
    cart.splice(0, cart.length)
  }

  setCart(sessionId, cart)
  const response = NextResponse.json(cart)
  response.cookies.set('session_id', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 86400 })
  return response
}
