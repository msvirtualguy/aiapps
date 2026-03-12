'use client'

import type { UserPersona } from '@/lib/types'
import { Sparkles, CreditCard, Truck } from 'lucide-react'

interface PersonaCardProps {
  persona: UserPersona | null
  loading?: boolean
}

const PAYMENT_LABELS: Record<string, string> = {
  'credit-card': 'Credit Card',
  'debit-card': 'Debit Card',
  'apple-pay': 'Apple Pay',
  'venmo': 'Venmo',
  // legacy fallbacks
  'card': 'Card',
  'google-pay': 'Google Pay',
  'buy-now-pay-later': 'Buy Now Pay Later',
}

const SHIPPING_LABELS: Record<string, string> = {
  standard: 'Standard',
  express: 'Express',
  overnight: 'Overnight',
}

export function PersonaCard({ persona, loading }: PersonaCardProps) {
  if (loading) {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 shimmer" />
          <div className="h-4 w-28 rounded-lg bg-slate-100 shimmer" />
        </div>
        <div className="h-3 w-full rounded bg-slate-100 shimmer" />
        <div className="h-3 w-2/3 rounded bg-slate-100 shimmer" />
      </div>
    )
  }

  if (!persona) return null

  return (
    <div className="card p-4 space-y-3 border-brand-200 ring-1 ring-brand-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-bold text-slate-900">{persona.name ?? 'Guest'}</span>
        </div>
        <span className="text-[10px] text-slate-400">{persona.ageGroup}</span>
      </div>

      <p className="text-xs text-slate-500 capitalize">{persona.vibe}</p>

      <div className="flex flex-wrap gap-1.5">
        {persona.style.map(s => (
          <span key={s} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 capitalize">
            {s}
          </span>
        ))}
      </div>

      <div className="flex gap-4 text-slate-500">
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          <span className="text-xs">{persona.paymentDetails?.label ?? PAYMENT_LABELS[persona.preferredPayment] ?? persona.preferredPayment}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" />
          <span className="text-xs">{SHIPPING_LABELS[persona.shippingPreference]}</span>
        </div>
      </div>

      {persona.personalizedDeals.length > 0 && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Your Deals</p>
          {persona.personalizedDeals.slice(0, 2).map((deal, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">{deal.title}</p>
                <p className="text-[10px] text-slate-400">{deal.description}</p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600">
                {deal.discount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
