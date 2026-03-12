'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, ShoppingCart, CheckCheck, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { useCart } from '@/context/CartContext'
import type { UserPersona, PastOrder, PastOrderItem } from '@/lib/types'
import products from '@/data/products.json'
import type { Product } from '@/lib/types'

const allProducts = products as Product[]

interface PastOrdersModalProps {
  persona: UserPersona
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function OrderRow({ order, onReorderAll, onReorderItems }: {
  order: PastOrder
  onReorderAll: (order: PastOrder) => void
  onReorderItems: (items: PastOrderItem[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reordered, setReordered] = useState(false)

  const toggleItem = (productId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(order.items.map(i => i.productId)))
  const clearAll = () => setSelected(new Set())

  const handleReorderAll = () => {
    onReorderAll(order)
    setReordered(true)
    setTimeout(() => setReordered(false), 2000)
  }

  const handleAddSelected = () => {
    const selectedItems = order.items.filter(i => selected.has(i.productId))
    onReorderItems(selectedItems)
    setSelected(new Set())
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Order header */}
      <div className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{formatDate(order.date)}</p>
            <p className="text-xs text-slate-400">{order.items.length} items · ${order.total.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReorderAll}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              reordered
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            )}
          >
            {reordered ? (
              <><CheckCheck className="w-3.5 h-3.5" /> Added!</>
            ) : (
              <><RotateCcw className="w-3.5 h-3.5" /> Reorder All</>
            )}
          </motion.button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Expandable item list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
              {/* Select controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <button onClick={selectAll} className="text-xs text-brand-600 font-semibold hover:text-brand-800">Select all</button>
                  <button onClick={clearAll} className="text-xs text-slate-400 font-semibold hover:text-slate-600">Clear</button>
                </div>
                {selected.size > 0 && (
                  <button
                    onClick={handleAddSelected}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Add {selected.size} to cart
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {order.items.map(item => {
                  const liveProduct = allProducts.find(p => p.id === item.productId)
                  const isSelected = selected.has(item.productId)
                  const inStock = liveProduct?.inStock !== false
                  return (
                    <label
                      key={item.productId}
                      className={clsx(
                        'flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all',
                        isSelected
                          ? 'border-brand-200 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                        !inStock && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={clsx(
                        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                      )}>
                        {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => inStock && toggleItem(item.productId)} disabled={!inStock} />

                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-slate-400">
                          Qty {item.quantity} · ${item.priceAtOrder.toFixed(2)} each
                          {!inStock && <span className="ml-1 text-rose-500">· Out of stock</span>}
                        </p>
                      </div>

                      {/* Current price if different */}
                      {liveProduct && liveProduct.price !== item.priceAtOrder && (
                        <span className="text-xs text-slate-400 shrink-0">
                          Now ${(liveProduct.salePrice ?? liveProduct.price).toFixed(2)}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PastOrdersModal({ persona, onClose }: PastOrdersModalProps) {
  const { addItem } = useCart()

  const handleReorderAll = (order: PastOrder) => {
    order.items.forEach(item => {
      const product = allProducts.find(p => p.id === item.productId)
      if (product?.inStock) {
        for (let i = 0; i < item.quantity; i++) addItem(product)
      }
    })
  }

  const handleReorderItems = (items: PastOrderItem[]) => {
    items.forEach(item => {
      const product = allProducts.find(p => p.id === item.productId)
      if (product?.inStock) {
        for (let i = 0; i < item.quantity; i++) addItem(product)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Past Orders</h2>
            <p className="text-xs text-slate-400">{persona.name} · {persona.pastOrders.length} orders</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {persona.pastOrders.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No past orders yet</p>
            </div>
          ) : (
            persona.pastOrders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onReorderAll={handleReorderAll}
                onReorderItems={handleReorderItems}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}
