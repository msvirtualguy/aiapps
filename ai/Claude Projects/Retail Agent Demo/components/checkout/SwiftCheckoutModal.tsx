'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Zap, CreditCard, Smartphone, DollarSign, ChevronRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import type { UserPersona } from '@/lib/types'
import Image from 'next/image'

type Phase = 'scanning' | 'select-payment' | 'processing' | 'confirmed'

type PaymentOption = {
  id: string
  type: 'apple-pay' | 'venmo' | 'credit-card' | 'debit-card'
  label: string
  handle?: string
  last4?: string
}

interface Props {
  persona: UserPersona | null
  onClose: () => void
}

function buildPaymentOptions(persona: UserPersona | null): PaymentOption[] {
  const options: PaymentOption[] = []

  // Always include the persona's preferred method first
  if (persona?.paymentDetails) {
    const pd = persona.paymentDetails
    options.push({
      id: 'primary',
      type: pd.type,
      label: pd.label,
      handle: pd.handle,
      last4: pd.last4,
    })
  }

  // Add a couple of fallback options if not already present
  const types = options.map(o => o.type)
  if (!types.includes('apple-pay')) {
    options.push({ id: 'apple', type: 'apple-pay', label: 'Apple Pay' })
  }
  if (!types.includes('credit-card')) {
    options.push({ id: 'card', type: 'credit-card', label: 'Credit Card on file' })
  }
  if (!types.includes('venmo') && options.length < 3) {
    options.push({ id: 'venmo', type: 'venmo', label: 'Venmo' })
  }

  return options.slice(0, 3)
}

function PaymentIcon({ type }: { type: string }) {
  if (type === 'apple-pay') return <Smartphone className="w-4 h-4" />
  if (type === 'venmo') return <DollarSign className="w-4 h-4" />
  return <CreditCard className="w-4 h-4" />
}

function paymentBg(type: string) {
  if (type === 'apple-pay') return 'bg-black text-white border-black'
  if (type === 'venmo') return 'bg-[#008CFF] text-white border-[#008CFF]'
  return 'bg-slate-800 text-white border-slate-800'
}

export function SwiftCheckoutModal({ persona, onClose }: Props) {
  const { items, subtotal, clearCart } = useCart()
  const [phase, setPhase] = useState<Phase>('scanning')
  const [scanProgress, setScanProgress] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null)

  const paymentOptions = buildPaymentOptions(persona)

  // Default to persona's preferred method
  useEffect(() => {
    if (paymentOptions.length > 0) setSelectedPayment(paymentOptions[0])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 1: Scan progress (2.8s)
  useEffect(() => {
    const interval = setInterval(() => setScanProgress(p => Math.min(p + 3, 100)), 80)
    const timer = setTimeout(() => setPhase('select-payment'), 2800)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [])

  // Phase 3: Processing (2.5s then confirm)
  useEffect(() => {
    if (phase !== 'processing') return
    const timer = setTimeout(() => setPhase('confirmed'), 2500)
    return () => clearTimeout(timer)
  }, [phase])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-900 text-sm">Swift Checkout</span>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">· in-store cam</span>
          </div>
          {phase === 'confirmed' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* PHASE 1: Camera scan of cart items */}
          {phase === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              {/* Simulated camera view with cart item photos */}
              <div className="relative bg-slate-900 rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                {/* Product image mosaic */}
                <div className={`absolute inset-0 grid gap-0.5 p-1 ${
                  items.length <= 2 ? 'grid-cols-2' :
                  items.length <= 4 ? 'grid-cols-2' :
                  'grid-cols-3'
                }`}>
                  {items.slice(0, 6).map(item => (
                    <div key={item.product.id} className="relative overflow-hidden rounded-sm bg-slate-800">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover opacity-70"
                        sizes="120px"
                      />
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="col-span-3 flex items-center justify-center h-full">
                      <p className="text-slate-500 text-xs font-mono">NO ITEMS DETECTED</p>
                    </div>
                  )}
                </div>

                {/* Camera overlay effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

                {/* Corner brackets */}
                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-green-400" />

                {/* Scan line */}
                <motion.div
                  className="absolute left-1 right-1 h-0.5 bg-green-400 pointer-events-none"
                  style={{ boxShadow: '0 0 10px 3px rgba(74,222,128,0.7)' }}
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* HUD overlays */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-[9px] font-mono text-white/70 tracking-widest">REC</span>
                </div>
                <div className="absolute bottom-2 left-2 text-[9px] font-mono text-green-300/80">
                  {new Date().toLocaleTimeString()} · CHECKOUT LANE 3
                </div>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-white/50">
                  {items.length} ITEM{items.length !== 1 ? 'S' : ''}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Analyzing cart contents…</span>
                  <span className="font-mono">{Math.round(scanProgress)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* PHASE 2: Cart summary + payment selection */}
          {phase === 'select-payment' && (
            <motion.div key="select" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
              {/* Detected items */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                {items.length} item{items.length !== 1 ? 's' : ''} detected
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto mb-4">
                {items.map((item, i) => (
                  <div key={item.product.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-xs font-medium text-slate-800 truncate max-w-[190px]">{item.product.name}</p>
                      {item.quantity > 1 && <span className="text-[10px] text-slate-400">×{item.quantity}</span>}
                    </div>
                    <span className="text-xs font-bold text-slate-700 shrink-0 ml-2">
                      ${((item.product.salePrice ?? item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-2 border-t border-b border-slate-100 mb-4">
                <span className="text-sm font-bold text-slate-600">Total</span>
                <span className="text-xl font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>

              {/* Payment method selection */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Select payment</p>
              <div className="space-y-2 mb-4">
                {paymentOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPayment(opt)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedPayment?.id === opt.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                        opt.type === 'apple-pay' ? 'bg-black' :
                        opt.type === 'venmo' ? 'bg-[#008CFF]' :
                        'bg-slate-700'
                      }`}>
                        <PaymentIcon type={opt.type} />
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment?.id === opt.id ? 'border-brand-500' : 'border-slate-300'
                    }`}>
                      {selectedPayment?.id === opt.id && (
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPhase('processing')}
                disabled={!selectedPayment}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors disabled:opacity-40"
              >
                <Zap className="w-4 h-4" />
                Confirm & Pay
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* PHASE 3: Payment processing */}
          {phase === 'processing' && selectedPayment && (
            <motion.div key="processing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-slate-700">${subtotal.toFixed(2)}</p>
                <p className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
              </div>
              <ProcessingPanel payment={selectedPayment} />
            </motion.div>
          )}

          {/* PHASE 4: Confirmed */}
          {phase === 'confirmed' && selectedPayment && (
            <ConfirmedView
              key="confirmed"
              itemCount={items.length}
              subtotal={subtotal}
              payment={selectedPayment}
              onClose={onClose}
              clearCart={clearCart}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function ProcessingPanel({ payment }: { payment: PaymentOption }) {
  const spinner = (
    <motion.div
      className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white mx-auto"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    />
  )

  const base = `rounded-xl p-5 text-white text-center ${paymentBg(payment.type)}`

  return (
    <div className={base}>
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

function ConfirmedView({ itemCount, subtotal, payment, onClose, clearCart }: {
  itemCount: number
  subtotal: number
  payment: PaymentOption
  onClose: () => void
  clearCart: () => void
}) {
  useEffect(() => {
    clearCart()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const orderId = `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
      >
        <CheckCircle className="w-9 h-9 text-green-500" />
      </motion.div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">Order Placed!</h3>
      <p className="text-xs text-slate-500 mb-1">Swift Checkout complete</p>
      <p className="text-[10px] font-mono text-slate-400 mb-5">{orderId}</p>
      <div className="bg-slate-50 rounded-xl p-3 text-left mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">Charged to {payment.label}</p>
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
