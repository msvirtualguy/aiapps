import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { PersonaProvider } from '@/context/PersonaContext'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FreshCart — AI Shopping',
  description: 'The store of the future, powered by Nutanix Enterprise AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${dmMono.variable} font-sans antialiased`}>
        <PersonaProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </PersonaProvider>
      </body>
    </html>
  )
}
