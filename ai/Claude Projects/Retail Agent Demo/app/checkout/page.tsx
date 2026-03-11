'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { usePersona } from '@/context/PersonaContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { SHIPPING_OPTIONS } from '@/lib/types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, Truck, CreditCard, Smartphone, Zap
} from 'lucide-react'
import { clsx } from 'clsx'

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit Card', icon: CreditCard },
  { id: 'apple-pay', label: 'Apple Pay', icon: Smartphone },
  { id: 'google-pay', label: 'Google Pay', icon: Smartphone },
  { id: 'buy-now-pay-later', label: 'Buy Now Pay Later', icon: Zap },
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
    await new Promise(r => setTimeout(r, 1200)) // simulate processing
    setOrdered(true)
    clearCart()
    setLoading(false)
  }

  if (ordered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-neon-green/20 border-2 border-neon-green mx-auto flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-neon-green" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold text-white">Order Confirmed! 🎉</h1>
            <p className="text-white/50 mt-2 text-sm">
              Your order is on its way. Expected delivery: <span className="text-neon-green">{selectedShipping.eta}</span>
            </p>
          </div>

          <GlassCard neon="green" className="text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Order Total</span>
              <span className="font-mono font-bold text-neon-green">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Shipping</span>
              <span className="font-mono text-white">{selectedShipping.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Payment</span>
              <span className="font-mono text-white capitalize">{payment.replace('-', ' ')}</span>
            </div>
          </GlassCard>

          <NeonButton variant="green" size="lg" onClick={() => router.push('/')}>
            SHOP AGAIN →
          </NeonButton>
        </motion.div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/40 font-mono">Your cart is empty</p>
          <NeonButton variant="blue" onClick={() => router.push('/shop')}>
            ← BACK TO SHOP
          </NeonButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/shop')}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> BACK
          </button>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-neon-green" />
            <span className="font-mono text-neon-green font-bold text-sm tracking-widest">CHECKOUT</span>
          </div>
        </div>

        {/* Cart summary */}
        <GlassCard>
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-widest mb-4">Your Items</h2>
          <div className="space-y-3">
            {items.map(item => {
              const price = item.product.salePrice ?? item.product.price
              return (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-white/40 font-mono">qty {item.quantity}</p>
                  </div>
                  <span className="font-mono text-sm text-neon-green shrink-0">
                    ${(price * item.quantity).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Shipping */}
        <GlassCard>
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Shipping
            {persona && (
              <span className="ml-auto text-[10px] font-mono text-neon-green/60">AI pre-selected</span>
            )}
          </h2>
          <div className="space-y-2">
            {SHIPPING_OPTIONS.map(option => (
              <label
                key={option.id}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                  shipping === option.id
                    ? 'border-neon-green/40 bg-neon-green/5'
                    : 'border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    shipping === option.id ? 'border-neon-green' : 'border-white/30'
                  )}>
                    {shipping === option.id && (
                      <div className="w-2 h-2 rounded-full bg-neon-green" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{option.label}</p>
                    <p className="text-xs text-white/40 font-mono">{option.eta}</p>
                  </div>
                </div>
                <span className="font-mono text-sm text-white">
                  {option.price === 0 ? 'FREE' : `$${option.price.toFixed(2)}`}
                </span>
                <input
                  type="radio"
                  name="shipping"
                  value={option.id}
                  checked={shipping === option.id}
                  onChange={() => setShipping(option.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </GlassCard>

        {/* Payment */}
        <GlassCard>
          <h2 className="text-sm font-mono text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Payment
            {persona && (
              <span className="ml-auto text-[10px] font-mono text-neon-blue/60">AI pre-selected</span>
            )}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPayment(id)}
                className={clsx(
                  'flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left',
                  payment === id
                    ? 'border-neon-blue/40 bg-neon-blue/5 text-white'
                    : 'border-white/10 text-white/50 hover:border-white/20'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          {payment === 'card' && (
            <div className="mt-4 space-y-2">
              <input
                type="text"
                placeholder="Card number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-neon-blue/30 font-mono"
                defaultValue="4242 4242 4242 4242"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-neon-blue/30 font-mono"
                  defaultValue="12/27"
                />
                <input
                  type="text"
                  placeholder="CVV"
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-neon-blue/30 font-mono"
                  defaultValue="123"
                />
              </div>
            </div>
          )}
        </GlassCard>

        {/* Order total + CTA */}
        <GlassCard neon="green">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Subtotal</span>
              <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Shipping</span>
              <span className="font-mono text-white">
                {selectedShipping.price === 0 ? 'FREE' : `$${selectedShipping.price.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="font-semibold text-white">Total</span>
              <span className="font-mono font-bold text-xl text-neon-green">${total.toFixed(2)}</span>
            </div>
          </div>

          <NeonButton
            variant="green"
            size="lg"
            className="w-full"
            onClick={handleOrder}
            loading={loading}
          >
            {loading ? 'PROCESSING...' : 'PLACE ORDER →'}
          </NeonButton>
        </GlassCard>
      </div>
    </div>
  )
}
