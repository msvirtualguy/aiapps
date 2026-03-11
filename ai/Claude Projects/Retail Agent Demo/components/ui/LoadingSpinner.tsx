'use client'

import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'green' | 'blue' | 'pink'
  className?: string
}

export function LoadingSpinner({ size = 'md', color = 'green', className }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-14 h-14' }
  const colorMap = {
    green: 'border-neon-green/30 border-t-neon-green',
    blue: 'border-neon-blue/30 border-t-neon-blue',
    pink: 'border-neon-pink/30 border-t-neon-pink',
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
