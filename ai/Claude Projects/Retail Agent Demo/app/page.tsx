'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { WebcamCapture } from '@/components/camera/WebcamCapture'
import { usePersona } from '@/context/PersonaContext'
import type { UserPersona } from '@/lib/types'
import { Zap } from 'lucide-react'

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
    } catch {
      // Continue with no persona — shop page handles null
    } finally {
      setIsAnalyzing(false)
      router.push('/shop')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-neon-green" />
            <span className="font-mono font-bold text-neon-green text-lg tracking-widest uppercase">
              FutureStore
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight">
            The Store<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue">
              of Tomorrow
            </span>
          </h1>
          <p className="text-sm text-white/50 max-w-xs">
            AI-powered shopping experience. Our camera detects your vibe and unlocks personalized deals just for you.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {['AI Product Search', 'Personalized Deals', 'Instant Checkout'].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-white/50">
              {f}
            </span>
          ))}
        </div>

        {/* Webcam capture */}
        <WebcamCapture onCapture={handleCapture} isAnalyzing={isAnalyzing} />

        {/* Skip link */}
        <button
          onClick={() => router.push('/shop')}
          className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
        >
          Skip camera → browse without personalization
        </button>

        {/* Powered by */}
        <div className="flex items-center gap-2 text-white/20 text-[10px] font-mono">
          <span>POWERED BY</span>
          <span className="text-white/40 font-bold">NUTANIX ENTERPRISE AI</span>
        </div>
      </motion.div>
    </main>
  )
}
