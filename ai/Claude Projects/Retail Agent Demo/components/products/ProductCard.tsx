'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Product } from '@/lib/types'
import { AisleBadge } from './AisleBadge'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const effectivePrice = product.salePrice ?? product.price
  const hasDiscount = product.salePrice !== null

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card-hover overflow-hidden group"
    >
      {/* Image */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
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
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{product.category}</span>
          <AisleBadge aisle={product.aisle} />
        </div>

        <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{product.name}</p>

        {product.bogoOffer && (
          <p className="text-[10px] font-semibold text-amber-600">{product.bogoOffer}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-slate-900">${effectivePrice.toFixed(2)}</span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through">${product.price.toFixed(2)}</span>
            )}
          </div>
          <button onClick={handleAdd} disabled={!product.inStock || added}
            className={clsx(
              'p-2 rounded-xl transition-all duration-200',
              !product.inStock ? 'text-slate-300 cursor-not-allowed'
                : added ? 'text-emerald-600 bg-emerald-50 scale-110'
                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
            )}>
            {added ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
