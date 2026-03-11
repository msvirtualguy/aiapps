'use client'

import { AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { CartItem } from './CartItem'
import { NeonButton } from '@/components/ui/NeonButton'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CartSidebar() {
  const { items, totalItems, subtotal } = useCart()
  const router = useRouter()

  return (
    <div className="card flex flex-col h-full overflow-hidden p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-bold text-slate-900">Cart</span>
        </div>
        {totalItems > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
            {totalItems}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0 bg-slate-50/50">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-xs font-medium text-slate-400">Your cart is empty</p>
              <p className="text-[10px] mt-0.5 text-slate-300">Ask ShopBot to add items</p>
            </div>
          ) : (
            items.map(item => <CartItem key={item.product.id} item={item} />)
          )}
        </AnimatePresence>
      </div>

      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Subtotal</span>
            <span className="text-lg font-bold text-slate-900">${subtotal.toFixed(2)}</span>
          </div>
          <NeonButton variant="green" size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => router.push('/checkout')}>
            Checkout <ArrowRight className="w-3.5 h-3.5" />
          </NeonButton>
        </div>
      )}
    </div>
  )
}
