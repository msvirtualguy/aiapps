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
    label: 'Family Shopper',
    sublabel: 'Parent · feeding the family',
    persona: {
      ageGroup: 'Millennial (26-40)',
      style: ['practical', 'value-focused', 'family-oriented'],
      interests: ['cooking', 'meal prep', 'family meals', 'healthy eating', 'saving money'],
      preferredPayment: 'card',
      shippingPreference: 'standard',
      personalizedDeals: [
        { title: 'Family Pack Savings', description: 'Buy 2 get 1 free on Dairy & Eggs', discount: 'B2G1', category: 'Dairy & Eggs' },
        { title: 'Fresh Produce Deal', description: '25% off all Produce today', discount: '25% OFF', category: 'Produce' },
      ],
      vibe: 'savvy family meal planner',
    },
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Health Nut',
    sublabel: 'Fitness-focused · clean eater',
    persona: {
      ageGroup: 'Young Adult (18-25)',
      style: ['health-conscious', 'organic', 'performance'],
      interests: ['fitness', 'nutrition', 'organic food', 'meal prep', 'wellness'],
      preferredPayment: 'apple-pay',
      shippingPreference: 'express',
      personalizedDeals: [
        { title: 'Organic Week', description: '20% off all organic items', discount: '20% OFF', category: 'Produce' },
        { title: 'Protein Boost', description: 'BOGO on Meat & Seafood', discount: 'BOGO', category: 'Meat & Seafood' },
      ],
      vibe: 'clean eating fitness fanatic',
    },
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Party Host',
    sublabel: 'Entertaining · snacks & drinks',
    persona: {
      ageGroup: 'Gen X (41-55)',
      style: ['social', 'entertaining', 'generous'],
      interests: ['entertaining', 'cooking', 'snacks', 'beverages', 'parties'],
      preferredPayment: 'google-pay',
      shippingPreference: 'express',
      personalizedDeals: [
        { title: 'Party Pack', description: 'Buy 2 get 1 free on Snacks', discount: 'B2G1', category: 'Snacks' },
        { title: 'Drinks Deal', description: '15% off all Beverages', discount: '15% OFF', category: 'Beverages' },
      ],
      vibe: 'ultimate party host',
    },
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face&auto=format',
    label: 'Budget Savvy',
    sublabel: 'Deal hunter · smart shopper',
    persona: {
      ageGroup: 'Boomer (55+)',
      style: ['budget-conscious', 'practical', 'value-focused'],
      interests: ['saving money', 'bulk buying', 'coupons', 'meal planning'],
      preferredPayment: 'buy-now-pay-later',
      shippingPreference: 'standard',
      personalizedDeals: [
        { title: 'Weekly Specials', description: '30% off Pantry & Dry Goods', discount: '30% OFF', category: 'Pantry & Dry Goods' },
        { title: 'Bakery Blowout', description: 'BOGO on all Bakery items', discount: 'BOGO', category: 'Bakery & Bread' },
      ],
      vibe: 'smart savings champion',
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
          className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">FreshCart</span>
          <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600">
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
                <span className="text-indigo-600">shopping,</span><br />
                supercharged.
              </h1>
              <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                Our AI recognizes you, unlocks personalized deals, and helps you find exactly what you need — just by talking.
              </p>
            </div>

            <div className="space-y-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-indigo-600" />
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
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-400 hover:text-slate-600'
                )}>
                <Users className="w-4 h-4" /> Demo Profiles
              </button>
              <button
                onClick={() => setTab('scan')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors',
                  tab === 'scan'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
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
                              ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                              : isDisabled
                              ? 'border-slate-100 bg-slate-50 opacity-40'
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
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
                                <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                                <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                                <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                                <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400 rounded-br" />
                              </div>
                            )}
                            {/* Scan animation */}
                            {isScanning && (
                              <div className="absolute inset-0 bg-indigo-900/20">
                                <motion.div
                                  className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_8px_2px_rgba(99,102,241,0.8)]"
                                  initial={{ top: '0%' }}
                                  animate={{ top: ['0%', '100%', '0%'] }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                                  <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400 rounded-br" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{p.label}</p>
                            <p className="text-xs text-slate-400">{p.sublabel}</p>
                          </div>
                          {isScanning && (
                            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
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
