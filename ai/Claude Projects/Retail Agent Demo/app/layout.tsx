import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { PersonaProvider } from '@/context/PersonaContext'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FutureStore — AI Shopping',
  description: 'The store of the future, powered by Nutanix Enterprise AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable} font-sans antialiased`}>
        <PersonaProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </PersonaProvider>
      </body>
    </html>
  )
}
