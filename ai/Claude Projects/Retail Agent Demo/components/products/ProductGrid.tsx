'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Product } from '@/lib/types'
import { ProductCard } from './ProductCard'
import { Search } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  isSearching?: boolean
}

export function ProductGrid({ products, isSearching }: ProductGridProps) {
  if (isSearching) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card shimmer h-64" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Search className="w-7 h-7 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">Ask ShopBot to find products</p>
        <p className="text-xs mt-1 text-slate-400">Try "Show me wireless headphones"</p>
      </div>
    )
  }

  return (
    <motion.div
      key={products.map(p => p.id).join(',')}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="grid grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <AnimatePresence mode="popLayout">
        {products.map(product => <ProductCard key={product.id} product={product} />)}
      </AnimatePresence>
    </motion.div>
  )
}
