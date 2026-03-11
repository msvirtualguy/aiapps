'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { CartItem as CartItemType } from '@/lib/types'
import { useCart } from '@/context/CartContext'
import { Minus, Plus, Trash2 } from 'lucide-react'

export function CartItem({ item }: { item: CartItemType }) {
  const { updateItem, removeItem } = useCart()
  const price = item.product.salePrice ?? item.product.price

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
        <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="48px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{item.product.name}</p>
        <p className="text-xs font-bold text-brand-600 mt-0.5">${(price * item.quantity).toFixed(2)}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <button onClick={() => updateItem(item.product.id, item.quantity - 1)}
            className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="w-5 text-center text-xs font-bold text-slate-700">{item.quantity}</span>
          <button onClick={() => updateItem(item.product.id, item.quantity + 1)}
            className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
      <button onClick={() => removeItem(item.product.id)}
        className="shrink-0 self-start p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors mt-0.5">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}
