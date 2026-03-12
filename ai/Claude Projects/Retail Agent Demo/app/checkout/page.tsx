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
  Shield, Lock, Wallet
} from 'lucide-react'
import { clsx } from 'clsx'

type PaymentType = 'credit-card' | 'debit-card' | 'apple-pay' | 'venmo'

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
  const [shipping, setShipping] = useState<'standard' | 'express' | 'overnight'>(
    persona?.shippingPreference ?? 'standard'
  )
  const [payment, setPayment] = useState<PaymentType>(
    (persona?.preferredPayment as PaymentType) ?? 'credit-card'
  )
  const [ordered, setOrdered] = useState(false)
  const [loading, setLoading] = useState(false)
  const selectedShipping = SHIPPING_OPTIONS.find(o => o.id === shipping)!
  const total = subtotal + selectedShipping.price

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
              Expected: <span className="font-semibold text-slate-700">{selectedShipping.eta}</span>
            </p>
          </div>
          <div className="card p-4 text-left space-y-2">
            {[
              ['Total', '$' + total.toFixed(2)],
              ['Shipping', selectedShipping.label],
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

        {/* Shipping */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Shipping
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

        {/* Order summary (only shown for non-card types since card has its own Pay button) */}
        {(payment === 'apple-pay' || payment === 'venmo') && (
          <div className="card p-5 border-brand-200 ring-1 ring-brand-100">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{'$' + subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium">
                  {selectedShipping.price === 0 ? <span className="text-emerald-600">Free</span> : '$' + selectedShipping.price.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-2xl font-extrabold text-slate-900">{'$' + total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {(payment === 'credit-card' || payment === 'debit-card') && (
          <div className="card p-5 border-slate-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{'$' + subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium">
                  {selectedShipping.price === 0 ? <span className="text-emerald-600">Free</span> : '$' + selectedShipping.price.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-2xl font-extrabold text-slate-900">{'$' + total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
