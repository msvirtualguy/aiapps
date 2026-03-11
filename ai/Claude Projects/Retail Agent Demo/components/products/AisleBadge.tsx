'use client'

import { MapPin } from 'lucide-react'

export function AisleBadge({ aisle }: { aisle: string }) {
  return (
    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
      <MapPin className="w-2.5 h-2.5" />
      {aisle}
    </span>
  )
}
