'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ProductGrid } from '@/components/products/ProductGrid'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { PersonaCard } from '@/components/camera/PersonaCard'
import { usePersona } from '@/context/PersonaContext'
import { useCart } from '@/context/CartContext'
import type { Product, CartItem } from '@/lib/types'
import { Zap, ShoppingBag, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

export default function ShopPage() {
  const { persona } = usePersona()
  const { totalItems } = useCart()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [showCart, setShowCart] = useState(false)

  const handleCartUpdate = (items: CartItem[]) => {
    // Sync cart from server-side agent operations
    // The CartContext also updates via ProductCard buttons
    if (items.length > 0) setShowCart(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-3 border-b border-white/8 glass sticky top-0 z-50 rounded-none"
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Zap className="w-5 h-5 text-neon-green" />
          <span className="font-mono font-bold text-neon-green tracking-widest text-sm">FUTURESTORE</span>
        </button>

        <div className="flex items-center gap-3">
          {persona && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/20">
              <User className="w-3 h-3 text-neon-green" />
              <span className="text-xs font-mono text-neon-green capitalize">{persona.vibe}</span>
            </div>
          )}
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-neon-blue/30 transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-neon-blue" />
            <span className="text-xs font-mono text-white/70">Cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neon-pink text-black text-[9px] font-bold font-mono flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </motion.header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat + Persona */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-80 shrink-0 flex flex-col gap-3 p-4 border-r border-white/8 overflow-y-auto"
        >
          {persona && <PersonaCard persona={persona} />}
          <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
            <ChatPanel
              persona={persona}
              onProductsFound={setProducts}
              onCartUpdate={handleCartUpdate}
            />
          </div>
        </motion.aside>

        {/* Center: Products */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex-1 overflow-y-auto p-4"
        >
          <div className="mb-4">
            <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">
              {products.length > 0 ? `${products.length} Products Found` : 'Browse Our Store'}
            </h2>
          </div>
          <ProductGrid products={products} />
        </motion.main>

        {/* Right: Cart (collapsible on mobile, always visible on lg) */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={clsx(
            'w-72 shrink-0 border-l border-white/8 overflow-hidden',
            'hidden lg:flex lg:flex-col'
          )}
        >
          <div className="flex-1 p-3 min-h-0 flex flex-col">
            <CartSidebar />
          </div>
        </motion.aside>
      </div>

      {/* Mobile cart overlay */}
      {showCart && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
          onClick={() => setShowCart(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="w-80 h-full flex flex-col p-3"
            onClick={e => e.stopPropagation()}
          >
            <CartSidebar />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
