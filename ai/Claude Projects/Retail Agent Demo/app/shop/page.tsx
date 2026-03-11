'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ProductGrid } from '@/components/products/ProductGrid'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { PersonaCard } from '@/components/camera/PersonaCard'
import { GroceryListScanner } from '@/components/scanner/GroceryListScanner'
import { usePersona } from '@/context/PersonaContext'
import { useCart } from '@/context/CartContext'
import type { Product, CartItem } from '@/lib/types'
import allProducts from '@/data/products.json'
import { ShoppingBag, User, ChevronRight, ScanLine } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ShopPage() {
  const { persona } = usePersona()
  const { totalItems } = useCart()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(allProducts as Product[])
  const [showCart, setShowCart] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

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
          <button onClick={() => router.push('/')} className="hover:opacity-80 transition-opacity">
            <Image
              src="https://www.cswg.com/wp-content/uploads/2026/01/CS_Wholesale_Grocers_logo.svg"
              alt="C&S Wholesale Grocers"
              width={140}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </button>

          <div className="flex items-center gap-2">
            {persona && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100">
                <User className="w-3 h-3 text-brand-500" />
                <span className="text-xs font-semibold text-brand-700 capitalize">{persona.vibe}</span>
              </div>
            )}
            <button onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 transition-all">
              <ScanLine className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Scan List</span>
            </button>
            <button onClick={() => setShowCart(!showCart)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-brand-200 hover:bg-brand-50 transition-all">
              <ShoppingBag className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-700">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">
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
              {products.length > 0 ? `${products.length} Items` : 'All Products'}
            </h2>
            {products.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-brand-600 font-medium">
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

      {/* Grocery list scanner modal */}
      <AnimatePresence>
        {showScanner && <GroceryListScanner onClose={() => setShowScanner(false)} />}
      </AnimatePresence>

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
