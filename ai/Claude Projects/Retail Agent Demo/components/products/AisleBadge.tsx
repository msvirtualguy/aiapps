'use client'

import { MapPin } from 'lucide-react'

export function AisleBadge({ aisle }: { aisle: string }) {
  return (
    <span className="badge-aisle">
      <MapPin className="w-2.5 h-2.5" />
      {aisle}
    </span>
  )
}
