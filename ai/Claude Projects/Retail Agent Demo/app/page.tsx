'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { WebcamCapture } from '@/components/camera/WebcamCapture'
import { usePersona } from '@/context/PersonaContext'
import type { UserPersona } from '@/lib/types'
import { Zap, ShoppingBag, Bot, Shield, Camera, Users, ScanFace } from 'lucide-react'
import { clsx } from 'clsx'
import Image from 'next/image'

const FEATURES = [
  { icon: Bot, label: 'AI Grocery Assistant', desc: 'Ask about anything in the store' },
  { icon: Zap, label: 'Personalized Deals', desc: 'Savings tailored to your household' },
  { icon: ShoppingBag, label: 'Smart Checkout', desc: 'AI-pre-filled preferences & payment' },
]

const DEMO_PERSONAS: Array<{
  imageUrl: string
  label: string
  sublabel: string
  persona: UserPersona
}> = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Sarah Mitchell',
    sublabel: 'Family shopper · mom of 3',
    persona: {
      name: 'Sarah Mitchell',
      ageGroup: 'Millennial (26-40)',
      style: ['practical', 'value-focused', 'family-oriented'],
      interests: ['cooking', 'meal prep', 'family meals', 'healthy eating', 'saving money'],
      preferredPayment: 'credit-card',
      paymentDetails: {
        type: 'credit-card',
        label: 'Visa ending in 4521',
        last4: '4521',
        network: 'Visa',
      },
      shippingPreference: 'standard',
      personalizedDeals: [
        { title: 'Family Pack Savings', description: 'Buy 2 get 1 free on Dairy & Eggs', discount: 'B2G1', category: 'Dairy & Eggs' },
        { title: 'Fresh Produce Deal', description: '25% off all Produce today', discount: '25% OFF', category: 'Produce' },
      ],
      vibe: 'savvy family meal planner',
      pastOrders: [
        {
          id: 'order-sm-001',
          date: '2026-02-28',
          shipping: 'standard',
          total: 24.25,
          items: [
            { productId: 'dairy-001', productName: 'Organic Whole Milk (1 gallon)', quantity: 1, priceAtOrder: 6.99 },
            { productId: 'dairy-004', productName: 'Free-Range Large Eggs (12-count)', quantity: 1, priceAtOrder: 4.79 },
            { productId: 'bakery-001', productName: 'Artisan Sourdough Boule', quantity: 1, priceAtOrder: 5.49 },
            { productId: 'prod-003', productName: 'Baby Spinach (5 oz)', quantity: 1, priceAtOrder: 3.49 },
            { productId: 'prod-001', productName: 'Organic Strawberries (1 lb)', quantity: 1, priceAtOrder: 3.49 },
          ],
        },
        {
          id: 'order-sm-002',
          date: '2026-02-14',
          shipping: 'standard',
          total: 30.45,
          items: [
            { productId: 'pantry-002', productName: 'Barilla Pasta Variety Pack (3 boxes)', quantity: 1, priceAtOrder: 6.99 },
            { productId: 'pantry-004', productName: "Rao's Homemade Marinara Sauce (24 oz)", quantity: 1, priceAtOrder: 6.99 },
            { productId: 'meat-003', productName: 'Organic Boneless Chicken Breast (per lb)', quantity: 1, priceAtOrder: 8.99 },
            { productId: 'prod-005', productName: 'Roma Tomatoes (per lb)', quantity: 1, priceAtOrder: 2.49 },
            { productId: 'bakery-003', productName: 'Everything Bagels (6-pack)', quantity: 1, priceAtOrder: 4.99 },
          ],
        },
        {
          id: 'order-sm-003',
          date: '2026-01-30',
          shipping: 'standard',
          total: 26.25,
          items: [
            { productId: 'dairy-002', productName: 'Chobani Greek Yogurt Variety Pack (8-count)', quantity: 1, priceAtOrder: 6.99 },
            { productId: 'frozen-003', productName: 'Birds Eye Steamfresh Vegetables (10 oz)', quantity: 2, priceAtOrder: 2.79 },
            { productId: 'pantry-003', productName: 'Quaker Old Fashioned Oats (42 oz)', quantity: 1, priceAtOrder: 5.99 },
            { productId: 'prod-002', productName: 'Hass Avocados (4-pack)', quantity: 1, priceAtOrder: 5.99 },
            { productId: 'bev-001', productName: 'Tropicana Pure Premium Orange Juice (52 oz)', quantity: 1, priceAtOrder: 4.49 },
          ],
        },
      ],
    },
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Jordan Rivera',
    sublabel: 'Health-focused · clean eater',
    persona: {
      name: 'Jordan Rivera',
      ageGroup: 'Young Adult (18-25)',
      style: ['health-conscious', 'organic', 'performance'],
      interests: ['fitness', 'nutrition', 'organic food', 'meal prep', 'wellness'],
      preferredPayment: 'apple-pay',
      paymentDetails: {
        type: 'apple-pay',
        label: 'Apple Pay',
      },
      shippingPreference: 'express',
      personalizedDeals: [
        { title: 'Organic Week', description: '20% off all organic items', discount: '20% OFF', category: 'Produce' },
        { title: 'Protein Boost', description: 'BOGO on Meat & Seafood', discount: 'BOGO', category: 'Meat & Seafood' },
      ],
      vibe: 'clean eating fitness fanatic',
      pastOrders: [
        {
          id: 'order-jr-001',
          date: '2026-03-05',
          shipping: 'express',
          total: 57.94,
          items: [
            { productId: 'meat-002', productName: 'Atlantic Salmon Fillet (per lb)', quantity: 1, priceAtOrder: 9.99 },
            { productId: 'meat-003', productName: 'Organic Boneless Chicken Breast (per lb)', quantity: 1, priceAtOrder: 8.99 },
            { productId: 'prod-001', productName: 'Organic Strawberries (1 lb)', quantity: 1, priceAtOrder: 3.49 },
            { productId: 'prod-003', productName: 'Baby Spinach (5 oz)', quantity: 1, priceAtOrder: 3.49 },
            { productId: 'snack-001', productName: 'RXBAR Protein Bar Variety Pack (12-count)', quantity: 1, priceAtOrder: 22.99 },
            { productId: 'bev-003', productName: 'Bigelow Green Tea Variety Pack (40-count)', quantity: 1, priceAtOrder: 8.99 },
          ],
        },
        {
          id: 'order-jr-002',
          date: '2026-02-20',
          shipping: 'express',
          total: 38.76,
          items: [
            { productId: 'dairy-002', productName: 'Chobani Greek Yogurt Variety Pack (8-count)', quantity: 1, priceAtOrder: 6.99 },
            { productId: 'prod-002', productName: 'Hass Avocados (4-pack)', quantity: 1, priceAtOrder: 5.99 },
            { productId: 'snack-001', productName: 'RXBAR Protein Bar Variety Pack (12-count)', quantity: 1, priceAtOrder: 22.99 },
            { productId: 'frozen-003', productName: 'Birds Eye Steamfresh Vegetables (10 oz)', quantity: 1, priceAtOrder: 2.79 },
          ],
        },
      ],
    },
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Marcus Chen',
    sublabel: 'Party host · entertaining guru',
    persona: {
      name: 'Marcus Chen',
      ageGroup: 'Millennial (26-40)',
      style: ['social', 'entertaining', 'generous'],
      interests: ['entertaining', 'cooking', 'snacks', 'beverages', 'parties'],
      preferredPayment: 'venmo',
      paymentDetails: {
        type: 'venmo',
        label: 'Venmo @marcuschen88',
        handle: '@marcuschen88',
      },
      shippingPreference: 'express',
      personalizedDeals: [
        { title: 'Party Pack', description: 'Buy 2 get 1 free on Snacks', discount: 'B2G1', category: 'Snacks' },
        { title: 'Drinks Deal', description: '15% off all Beverages', discount: '15% OFF', category: 'Beverages' },
      ],
      vibe: 'ultimate party host',
      pastOrders: [
        {
          id: 'order-mc-001',
          date: '2026-03-08',
          shipping: 'express',
          total: 60.44,
          items: [
            { productId: 'bev-002', productName: 'San Pellegrino Sparkling Water (12-pack)', quantity: 1, priceAtOrder: 14.99 },
            { productId: 'snack-001', productName: 'RXBAR Protein Bar Variety Pack (12-count)', quantity: 1, priceAtOrder: 22.99 },
            { productId: 'snack-002', productName: 'Siete Grain-Free Tortilla Chips (5 oz)', quantity: 1, priceAtOrder: 4.99 },
            { productId: 'deli-002', productName: 'Fresh Made Guacamole (8 oz)', quantity: 1, priceAtOrder: 4.49 },
            { productId: 'frozen-002', productName: 'Häagen-Dazs Ice Cream Pint', quantity: 2, priceAtOrder: 6.49 },
          ],
        },
        {
          id: 'order-mc-002',
          date: '2026-02-22',
          shipping: 'express',
          total: 60.40,
          items: [
            { productId: 'bev-001', productName: 'Tropicana Pure Premium Orange Juice (52 oz)', quantity: 2, priceAtOrder: 4.49 },
            { productId: 'bev-002', productName: 'San Pellegrino Sparkling Water (12-pack)', quantity: 1, priceAtOrder: 14.99 },
            { productId: 'snack-002', productName: 'Siete Grain-Free Tortilla Chips (5 oz)', quantity: 2, priceAtOrder: 4.99 },
            { productId: 'deli-001', productName: "Boar's Head Roasted Turkey Breast (per lb)", quantity: 1, priceAtOrder: 11.99 },
            { productId: 'frozen-002', productName: 'Häagen-Dazs Ice Cream Pint', quantity: 3, priceAtOrder: 6.49 },
          ],
        },
      ],
    },
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Dorothy Walsh',
    sublabel: 'Budget-savvy · deal hunter',
    persona: {
      name: 'Dorothy Walsh',
      ageGroup: 'Boomer (55+)',
      style: ['budget-conscious', 'practical', 'value-focused'],
      interests: ['saving money', 'bulk buying', 'coupons', 'meal planning'],
      preferredPayment: 'debit-card',
      paymentDetails: {
        type: 'debit-card',
        label: 'Mastercard Debit ending in 8834',
        last4: '8834',
        network: 'Mastercard',
      },
      shippingPreference: 'standard',
      personalizedDeals: [
        { title: 'Weekly Specials', description: '30% off Pantry & Dry Goods', discount: '30% OFF', category: 'Pantry & Dry Goods' },
        { title: 'Bakery Blowout', description: 'BOGO on all Bakery items', discount: 'BOGO', category: 'Bakery & Bread' },
      ],
      vibe: 'smart savings champion',
      pastOrders: [
        {
          id: 'order-dw-001',
          date: '2026-03-01',
          shipping: 'standard',
          total: 40.94,
          items: [
            { productId: 'pantry-001', productName: 'California Olive Ranch Olive Oil (16.9 oz)', quantity: 1, priceAtOrder: 9.99 },
            { productId: 'pantry-002', productName: 'Barilla Pasta Variety Pack (3 boxes)', quantity: 1, priceAtOrder: 6.99 },
            { productId: 'pantry-003', productName: 'Quaker Old Fashioned Oats (42 oz)', quantity: 2, priceAtOrder: 5.99 },
            { productId: 'bakery-003', productName: 'Everything Bagels (6-pack)', quantity: 1, priceAtOrder: 4.99 },
            { productId: 'dairy-001', productName: 'Organic Whole Milk (1 gallon)', quantity: 1, priceAtOrder: 6.99 },
          ],
        },
        {
          id: 'order-dw-002',
          date: '2026-02-10',
          shipping: 'standard',
          total: 34.54,
          items: [
            { productId: 'frozen-001', productName: "Amy's Organic Burritos (4-pack)", quantity: 1, priceAtOrder: 7.99 },
            { productId: 'frozen-003', productName: 'Birds Eye Steamfresh Vegetables (10 oz)', quantity: 2, priceAtOrder: 2.79 },
            { productId: 'pantry-004', productName: "Rao's Homemade Marinara Sauce (24 oz)", quantity: 1, priceAtOrder: 6.99 },
            { productId: 'prod-004', productName: 'Navel Oranges (3 lb bag)', quantity: 1, priceAtOrder: 4.99 },
            { productId: 'bev-003', productName: 'Bigelow Green Tea Variety Pack (40-count)', quantity: 1, priceAtOrder: 8.99 },
          ],
        },
        {
          id: 'order-dw-003',
          date: '2026-01-15',
          shipping: 'standard',
          total: 29.24,
          items: [
            { productId: 'dairy-003', productName: 'Tillamook Extra Sharp Cheddar (16 oz)', quantity: 1, priceAtOrder: 7.49 },
            { productId: 'dairy-004', productName: 'Free-Range Large Eggs (12-count)', quantity: 1, priceAtOrder: 4.79 },
            { productId: 'prod-005', productName: 'Roma Tomatoes (per lb)', quantity: 2, priceAtOrder: 2.49 },
            { productId: 'bakery-001', productName: 'Artisan Sourdough Boule', quantity: 1, priceAtOrder: 5.49 },
            { productId: 'pantry-002', productName: 'Barilla Pasta Variety Pack (3 boxes)', quantity: 1, priceAtOrder: 6.99 },
          ],
        },
      ],
    },
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const { setPersona } = usePersona()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [tab, setTab] = useState<'scan' | 'demo'>('demo')
  const [scanningIdx, setScanningIdx] = useState<number | null>(null)

  const handleCapture = async (base64: string) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const persona = await response.json() as UserPersona
      setPersona(persona)
    } catch { /* continue without persona */ }
    finally {
      setIsAnalyzing(false)
      router.push('/shop')
    }
  }

  const handleDemoSelect = (idx: number) => {
    if (scanningIdx !== null) return
    setScanningIdx(idx)
    setTimeout(() => {
      setPersona(DEMO_PERSONAS[idx].persona)
      router.push('/shop')
    }, 1800)
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-12">
          <Image
            src="https://www.cswg.com/wp-content/uploads/2026/01/CS_Wholesale_Grocers_logo.svg"
            alt="C&S Wholesale Grocers"
            width={200}
            height={48}
            className="h-10 w-auto"
            priority
          />
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600">
            Powered by Nutanix AI
          </span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="space-y-6">
            <div>
              <h1 className="text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Grocery<br />
                <span className="text-brand-600">shopping,</span><br />
                supercharged.
              </h1>
              <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                Our AI recognizes you, unlocks personalized deals, and helps you find exactly what you need — just by talking.
              </p>
            </div>

            <div className="space-y-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              Camera data is processed locally and never stored
            </div>
          </motion.div>

          {/* Right: card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="card overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setTab('demo')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors',
                  tab === 'demo'
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                    : 'text-slate-400 hover:text-slate-600'
                )}>
                <Users className="w-4 h-4" /> Demo Profiles
              </button>
              <button
                onClick={() => setTab('scan')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors',
                  tab === 'scan'
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                    : 'text-slate-400 hover:text-slate-600'
                )}>
                <Camera className="w-4 h-4" /> Scan Me
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'demo' ? (
                <motion.div key="demo"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="p-6 space-y-4">
                  <p className="text-sm text-slate-500 text-center">
                    Pick a shopper profile to see AI personalization in action
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {DEMO_PERSONAS.map((p, idx) => {
                      const isScanning = scanningIdx === idx
                      const isDisabled = scanningIdx !== null && !isScanning
                      return (
                        <motion.button
                          key={p.label}
                          onClick={() => handleDemoSelect(idx)}
                          whileHover={isDisabled ? {} : { scale: 1.02 }}
                          whileTap={isDisabled ? {} : { scale: 0.97 }}
                          className={clsx(
                            'flex flex-col items-center gap-2.5 p-3 rounded-2xl border-2 transition-all text-center overflow-hidden',
                            isScanning
                              ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-100'
                              : isDisabled
                              ? 'border-slate-100 bg-slate-50 opacity-40'
                              : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm'
                          )}>
                          {/* Headshot with scan overlay */}
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                            <Image
                              src={p.imageUrl}
                              alt={p.label}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                            {/* Corner brackets */}
                            {!isScanning && (
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-brand-400 rounded-tl" />
                                <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-brand-400 rounded-tr" />
                                <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-brand-400 rounded-bl" />
                                <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-brand-400 rounded-br" />
                              </div>
                            )}
                            {/* Scan animation */}
                            {isScanning && (
                              <div className="absolute inset-0 bg-brand-900/20">
                                <motion.div
                                  className="absolute left-0 right-0 h-0.5 bg-brand-400 shadow-[0_0_8px_2px_rgba(243,63,63,0.8)]"
                                  initial={{ top: '0%' }}
                                  animate={{ top: ['0%', '100%', '0%'] }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-brand-400 rounded-tl" />
                                  <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-brand-400 rounded-tr" />
                                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-brand-400 rounded-bl" />
                                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-brand-400 rounded-br" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{p.label}</p>
                            <p className="text-xs text-slate-400">{p.sublabel}</p>
                          </div>
                          {isScanning && (
                            <div className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                              <ScanFace className="w-3.5 h-3.5" />
                              Scanning...
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                  <button onClick={() => router.push('/shop')}
                    className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors text-center pt-1">
                    Skip — browse without personalization →
                  </button>
                </motion.div>
              ) : (
                <motion.div key="scan"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="p-8 space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900">Let&apos;s personalize your experience</h2>
                    <p className="text-sm text-slate-500 mt-1">Look into the camera to unlock your deals</p>
                  </div>
                  <WebcamCapture onCapture={handleCapture} isAnalyzing={isAnalyzing} />
                  <button onClick={() => router.push('/shop')}
                    className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors text-center">
                    Skip — browse without personalization →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
