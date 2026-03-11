'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { WebcamCapture } from '@/components/camera/WebcamCapture'
import { usePersona } from '@/context/PersonaContext'
import type { UserPersona } from '@/lib/types'
import { Zap, ShoppingBag, Bot, Shield } from 'lucide-react'

const FEATURES = [
  { icon: Bot, label: 'AI Shopping Agent', desc: 'Natural language product search' },
  { icon: Zap, label: 'Personalized Deals', desc: 'Tailored offers just for you' },
  { icon: ShoppingBag, label: 'Smart Checkout', desc: 'AI-pre-filled shipping & payment' },
]

export default function WelcomePage() {
  const router = useRouter()
  const { setPersona } = usePersona()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">FutureStore</span>
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
                Shopping,<br />
                <span className="text-indigo-600">reimagined</span><br />
                with AI.
              </h1>
              <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                Our AI scans your vibe, unlocks personalized deals, and helps you find exactly what you need — just by talking.
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

          {/* Right: camera */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="card p-8 space-y-6">
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
        </div>
      </div>
    </main>
  )
}
