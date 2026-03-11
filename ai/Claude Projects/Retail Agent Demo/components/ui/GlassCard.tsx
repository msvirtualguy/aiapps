'use client'

import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface GlassCardProps {
  children: ReactNode
  className?: string
  neon?: 'green' | 'blue' | 'pink' | 'none'
  onClick?: () => void
}

export function GlassCard({ children, className, neon, onClick }: GlassCardProps) {
  const highlightClass = neon && neon !== 'none'
    ? 'border-indigo-300 ring-1 ring-indigo-100'
    : ''

  return (
    <div
      className={clsx(
        'card p-4',
        highlightClass,
        onClick && 'cursor-pointer hover:shadow-md transition-all',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
