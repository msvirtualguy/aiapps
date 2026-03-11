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
    green: 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand',
    blue:  'bg-white text-brand-600 border border-brand-200 hover:bg-brand-50',
    pink:  'bg-rose-500 text-white hover:bg-rose-600',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
    md: 'px-5 py-2.5 text-sm font-semibold rounded-xl',
    lg: 'px-7 py-3.5 text-base font-bold rounded-xl',
  }

  return (
    <button
      className={clsx(
        'transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
