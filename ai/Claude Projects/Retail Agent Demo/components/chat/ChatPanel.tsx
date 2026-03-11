'use client'

import { useRef, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { GlassCard } from '@/components/ui/GlassCard'
import type { ChatMessage, Product, CartItem, UserPersona } from '@/lib/types'
import { useStreamingChat } from '@/hooks/useStreamingChat'
import { Send, Bot } from 'lucide-react'
import { clsx } from 'clsx'

const QUICK_PROMPTS = [
  "What headphones do you have?",
  "Show me today's deals",
  "I need workout gear",
  "What's BOGO right now?",
]

interface ChatPanelProps {
  persona: UserPersona | null
  onProductsFound: (products: Product[]) => void
  onCartUpdate: (items: CartItem[]) => void
}

export function ChatPanel({ persona, onProductsFound, onCartUpdate }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')

  const { messages, isLoading, sendMessage } = useStreamingChat({
    onProductsFound,
    onCartUpdate,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text, persona)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <GlassCard className="flex flex-col h-full min-h-0 p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
        <div className="w-7 h-7 rounded-full bg-neon-green/20 border border-neon-green/30 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-neon-green" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">ShopBot</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[10px] font-mono text-white/40">AI POWERED · NUTANIX NAI</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="text-3xl">🛍️</div>
            <p className="text-sm text-white/60">Hey! I&apos;m ShopBot. Ask me anything about our store.</p>

            {/* Quick prompt chips */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt, persona)}
                  className="px-3 py-1.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-white/60 hover:border-neon-green/30 hover:text-neon-green hover:bg-neon-green/5 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className={clsx(
          'flex items-center gap-2 rounded-xl px-3 py-2',
          'bg-white/5 border transition-colors',
          isLoading ? 'border-white/10' : 'border-white/10 focus-within:border-neon-green/30'
        )}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products, deals, aisle locations..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={clsx(
              'p-1.5 rounded-lg transition-all',
              input.trim() && !isLoading
                ? 'text-neon-green hover:bg-neon-green/10'
                : 'text-white/20 cursor-not-allowed'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </GlassCard>
  )
}
