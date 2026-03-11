'use client'

import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'green' | 'blue' | 'pink'
  className?: string
}

export function LoadingSpinner({ size = 'md', color = 'green', className }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const colorMap = {
    green: 'border-brand-200 border-t-indigo-600',
    blue:  'border-slate-200 border-t-slate-600',
    pink:  'border-rose-200 border-t-rose-500',
  }

  return (
    <div
      className={clsx(
        'rounded-full border-2 animate-spin',
        sizeMap[size],
        colorMap[color],
        className
      )}
    />
  )
}
