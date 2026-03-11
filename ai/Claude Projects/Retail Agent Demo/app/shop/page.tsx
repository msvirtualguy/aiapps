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
import { Zap, ShoppingBag, User, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

export default function ShopPage() {
  const { persona } = usePersona()
  const { totalItems } = useCart()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [showCart, setShowCart] = useState(false)

  const handleCartUpdate = (items: CartItem[]) => {
    if (items.length > 0) setShowCart(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm"
      >
        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">FutureStore</span>
          </button>

          <div className="flex items-center gap-2">
            {persona && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                <User className="w-3 h-3 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 capitalize">{persona.vibe}</span>
              </div>
            )}
            <button onClick={() => setShowCart(!showCart)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
              <ShoppingBag className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-700">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat + Persona */}
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-80 shrink-0 flex flex-col gap-3 p-4 border-r border-slate-200 overflow-y-auto bg-white"
        >
          {persona && <PersonaCard persona={persona} />}
          <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
            <ChatPanel persona={persona} onProductsFound={setProducts} onCartUpdate={handleCartUpdate} />
          </div>
        </motion.aside>

        {/* Center: Products */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex-1 overflow-y-auto p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
              {products.length > 0 ? `${products.length} Results` : 'Discover Products'}
            </h2>
            {products.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                AI-powered search <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <ProductGrid products={products} />
        </motion.main>

        {/* Right: Cart (desktop) */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-72 shrink-0 border-l border-slate-200 hidden lg:flex lg:flex-col bg-white"
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
          className="lg:hidden fixed inset-0 z-50 bg-black/40 flex justify-end"
          onClick={() => setShowCart(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="w-80 h-full bg-white p-3"
            onClick={e => e.stopPropagation()}
          >
            <CartSidebar />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
