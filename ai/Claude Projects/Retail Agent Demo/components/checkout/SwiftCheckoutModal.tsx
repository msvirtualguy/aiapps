'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Zap, CreditCard, Smartphone, DollarSign, ChevronRight, Camera, Tag, ScanLine, ShoppingCart } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import type { UserPersona, Product } from '@/lib/types'
import Image from 'next/image'
import allProducts from '@/data/products.json'

type Phase = 'camera' | 'analyzing' | 'review' | 'processing' | 'confirmed'
type DetectedItem = { product: Product; quantity: number }
type PaymentOption = { id: string; type: 'apple-pay' | 'venmo' | 'credit-card' | 'debit-card'; label: string; handle?: string }

// Curated realistic cart scenarios — product images used as the "cart photo"
const CART_SCENARIOS = [
  {
    label: 'CHECKOUT LANE 3',
    itemIds: [
      { id: 'prod-001',   qty: 1 }, // Organic Strawberries — on sale
      { id: 'dairy-004',  qty: 2 }, // Free-Range Eggs — on sale
      { id: 'bakery-001', qty: 1 }, // Artisan Sourdough — on sale
      { id: 'bev-001',    qty: 1 }, // OJ — on sale
      { id: 'snack-004',  qty: 1 }, // Oreos — on sale
      { id: 'frozen-006', qty: 1 }, // Ben & Jerry's — on sale
    ],
  },
  {
    label: 'CHECKOUT LANE 1',
    itemIds: [
      { id: 'meat-002',   qty: 1 }, // Salmon — on sale
      { id: 'pantry-001', qty: 1 }, // Olive Oil — on sale
      { id: 'pantry-004', qty: 1 }, // Rao's Marinara — on sale
      { id: 'pantry-002', qty: 2 }, // Barilla Pasta — BOGO
      { id: 'prod-003',   qty: 1 }, // Baby Spinach — BOGO
      { id: 'deli-002',   qty: 1 }, // Guacamole — on sale
    ],
  },
  {
    label: 'CHECKOUT LANE 5',
    itemIds: [
      { id: 'snack-003',  qty: 2 }, // Doritos — on sale
      { id: 'bev-004',    qty: 2 }, // Coke — on sale
      { id: 'frozen-004', qty: 1 }, // DiGiorno — on sale
      { id: 'frozen-005', qty: 2 }, // Hot Pockets — BOGO
      { id: 'deli-001',   qty: 1 }, // Turkey Breast — on sale
      { id: 'snack-002',  qty: 2 }, // Siete Chips — BOGO
    ],
  },
]

// Positions/rotations for product images in the cart composite view
const PRODUCT_POSITIONS = [
  { top: '6%',  left: '4%',  w: '30%', rotate: '-9deg',  zIndex: 3 },
  { top: '4%',  left: '36%', w: '28%', rotate: '6deg',   zIndex: 2 },
  { top: '3%',  left: '65%', w: '30%', rotate: '-5deg',  zIndex: 3 },
  { top: '48%', left: '6%',  w: '28%', rotate: '11deg',  zIndex: 2 },
  { top: '45%', left: '36%', w: '30%', rotate: '-7deg',  zIndex: 3 },
  { top: '46%', left: '66%', w: '28%', rotate: '8deg',   zIndex: 2 },
]

// Approximate bounding-box positions for detection overlays
const DETECTION_BOXES = [
  { x: 8,  y: 12, w: 24, h: 28 },
  { x: 38, y: 18, w: 22, h: 26 },
  { x: 66, y: 10, w: 26, h: 32 },
  { x: 12, y: 52, w: 24, h: 28 },
  { x: 42, y: 48, w: 28, h: 32 },
  { x: 68, y: 54, w: 24, h: 30 },
]

function buildPaymentOptions(persona: UserPersona | null): PaymentOption[] {
  const options: PaymentOption[] = []
  if (persona?.paymentDetails) {
    const pd = persona.paymentDetails
    options.push({ id: 'primary', type: pd.type, label: pd.label, handle: pd.handle })
  }
  const types = options.map(o => o.type)
  if (!types.includes('apple-pay'))  options.push({ id: 'apple',  type: 'apple-pay',   label: 'Apple Pay' })
  if (!types.includes('credit-card')) options.push({ id: 'card',   type: 'credit-card',  label: 'Credit Card on file' })
  if (!types.includes('venmo') && options.length < 3)
    options.push({ id: 'venmo', type: 'venmo', label: 'Venmo' })
  return options.slice(0, 3)
}

function PaymentIcon({ type }: { type: string }) {
  if (type === 'apple-pay') return <Smartphone className="w-4 h-4" />
  if (type === 'venmo')     return <DollarSign  className="w-4 h-4" />
  return                           <CreditCard  className="w-4 h-4" />
}

interface Props {
  persona: UserPersona | null
  onClose: () => void
}

export function SwiftCheckoutModal({ persona, onClose }: Props) {
  const { addItem, clearCart } = useCart()
  const products = allProducts as Product[]

  const [scenario]         = useState(() => CART_SCENARIOS[Math.floor(Math.random() * CART_SCENARIOS.length)])
  const [phase, setPhase]  = useState<Phase>('camera')
  const [flash, setFlash]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [visibleBoxes, setVisibleBoxes]   = useState<number[]>([])
  const [visibleItems, setVisibleItems]   = useState<DetectedItem[]>([])
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null)
  const [itemsAdded, setItemsAdded] = useState(false)

  const paymentOptions = buildPaymentOptions(persona)
  const [orderId] = useState(() => `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)

  // Resolve detected items from scenario
  const detectedItems: DetectedItem[] = scenario.itemIds
    .map(({ id, qty }) => {
      const product = products.find(p => p.id === id)
      return product ? { product, quantity: qty } : null
    })
    .filter((x): x is DetectedItem => x !== null)

  // Savings math
  const regularTotal = detectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const saleTotal    = detectedItems.reduce((s, i) => s + (i.product.salePrice ?? i.product.price) * i.quantity, 0)
  const savings      = regularTotal - saleTotal

  useEffect(() => {
    if (paymentOptions.length > 0) setSelectedPayment(paymentOptions[0])
  }, []) // eslint-disable-line

  // Phase 1: camera viewfinder → shutter flash → analyzing
  useEffect(() => {
    const t1 = setTimeout(() => setFlash(true),              1200)
    const t2 = setTimeout(() => setFlash(false),             1600)
    const t3 = setTimeout(() => setPhase('analyzing'),       1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Phase 2: progress bar + detection boxes → review
  useEffect(() => {
    if (phase !== 'analyzing') return
    const interval = setInterval(() => setProgress(p => Math.min(p + 2.5, 100)), 80)

    const boxTimers = detectedItems.map((_, i) =>
      setTimeout(() => setVisibleBoxes(prev => [...prev, i]), 300 + i * 380)
    )

    const done = setTimeout(() => {
      setPhase('review')
      detectedItems.forEach((item, i) => {
        setTimeout(() => setVisibleItems(prev => [...prev, item]), 150 + i * 180)
      })
    }, 300 + detectedItems.length * 380 + 700)

    return () => {
      clearInterval(interval)
      boxTimers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [phase]) // eslint-disable-line

  // Phase: processing → confirmed
  useEffect(() => {
    if (phase !== 'processing') return
    const t = setTimeout(() => setPhase('confirmed'), 2500)
    return () => clearTimeout(t)
  }, [phase])

  const handlePay = () => {
    if (!itemsAdded) {
      detectedItems.forEach(({ product, quantity }) => addItem(product, quantity))
      setItemsAdded(true)
    }
    setPhase('processing')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-900 text-sm">Swift Checkout</span>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">· in-store cam</span>
          </div>
          {phase === 'confirmed' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          <AnimatePresence mode="wait">

            {/* ── PHASE 1 + 2: Camera + Analyzing ── */}
            {(phase === 'camera' || phase === 'analyzing') && (
              <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                <div className="relative rounded-xl overflow-hidden bg-slate-800 mb-4" style={{ aspectRatio: '4/3' }}>
                  {/* Cart background — subtle wireframe */}
                  <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-[0.07]">
                    <ShoppingCart className="w-64 h-64 text-white" />
                  </div>
                  {/* Product images scattered to simulate items in a physical cart */}
                  {detectedItems.slice(0, 6).map((item, i) => {
                    const pos = PRODUCT_POSITIONS[i % PRODUCT_POSITIONS.length]
                    return (
                      <div
                        key={item.product.id}
                        className="absolute rounded-lg overflow-hidden shadow-xl border border-white/10"
                        style={{
                          top: pos.top, left: pos.left, width: pos.w,
                          aspectRatio: '1/1', transform: `rotate(${pos.rotate})`,
                          zIndex: pos.zIndex,
                        }}
                      >
                        <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="120px" />
                      </div>
                    )
                  })}
                  <div className="absolute inset-0 bg-black/25" />

                  {/* Corner brackets */}
                  {[
                    'top-2 left-2 border-t-2 border-l-2',
                    'top-2 right-2 border-t-2 border-r-2',
                    'bottom-2 left-2 border-b-2 border-l-2',
                    'bottom-2 right-2 border-b-2 border-r-2',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-7 h-7 border-green-400 ${cls}`} />
                  ))}

                  {/* AI detection boxes */}
                  {phase === 'analyzing' && visibleBoxes.map(i => {
                    const b = DETECTION_BOXES[i % DETECTION_BOXES.length]
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1,  scale: 1 }}
                        className="absolute border border-green-400"
                        style={{
                          left: `${b.x}%`, top: `${b.y}%`,
                          width: `${b.w}%`, height: `${b.h}%`,
                          boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                        }}
                      >
                        <span className="absolute -top-4 left-0 text-[8px] font-mono text-green-300 whitespace-nowrap bg-black/40 px-1 rounded">
                          {detectedItems[i]?.product.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </motion.div>
                    )
                  })}

                  {/* Scan line */}
                  {phase === 'analyzing' && (
                    <motion.div
                      className="absolute left-1 right-1 h-0.5 bg-green-400 pointer-events-none"
                      style={{ boxShadow: '0 0 8px 3px rgba(74,222,128,0.7)' }}
                      animate={{ top: ['8%', '92%', '8%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Shutter flash */}
                  <AnimatePresence>
                    {flash && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 0.95 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.08 }}
                        className="absolute inset-0 bg-white"
                      />
                    )}
                  </AnimatePresence>

                  {/* HUD overlays */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                    <span className="text-[9px] font-mono text-white/70 tracking-widest">REC</span>
                  </div>
                  <div className="absolute bottom-2 left-3 text-[9px] font-mono text-green-300/80">
                    {new Date().toLocaleTimeString()} · {scenario.label}
                  </div>
                  {phase === 'analyzing' && (
                    <div className="absolute bottom-2 right-3 text-[9px] font-mono text-white/50">
                      {visibleBoxes.length}/{detectedItems.length} ITEMS
                    </div>
                  )}

                  {/* Camera pulse (camera phase only) */}
                  {phase === 'camera' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}>
                        <Camera className="w-12 h-12 text-white/50" />
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Progress bar (analyzing phase) */}
                {phase === 'analyzing' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <ScanLine className="w-3 h-3" />
                        AI detecting items…
                      </span>
                      <span className="font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-green-400 rounded-full" style={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-1">
                    <Camera className="w-3 h-3" /> Capturing cart…
                  </p>
                )}
              </motion.div>
            )}

            {/* ── PHASE 3: Review items + savings + payment selection ── */}
            {phase === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  {detectedItems.length} items detected
                </p>

                {/* Detected items list */}
                <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                  <AnimatePresence>
                    {visibleItems.map((item, i) => {
                      const hasSale = item.product.salePrice !== null
                      const hasBogo = item.product.bogoOffer !== null
                      return (
                        <motion.div
                          key={item.product.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-3 py-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                              {item.product.name}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {item.quantity > 1 && <span className="text-[9px] text-slate-400">×{item.quantity}</span>}
                              {hasBogo && <span className="text-[8px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{item.product.bogoOffer}</span>}
                              {hasSale && <span className="text-[8px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">SALE</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-1">
                            {hasSale ? (
                              <>
                                <p className="text-xs font-bold text-green-600">${(item.product.salePrice! * item.quantity).toFixed(2)}</p>
                                <p className="text-[9px] text-slate-400 line-through">${(item.product.price * item.quantity).toFixed(2)}</p>
                              </>
                            ) : (
                              <p className="text-xs font-bold text-slate-700">${(item.product.price * item.quantity).toFixed(2)}</p>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* Savings + total */}
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Regular price</span>
                    <span className="line-through">${regularTotal.toFixed(2)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-green-700">
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Savings applied</span>
                      <span>−${savings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-green-200">
                    <span>Total due</span>
                    <span>${saleTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment method</p>
                <div className="space-y-2 mb-4">
                  {paymentOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedPayment(opt)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all ${
                        selectedPayment?.id === opt.id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                          opt.type === 'apple-pay' ? 'bg-black' : opt.type === 'venmo' ? 'bg-[#008CFF]' : 'bg-slate-700'
                        }`}>
                          <PaymentIcon type={opt.type} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">{opt.label}</p>
                          {opt.handle && <p className="text-[10px] text-slate-400">{opt.handle}</p>}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedPayment?.id === opt.id ? 'border-brand-500' : 'border-slate-300'
                      }`}>
                        {selectedPayment?.id === opt.id && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handlePay}
                  disabled={!selectedPayment || visibleItems.length < detectedItems.length}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-40"
                >
                  <Zap className="w-4 h-4" />
                  Add to Cart & Pay ${saleTotal.toFixed(2)}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── PHASE 4: Payment processing ── */}
            {phase === 'processing' && selectedPayment && (
              <motion.div key="processing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-slate-900">${saleTotal.toFixed(2)}</p>
                  {savings > 0 && <p className="text-xs text-green-600 font-semibold">Saving ${savings.toFixed(2)}</p>}
                </div>
                <ProcessingPanel payment={selectedPayment} />
              </motion.div>
            )}

            {/* ── PHASE 5: Confirmed ── */}
            {phase === 'confirmed' && selectedPayment && (
              <ConfirmedView
                key="confirmed"
                itemCount={detectedItems.length}
                total={saleTotal}
                savings={savings}
                payment={selectedPayment}
                orderId={orderId}
                clearCart={clearCart}
                onClose={onClose}
              />
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Sub-components ──

function ProcessingPanel({ payment }: { payment: PaymentOption }) {
  const spinner = (
    <motion.div
      className="w-9 h-9 rounded-full border-2 border-white/30 border-t-white mx-auto"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    />
  )

  const wrapperCls = `rounded-xl p-5 text-white text-center ${
    payment.type === 'apple-pay' ? 'bg-black' :
    payment.type === 'venmo'     ? 'bg-[#008CFF]' :
    'bg-slate-800'
  }`

  return (
    <div className={wrapperCls}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <PaymentIcon type={payment.type} />
        <span className="text-sm font-bold">{payment.label}</span>
      </div>
      {spinner}
      <p className="text-xs text-white/70 mt-3">Processing payment…</p>
      {payment.type === 'apple-pay' && <p className="text-[10px] text-white/40 mt-1">Face ID authorized</p>}
      {payment.handle && <p className="text-[10px] text-white/50 mt-1">{payment.handle}</p>}
    </div>
  )
}

function ConfirmedView({ itemCount, total, savings, payment, orderId, clearCart, onClose }: {
  itemCount: number
  total: number
  savings: number
  payment: PaymentOption
  orderId: string
  clearCart: () => void
  onClose: () => void
}) {
  useEffect(() => { clearCart() }, []) // eslint-disable-line

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 text-center">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
      >
        <CheckCircle className="w-9 h-9 text-green-500" />
      </motion.div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">Order Placed!</h3>
      <p className="text-xs text-slate-500 mb-1">Swift Checkout complete</p>
      <p className="text-[10px] font-mono text-slate-400 mb-5">{orderId}</p>

      <div className="bg-slate-50 rounded-xl p-4 text-left mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{itemCount} item{itemCount !== 1 ? 's' : ''} added</span>
          <span className="font-bold text-slate-900">${total.toFixed(2)}</span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-xs font-semibold text-green-700">
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> You saved</span>
            <span>${savings.toFixed(2)}</span>
          </div>
        )}
        <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">Charged to {payment.label}</p>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors"
      >
        Done
      </button>
    </motion.div>
  )
}
