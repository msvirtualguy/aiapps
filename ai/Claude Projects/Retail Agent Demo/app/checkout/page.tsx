'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { usePersona } from '@/context/PersonaContext'
import { NeonButton } from '@/components/ui/NeonButton'
import { SHIPPING_OPTIONS } from '@/lib/types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Truck, CreditCard, Smartphone, Zap, ShoppingBag } from 'lucide-react'
import { clsx } from 'clsx'

const PAYMENT_METHODS = [
  { id: 'card',              label: 'Credit Card',        icon: CreditCard },
  { id: 'apple-pay',         label: 'Apple Pay',          icon: Smartphone },
  { id: 'google-pay',        label: 'Google Pay',         icon: Smartphone },
  { id: 'buy-now-pay-later', label: 'Buy Now, Pay Later', icon: Zap },
] as const

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const { persona } = usePersona()
  const [shipping, setShipping] = useState<'standard' | 'express' | 'overnight'>(
    persona?.shippingPreference ?? 'standard'
  )
  const [payment, setPayment] = useState<string>(persona?.preferredPayment ?? 'card')
  const [ordered, setOrdered] = useState(false)
  const [loading, setLoading] = useState(false)
  const selectedShipping = SHIPPING_OPTIONS.find(o => o.id === shipping)!
  const total = subtotal + selectedShipping.price

  const handleOrder = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
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
            <p className="text-slate-500 mt-2 text-sm">
              Expected: <span className="font-semibold text-slate-700">{selectedShipping.eta}</span>
            </p>
          </div>
          <div className="card p-4 text-left space-y-2">
            {[['Total', '$' + total.toFixed(2)], ['Shipping', selectedShipping.label], ['Payment', payment.replace('-', ' ')]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500">{k}</span>
                <span className="font-semibold text-slate-800 capitalize">{v}</span>
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
        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center ml-2">
          <Zap className="w-3 h-3 text-white" />
        </div>
        <span className="font-bold text-slate-900 text-sm">Checkout</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

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

        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Shipping
            {persona && <span className="ml-auto text-xs font-semibold text-indigo-500 normal-case">AI pre-selected</span>}
          </h2>
          <div className="space-y-2">
            {SHIPPING_OPTIONS.map(option => (
              <label key={option.id}
                className={clsx('flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all',
                  shipping === option.id ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-100' : 'border-slate-200 hover:border-slate-300 bg-white')}>
                <div className="flex items-center gap-3">
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    shipping === option.id ? 'border-indigo-600' : 'border-slate-300')}>
                    {shipping === option.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
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

        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Payment
            {persona && <span className="ml-auto text-xs font-semibold text-indigo-500 normal-case">AI pre-selected</span>}
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayment(id)}
                className={clsx('flex items-center gap-2.5 p-3 rounded-xl border transition-all',
                  payment === id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300')}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
          {payment === 'card' && (
            <div className="space-y-2">
              <input type="text" placeholder="Card number" className="input font-mono" defaultValue="4242 4242 4242 4242" />
              <div className="flex gap-2">
                <input type="text" placeholder="MM/YY" className="input font-mono flex-1" defaultValue="12/27" />
                <input type="text" placeholder="CVV" className="input font-mono w-20" defaultValue="123" />
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 border-indigo-200 ring-1 ring-indigo-100">
          <div className="space-y-2 mb-5">
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
          <NeonButton variant="green" size="lg" className="w-full" onClick={handleOrder} loading={loading}>
            {loading ? 'Processing...' : 'Place Order'}
          </NeonButton>
        </div>

      </div>
    </div>
  )
}
