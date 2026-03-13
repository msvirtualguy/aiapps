'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { usePersona } from '@/context/PersonaContext'
import { NeonButton } from '@/components/ui/NeonButton'
import { SHIPPING_OPTIONS } from '@/lib/types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, Truck, CreditCard, Smartphone, ShoppingBag,
  Shield, Lock, Wallet, MapPin, Store, Clock, ChevronRight, Search
} from 'lucide-react'
import { clsx } from 'clsx'

type PaymentType = 'credit-card' | 'debit-card' | 'apple-pay' | 'venmo'
type FulfillmentType = 'delivery' | 'pickup' | 'uber-eats' | 'doordash' | 'in-store'

const MOCK_STORES = [
  { id: 's1', name: 'FreshCart – Downtown',  address: '142 Main St',         distance: '0.8 mi', hours: 'Open until 10 PM', ready: '15–30 min' },
  { id: 's2', name: 'FreshCart – Midtown',   address: '780 Park Ave',        distance: '2.1 mi', hours: 'Open until 9 PM',  ready: '20–35 min' },
  { id: 's3', name: 'FreshCart – Westside',  address: '2230 Commerce Blvd',  distance: '3.4 mi', hours: 'Open until 11 PM', ready: '30–45 min' },
]

function UberEatsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8c1.988 0 3.6 1.612 3.6 3.6S13.988 12 12 12s-3.6-1.612-3.6-3.6S10.012 4.8 12 4.8zm0 14.4c-3 0-5.64-1.524-7.2-3.84.036-2.388 4.8-3.696 7.2-3.696 2.388 0 7.164 1.308 7.2 3.696C17.64 17.676 15 19.2 12 19.2z"/>
    </svg>
  )
}

function DoorDashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.217 0C6.425 0 1.56 4.39.803 10.125H6.5c.68-2.56 3.01-4.44 5.717-4.44 3.317 0 6 2.683 6 6s-2.683 6-6 6c-2.707 0-5.037-1.88-5.717-4.44H.803C1.56 19.61 6.425 24 12.217 24 18.465 24 23.5 18.965 23.5 12.717v-.434C23.5 5.035 18.465 0 12.217 0z"/>
    </svg>
  )
}

const PAYMENT_METHODS: Array<{ id: PaymentType; label: string; icon: React.ElementType; color: string }> = [
  { id: 'credit-card',  label: 'Credit Card',  icon: CreditCard,  color: 'text-blue-600'   },
  { id: 'debit-card',   label: 'Debit Card',   icon: CreditCard,  color: 'text-slate-600'  },
  { id: 'apple-pay',    label: 'Apple Pay',    icon: Smartphone,  color: 'text-slate-900'  },
  { id: 'venmo',        label: 'Venmo',        icon: Wallet,      color: 'text-blue-500'   },
]

function ApplePayPanel({ onPay, loading }: { onPay: () => void; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          <span className="text-xl font-bold tracking-tight">Pay</span>
        </div>
        <div className="w-full h-px bg-white/20" />
        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Paying with</p>
          <p className="font-semibold text-sm">Apple Card</p>
        </div>
        {loading ? (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center"
          >
            <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </motion.div>
        ) : (
          <button
            onClick={onPay}
            className="w-full py-3 rounded-2xl bg-white text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            <Lock className="w-4 h-4" />
            Double-click to Pay
          </button>
        )}
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <Shield className="w-3.5 h-3.5" />
          Secured with Face ID
        </div>
      </div>
    </div>
  )
}

function VenmoPanel({ handle, onPay, loading }: { handle: string; onPay: () => void; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[#008CFF] text-white">
        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white"><path d="M19.03 2c.68 1.12 1 2.4 1 3.87 0 4.77-4.08 10.97-7.39 15.34H6.29L3.93 4.29l5.58-.54 1.33 10.54c1.24-2.08 2.78-5.33 2.78-7.56 0-1.22-.21-2.04-.54-2.73L19.03 2z"/></svg>
        <div className="text-center">
          <p className="text-white/70 text-xs mb-1">Sending to</p>
          <p className="font-bold text-lg">{handle}</p>
        </div>
        {loading ? (
          <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <button
            onClick={onPay}
            className="w-full py-3 rounded-2xl bg-white text-[#008CFF] font-bold text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            Pay with Venmo
          </button>
        )}
        <div className="flex items-center gap-1.5 text-white/60 text-xs">
          <Shield className="w-3.5 h-3.5" />
          Protected by Venmo
        </div>
      </div>
    </div>
  )
}

function CardPanel({ last4, network, onPay, loading }: { last4?: string; network?: string; onPay: () => void; loading: boolean }) {
  return (
    <div className="space-y-3">
      {/* Card preview */}
      <div className="relative h-36 rounded-2xl overflow-hidden p-5"
        style={{ background: 'linear-gradient(135deg, #1e3166 0%, #2563eb 100%)' }}>
        <div className="absolute inset-0 opacity-20">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white/30"
              style={{ width: 120 + i * 80, height: 120 + i * 80, top: -30 - i * 30, right: -40 - i * 20 }} />
          ))}
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="w-8 h-6 rounded bg-amber-300/80" />
            </div>
            {network && <span className="text-white/80 text-xs font-bold uppercase tracking-widest">{network}</span>}
          </div>
          <div>
            <p className="text-white/60 text-[10px] tracking-widest mb-1">CARD NUMBER</p>
            <p className="text-white font-mono text-sm tracking-widest">
              •••• •••• •••• {last4 || '4242'}
            </p>
          </div>
        </div>
      </div>

      {/* Form fields (pre-filled for demo) */}
      <input type="text" readOnly className="input font-mono bg-slate-50"
        value={`•••• •••• •••• ${last4 || '4242'}`} />
      <div className="flex gap-2">
        <input type="text" readOnly className="input font-mono flex-1" value="12/27" />
        <input type="text" readOnly className="input font-mono w-20" value="•••" />
      </div>

      <button
        onClick={onPay}
        disabled={loading}
        className={clsx(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
          loading
            ? 'bg-brand-300 text-white cursor-not-allowed'
            : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
        )}
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</>
        ) : (
          <><Lock className="w-4 h-4" /> Pay Now</>
        )}
      </button>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const { persona } = usePersona()
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery')
  const [zip, setZip] = useState('')
  const [zipSubmitted, setZipSubmitted] = useState(false)
  const [selectedStore, setSelectedStore] = useState<string>(MOCK_STORES[0].id)
  const [shipping, setShipping] = useState<'standard' | 'express' | 'overnight'>(
    persona?.shippingPreference ?? 'standard'
  )
  const [payment, setPayment] = useState<PaymentType>(
    (persona?.preferredPayment as PaymentType) ?? 'credit-card'
  )
  const [ordered, setOrdered] = useState(false)
  const [loading, setLoading] = useState(false)
  const selectedShipping = SHIPPING_OPTIONS.find(o => o.id === shipping)!

  const deliveryFee = fulfillment === 'uber-eats' ? 3.99 : fulfillment === 'doordash' ? 4.99 : fulfillment === 'delivery' ? selectedShipping.price : 0
  const total = subtotal + deliveryFee

  const fulfillmentLabel = fulfillment === 'in-store' ? 'In-Store'
    : fulfillment === 'pickup' ? `Pickup – ${MOCK_STORES.find(s => s.id === selectedStore)?.name}`
    : fulfillment === 'uber-eats' ? 'Uber Eats Delivery'
    : fulfillment === 'doordash' ? 'DoorDash Delivery'
    : selectedShipping.label

  const handleOrder = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setOrdered(true)
    clearCart()
    setLoading(false)
  }

  if (ordered) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
            className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Order Confirmed! 🎉</h1>
            {persona && <p className="text-slate-500 mt-1 text-sm">Thanks, {persona.name.split(' ')[0]}!</p>}
            <p className="text-slate-500 mt-2 text-sm">
              Fulfillment: <span className="font-semibold text-slate-700">{fulfillmentLabel}</span>
            </p>
          </div>
          <div className="card p-4 text-left space-y-2">
            {[
              ['Total', '$' + total.toFixed(2)],
              ['Fulfillment', fulfillmentLabel],
              ['Payment', persona?.paymentDetails.label ?? payment],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500">{k}</span>
                <span className="font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <NeonButton variant="green" size="lg" onClick={() => router.push('/')} className="w-full">
            Shop Again
          </NeonButton>
        </motion.div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500">Your cart is empty</p>
          <NeonButton variant="blue" onClick={() => router.push('/shop')}>Back to Shop</NeonButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/shop')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Image
          src="https://www.cswg.com/wp-content/uploads/2026/01/CS_Wholesale_Grocers_logo.svg"
          alt="C&S Wholesale Grocers"
          width={110}
          height={28}
          className="h-7 w-auto ml-2"
        />
        <span className="font-bold text-slate-900 text-sm">Checkout</span>
        {persona && (
          <span className="ml-auto text-xs text-slate-400">{persona.name}</span>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        {/* Items */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Your Items</h2>
          <div className="space-y-3">
            {items.map(item => {
              const price = item.product.salePrice ?? item.product.price
              return (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-slate-400">Qty {item.quantity}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-900 shrink-0">{'$' + (price * item.quantity).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fulfillment */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4" /> How would you like your order?
          </h2>

          {/* Option grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* In-Store */}
            <button onClick={() => setFulfillment('in-store')}
              className={clsx('flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center',
                fulfillment === 'in-store' ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-100' : 'border-slate-200 hover:border-slate-300 bg-white')}>
              <Store className={clsx('w-5 h-5', fulfillment === 'in-store' ? 'text-brand-600' : 'text-slate-400')} />
              <div>
                <p className="text-xs font-bold text-slate-800">In-Store</p>
                <p className="text-[10px] text-slate-400 mt-0.5">You&apos;re here now</p>
              </div>
              {fulfillment === 'in-store' && <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
            </button>

            {/* Pickup */}
            <button onClick={() => setFulfillment('pickup')}
              className={clsx('flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center',
                fulfillment === 'pickup' ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-100' : 'border-slate-200 hover:border-slate-300 bg-white')}>
              <MapPin className={clsx('w-5 h-5', fulfillment === 'pickup' ? 'text-brand-600' : 'text-slate-400')} />
              <div>
                <p className="text-xs font-bold text-slate-800">Pickup</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Find nearest store</p>
              </div>
              {fulfillment === 'pickup' && <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
            </button>

            {/* Uber Eats */}
            <button onClick={() => setFulfillment('uber-eats')}
              className={clsx('flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center',
                fulfillment === 'uber-eats' ? 'border-[#06C167] bg-[#06C167]/5 ring-1 ring-[#06C167]/20' : 'border-slate-200 hover:border-slate-300 bg-white')}>
              <UberEatsIcon className={clsx('w-5 h-5', fulfillment === 'uber-eats' ? 'text-[#06C167]' : 'text-slate-400')} />
              <div>
                <p className="text-xs font-bold text-slate-800">Uber Eats</p>
                <p className="text-[10px] text-slate-400 mt-0.5">$3.99 · ~30–45 min</p>
              </div>
              {fulfillment === 'uber-eats' && <div className="w-1.5 h-1.5 rounded-full bg-[#06C167]" />}
            </button>

            {/* DoorDash */}
            <button onClick={() => setFulfillment('doordash')}
              className={clsx('flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center',
                fulfillment === 'doordash' ? 'border-[#FF3008] bg-[#FF3008]/5 ring-1 ring-[#FF3008]/20' : 'border-slate-200 hover:border-slate-300 bg-white')}>
              <DoorDashIcon className={clsx('w-5 h-5', fulfillment === 'doordash' ? 'text-[#FF3008]' : 'text-slate-400')} />
              <div>
                <p className="text-xs font-bold text-slate-800">DoorDash</p>
                <p className="text-[10px] text-slate-400 mt-0.5">$4.99 · ~25–40 min</p>
              </div>
              {fulfillment === 'doordash' && <div className="w-1.5 h-1.5 rounded-full bg-[#FF3008]" />}
            </button>

            {/* Standard Delivery (full width) */}
            <button onClick={() => setFulfillment('delivery')}
              className={clsx('col-span-2 flex items-center justify-between gap-2 p-3.5 rounded-xl border transition-all',
                fulfillment === 'delivery' ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-100' : 'border-slate-200 hover:border-slate-300 bg-white')}>
              <div className="flex items-center gap-3">
                <Truck className={clsx('w-5 h-5', fulfillment === 'delivery' ? 'text-brand-600' : 'text-slate-400')} />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Standard Delivery</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Choose shipping speed below</p>
                </div>
              </div>
              {fulfillment === 'delivery' && <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
            </button>
          </div>

          {/* Pickup: zip + store list */}
          {fulfillment === 'pickup' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text" placeholder="Enter your zip code"
                    value={zip} onChange={e => { setZip(e.target.value); setZipSubmitted(false) }}
                    onKeyDown={e => e.key === 'Enter' && zip.length >= 5 && setZipSubmitted(true)}
                    maxLength={10}
                    className="input pl-8 text-sm"
                  />
                </div>
                <button
                  onClick={() => zip.length >= 5 && setZipSubmitted(true)}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors">
                  Find
                </button>
              </div>
              {(zipSubmitted || zip.length >= 5) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    3 stores near {zip || 'you'}
                  </p>
                  {MOCK_STORES.map(store => (
                    <label key={store.id}
                      className={clsx('flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        selectedStore === store.id ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-100' : 'border-slate-200 hover:border-slate-300 bg-white')}>
                      <div className={clsx('w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center',
                        selectedStore === store.id ? 'border-brand-600' : 'border-slate-300')}>
                        {selectedStore === store.id && <div className="w-2 h-2 rounded-full bg-brand-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{store.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{store.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="w-2.5 h-2.5" />{store.distance}</span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="w-2.5 h-2.5" />{store.hours}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 shrink-0">Ready {store.ready}</span>
                      <input type="radio" name="store" value={store.id}
                        checked={selectedStore === store.id} onChange={() => setSelectedStore(store.id)} className="sr-only" />
                    </label>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* In-store notice */}
          {fulfillment === 'in-store' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 mt-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800">You&apos;re shopping in-store</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Your digital cart will be ready at the register</p>
              </div>
            </motion.div>
          )}

          {/* Uber Eats notice */}
          {fulfillment === 'uber-eats' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#06C167]/5 border border-[#06C167]/20 mt-2">
              <UberEatsIcon className="w-6 h-6 text-[#06C167] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Uber Eats delivery</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Estimated 30–45 min · $3.99 delivery fee</p>
              </div>
            </motion.div>
          )}

          {/* DoorDash notice */}
          {fulfillment === 'doordash' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FF3008]/5 border border-[#FF3008]/20 mt-2">
              <DoorDashIcon className="w-6 h-6 text-[#FF3008] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">DoorDash delivery</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Estimated 25–40 min · $4.99 delivery fee</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Shipping speed (only for standard delivery) */}
        {fulfillment === 'delivery' && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Shipping Speed
            {persona && <span className="ml-auto text-xs font-semibold text-brand-500 normal-case">AI pre-selected</span>}
          </h2>
          <div className="space-y-2">
            {SHIPPING_OPTIONS.map(option => (
              <label key={option.id}
                className={clsx('flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all',
                  shipping === option.id ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-100' : 'border-slate-200 hover:border-slate-300 bg-white')}>
                <div className="flex items-center gap-3">
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    shipping === option.id ? 'border-brand-600' : 'border-slate-300')}>
                    {shipping === option.id && <div className="w-2 h-2 rounded-full bg-brand-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{option.label}</p>
                    <p className="text-xs text-slate-400">{option.eta}</p>
                  </div>
                </div>
                <span className="font-bold text-sm">
                  {option.price === 0 ? <span className="text-emerald-600">Free</span> : '$' + option.price.toFixed(2)}
                </span>
                <input type="radio" name="shipping" value={option.id}
                  checked={shipping === option.id} onChange={() => setShipping(option.id)} className="sr-only" />
              </label>
            ))}
          </div>
        </div>
        )}

        {/* Payment */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Payment
            {persona && <span className="ml-auto text-xs font-semibold text-brand-500 normal-case">AI pre-selected</span>}
          </h2>

          {/* Payment method tabs */}
          <div className="grid grid-cols-4 gap-1.5 mb-5 p-1 bg-slate-100 rounded-xl">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayment(id)}
                className={clsx(
                  'flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all',
                  payment === id
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                )}>
                <Icon className={clsx('w-4 h-4', payment === id ? PAYMENT_METHODS.find(m => m.id === id)?.color : 'text-slate-400')} />
                <span className="leading-tight text-center">{label.replace(' ', '\n')}</span>
              </button>
            ))}
          </div>

          {/* Payment-specific UI */}
          {payment === 'apple-pay' && (
            <ApplePayPanel onPay={handleOrder} loading={loading} />
          )}
          {payment === 'venmo' && (
            <VenmoPanel
              handle={persona?.paymentDetails?.handle ?? '@you'}
              onPay={handleOrder}
              loading={loading}
            />
          )}
          {(payment === 'credit-card' || payment === 'debit-card') && (
            <CardPanel
              last4={persona?.paymentDetails?.last4}
              network={persona?.paymentDetails?.network}
              onPay={handleOrder}
              loading={loading}
            />
          )}
        </div>

        {/* Order summary */}
        <div className={clsx('card p-5', (payment === 'apple-pay' || payment === 'venmo') ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-200')}>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800">{'$' + subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                {fulfillment === 'in-store' ? 'Fulfillment'
                  : fulfillment === 'pickup' ? 'Pickup'
                  : fulfillment === 'uber-eats' ? 'Uber Eats fee'
                  : fulfillment === 'doordash' ? 'DoorDash fee'
                  : 'Shipping'}
              </span>
              <span className="font-medium">
                {deliveryFee === 0
                  ? <span className="text-emerald-600">{fulfillment === 'in-store' ? 'In-Store' : 'Free'}</span>
                  : '$' + deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-2xl font-extrabold text-slate-900">{'$' + total.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
