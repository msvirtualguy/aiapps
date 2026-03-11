'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { CartItem as CartItemType } from '@/lib/types'
import { useCart } from '@/context/CartContext'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateItem, removeItem } = useCart()
  const price = item.product.salePrice ?? item.product.price

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex gap-2.5 p-2 rounded-xl bg-white/3 border border-white/8"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5">
        <Image
          src={item.product.imageUrl}
          alt={item.product.name}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white leading-tight line-clamp-2">{item.product.name}</p>
        <p className="text-xs font-mono text-neon-green mt-0.5">${(price * item.quantity).toFixed(2)}</p>

        {/* Quantity controls */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <button
            onClick={() => updateItem(item.product.id, item.quantity - 1)}
            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="w-5 text-center text-xs font-mono text-white">{item.quantity}</span>
          <button
            onClick={() => updateItem(item.product.id, item.quantity + 1)}
            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => removeItem(item.product.id)}
        className="shrink-0 self-start p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors mt-0.5"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  )
}
