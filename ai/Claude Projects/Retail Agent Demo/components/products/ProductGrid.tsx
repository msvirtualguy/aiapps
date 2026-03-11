'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Product } from '@/lib/types'
import { ProductCard } from './ProductCard'
import { Search } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  isSearching?: boolean
}

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export function ProductGrid({ products, isSearching }: ProductGridProps) {
  if (isSearching) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass shimmer h-64 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30">
        <Search className="w-12 h-12 mb-4 opacity-40" />
        <p className="text-sm font-mono">Ask ShopBot to find products for you</p>
        <p className="text-xs mt-1 opacity-60">e.g. "Show me wireless headphones"</p>
      </div>
    )
  }

  return (
    <motion.div
      key={products.map(p => p.id).join(',')}
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <AnimatePresence mode="popLayout">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
