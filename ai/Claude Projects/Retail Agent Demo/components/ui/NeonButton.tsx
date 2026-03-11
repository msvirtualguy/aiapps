'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'green' | 'blue' | 'pink'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function NeonButton({
  children,
  variant = 'green',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: NeonButtonProps) {
  const variantStyles = {
    green: 'border-neon-green/40 text-neon-green hover:bg-neon-green/10 hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]',
    blue: 'border-neon-blue/40 text-neon-blue hover:bg-neon-blue/10 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)]',
    pink: 'border-neon-pink/40 text-neon-pink hover:bg-neon-pink/10 hover:shadow-[0_0_20px_rgba(255,16,240,0.4)]',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm font-medium',
    lg: 'px-8 py-3.5 text-base font-semibold',
  }

  return (
    <button
      className={clsx(
        'relative border rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
        'bg-transparent font-mono tracking-wide',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
