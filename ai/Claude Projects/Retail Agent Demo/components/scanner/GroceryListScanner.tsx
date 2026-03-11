'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, ScanLine, ShoppingCart, CheckCircle, MapPin, AlertCircle, ImageIcon, CheckCheck } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import type { Product } from '@/lib/types'
import { clsx } from 'clsx'

interface ListItem {
  text: string
  product: Product | null
  aisle: string | null
}

interface GroceryListScannerProps {
  onClose: () => void
}

export function GroceryListScanner({ onClose }: GroceryListScannerProps) {
  const { addItem } = useCart()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [items, setItems] = useState<ListItem[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<'reading' | 'matching' | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string)
      setItems([])
      setAdded(new Set())
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!preview) return
    setScanning(true)
    setError(null)
    setItems([])
    setStage('reading')

    try {
      // Strip the data URL prefix to get raw base64
      const base64 = preview.split(',')[1]

      setTimeout(() => setStage('matching'), 1200)

      const res = await fetch('/api/scan-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      const data = await res.json()

      if (data.error && (!data.items || data.items.length === 0)) {
        setError('Could not read the list. Try a clearer photo with better lighting.')
      } else {
        setItems(data.items ?? [])
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setScanning(false)
      setStage(null)
    }
  }

  const handleAddItem = (item: ListItem) => {
    if (!item.product) return
    addItem(item.product)
    setAdded(prev => new Set(prev).add(item.text))
  }

  const handleAddAll = () => {
    items.forEach(item => {
      if (item.product && !added.has(item.text)) {
        addItem(item.product)
      }
    })
    setAdded(new Set(items.map(i => i.text)))
  }

  const matchedCount = items.filter(i => i.product).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Scan Grocery List</h2>
              <p className="text-xs text-slate-400">Photo your handwritten list</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            className={clsx(
              'relative rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden',
              preview ? 'border-brand-200' : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30'
            )}
            style={{ minHeight: preview ? 200 : 120 }}
          >
            {preview ? (
              <>
                <Image src={preview} alt="List preview" fill className="object-contain" />
                {/* Scan animation overlay */}
                {scanning && (
                  <div className="absolute inset-0 bg-[#32373C]/10">
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_12px_3px_rgba(243,63,63,0.7)]"
                      initial={{ top: '0%' }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Tap to upload photo</p>
                  <p className="text-xs text-slate-400 mt-0.5">Take a photo of your grocery list</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" />

          {/* Scan status */}
          {scanning && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 border border-brand-100">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full shrink-0"
              />
              <p className="text-sm font-medium text-brand-700">
                {stage === 'reading' ? 'Reading your list...' : 'Finding items in store...'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Results */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {matchedCount} of {items.length} items found
                </p>
                {matchedCount > 0 && added.size < matchedCount && (
                  <button
                    onClick={handleAddAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Add all to cart
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isAdded = added.has(item.text)
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={clsx(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        isAdded
                          ? 'border-emerald-200 bg-emerald-50'
                          : item.product
                          ? 'border-slate-200 bg-white hover:border-brand-200'
                          : 'border-slate-100 bg-slate-50'
                      )}
                    >
                      {/* Item text + match */}
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-semibold capitalize truncate', isAdded ? 'text-emerald-800' : 'text-slate-800')}>
                          {item.text}
                        </p>
                        {item.product ? (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{item.product.name}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Not found in store</p>
                        )}
                      </div>

                      {/* Aisle badge */}
                      {item.aisle && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-50 border border-brand-100 shrink-0">
                          <MapPin className="w-3 h-3 text-brand-500" />
                          <span className="text-xs font-bold text-brand-600">{item.aisle}</span>
                        </div>
                      )}

                      {/* Add button */}
                      {item.product && (
                        <button
                          onClick={() => handleAddItem(item)}
                          disabled={isAdded}
                          className={clsx(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                            isAdded
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                          )}
                        >
                          {isAdded
                            ? <CheckCircle className="w-3.5 h-3.5" />
                            : <ShoppingCart className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          {preview && !scanning && items.length === 0 && (
            <button
              onClick={handleScan}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all"
            >
              <ScanLine className="w-4 h-4" />
              Scan List
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => { setPreview(null); setItems([]); setAdded(new Set()) }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Scan Another
            </button>
          )}
          <button
            onClick={onClose}
            className={clsx(
              'py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors',
              items.length > 0 ? 'px-4' : 'flex-1'
            )}
          >
            {items.length > 0 ? 'Done' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
