import { NextResponse } from 'next/server'
import products from '@/data/products.json'
import type { Product } from '@/lib/types'

const productMap = new Map((products as Product[]).map(p => [p.id, p]))

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const product = productMap.get(params.id)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  return NextResponse.json(product)
}
