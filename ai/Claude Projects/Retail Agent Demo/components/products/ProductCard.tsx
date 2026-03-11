'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Product } from '@/lib/types'
import { AisleBadge } from './AisleBadge'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass overflow-hidden group hover:border-neon-green/20 transition-all duration-300 hover:shadow-[0_0_20px_rgba(57,255,20,0.06)]"
    >
      {/* Image */}
      <div className="relative h-44 bg-white/3 overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-pink text-black">
              SALE
            </span>
          )}
          {product.bogoOffer && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-yellow text-black">
              BOGO
            </span>
          )}
        </div>

        {/* Stock status */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="flex items-center gap-1.5 text-white/70 text-xs font-mono">
              <XCircle className="w-4 h-4" />
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Category + aisle */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{product.category}</span>
          <AisleBadge aisle={product.aisle} />
        </div>

        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{product.name}</p>

        {/* Price row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-mono font-bold text-neon-green">
              ${effectivePrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-xs font-mono text-white/30 line-through">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!product.inStock || added}
            className={clsx(
              'p-2 rounded-lg transition-all duration-200',
              !product.inStock
                ? 'text-white/20 cursor-not-allowed'
                : added
                  ? 'text-neon-green bg-neon-green/10 scale-110'
                  : 'text-white/50 hover:text-neon-green hover:bg-neon-green/10'
            )}
          >
            {added
              ? <CheckCircle className="w-4 h-4" />
              : <ShoppingCart className="w-4 h-4" />
            }
          </button>
        </div>

        {/* BOGO detail */}
        {product.bogoOffer && (
          <p className="text-[10px] text-neon-yellow/80 font-mono">{product.bogoOffer}</p>
        )}
      </div>
    </motion.div>
  )
}
