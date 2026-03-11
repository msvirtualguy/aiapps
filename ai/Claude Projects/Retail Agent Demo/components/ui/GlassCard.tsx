'use client'

import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface GlassCardProps {
  children: ReactNode
  className?: string
  neon?: 'green' | 'blue' | 'pink' | 'none'
  onClick?: () => void
}

export function GlassCard({ children, className, neon = 'none', onClick }: GlassCardProps) {
  const neonClass = {
    green: 'neon-border',
    blue: 'neon-border-blue',
    pink: 'neon-border-pink',
    none: '',
  }[neon]

  return (
    <div
      className={clsx('glass p-4', neonClass, onClick && 'cursor-pointer hover:bg-white/8 transition-colors', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
