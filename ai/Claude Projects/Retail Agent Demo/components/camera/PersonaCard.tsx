'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { UserPersona } from '@/lib/types'
import { Sparkles, CreditCard, Truck } from 'lucide-react'

interface PersonaCardProps {
  persona: UserPersona | null
  loading?: boolean
}

const PAYMENT_ICONS: Record<string, string> = {
  'card': '💳',
  'apple-pay': '',
  'google-pay': 'G Pay',
  'buy-now-pay-later': 'BNPL',
}

const SHIPPING_LABELS: Record<string, string> = {
  standard: 'Standard',
  express: 'Express',
  overnight: 'Overnight',
}

export function PersonaCard({ persona, loading }: PersonaCardProps) {
  if (loading) {
    return (
      <GlassCard className="shimmer">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="h-4 w-24 rounded bg-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-3/4 rounded bg-white/10" />
        </div>
      </GlassCard>
    )
  }

  if (!persona) return null

  return (
    <GlassCard neon="green" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neon-green" />
          <span className="text-xs font-mono text-neon-green uppercase tracking-widest">Your Vibe</span>
        </div>
        <span className="text-[10px] font-mono text-white/30">{persona.ageGroup}</span>
      </div>

      <p className="text-sm font-semibold text-white capitalize">{persona.vibe}</p>

      {/* Style tags */}
      <div className="flex flex-wrap gap-1.5">
        {persona.style.map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20 capitalize">
            {s}
          </span>
        ))}
      </div>

      {/* Preferences */}
      <div className="flex gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-white/50">
          <CreditCard className="w-3 h-3" />
          <span className="text-[10px] font-mono">{PAYMENT_ICONS[persona.preferredPayment] || persona.preferredPayment}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <Truck className="w-3 h-3" />
          <span className="text-[10px] font-mono">{SHIPPING_LABELS[persona.shippingPreference]}</span>
        </div>
      </div>

      {/* Personalized deals */}
      {persona.personalizedDeals.length > 0 && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Your Deals</p>
          {persona.personalizedDeals.slice(0, 2).map((deal, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-white">{deal.title}</p>
                <p className="text-[10px] text-white/40">{deal.description}</p>
              </div>
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-pink/20 text-neon-pink border border-neon-pink/30">
                {deal.discount}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
