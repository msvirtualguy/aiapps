'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { CartItem } from './CartItem'
import { NeonButton } from '@/components/ui/NeonButton'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CartSidebar() {
  const { items, totalItems, subtotal } = useCart()
  const router = useRouter()

  return (
    <div className="glass flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-neon-blue" />
          <span className="text-sm font-semibold text-white">Cart</span>
        </div>
        {totalItems > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neon-blue/20 text-neon-blue border border-neon-blue/30">
            {totalItems}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-white/20"
            >
              <ShoppingBag className="w-10 h-10 mb-3" />
              <p className="text-xs font-mono text-center">Your cart is empty</p>
              <p className="text-[10px] mt-1 text-white/10">Ask ShopBot to add items</p>
            </motion.div>
          ) : (
            items.map(item => (
              <CartItem key={item.product.id} item={item} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/50 font-mono">SUBTOTAL</span>
            <span className="text-base font-mono font-bold text-neon-green">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <NeonButton
            variant="green"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => router.push('/checkout')}
          >
            CHECKOUT <ArrowRight className="w-3.5 h-3.5" />
          </NeonButton>
        </div>
      )}
    </div>
  )
}
