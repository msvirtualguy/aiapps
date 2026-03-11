'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Product } from '@/lib/types'
import { AisleBadge } from './AisleBadge'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, CheckCircle, XCircle, Star } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={clsx('w-3 h-3', i <= full ? 'fill-amber-400 text-amber-400' : half && i === full + 1 ? 'fill-amber-200 text-amber-400' : 'fill-slate-100 text-slate-300')}
          />
        ))}
      </div>
      <span className="text-[10px] text-slate-400">({count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count})</span>
    </div>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const effectivePrice = product.salePrice ?? product.price
  const hasDiscount = product.salePrice !== null
  const savingsAmount = hasDiscount ? (product.price - product.salePrice!).toFixed(2) : null

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card-hover overflow-hidden group flex flex-col"
    >
      {/* Image */}
      <div className="relative h-44 bg-slate-100 overflow-hidden shrink-0">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && <span className="badge-sale">SALE</span>}
          {product.bogoOffer && <span className="badge-bogo">BOGO</span>}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
              <XCircle className="w-4 h-4" /> Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{product.category}</span>
          <AisleBadge aisle={product.aisle} />
        </div>

        <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2 flex-1">{product.name}</p>

        <StarRating rating={product.rating} count={product.reviewCount} />

        {product.bogoOffer && (
          <p className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit">{product.bogoOffer}</p>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-slate-900">${effectivePrice.toFixed(2)}</span>
          {hasDiscount && (
            <>
              <span className="text-xs text-slate-400 line-through">${product.price.toFixed(2)}</span>
              <span className="text-xs font-semibold text-emerald-600">Save ${savingsAmount}</span>
            </>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAdd}
          disabled={!product.inStock || added}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
            !product.inStock
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
              : added
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
          )}>
          {added
            ? <><CheckCircle className="w-4 h-4" /> Added!</>
            : <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
          }
        </button>
      </div>
    </motion.div>
  )
}
