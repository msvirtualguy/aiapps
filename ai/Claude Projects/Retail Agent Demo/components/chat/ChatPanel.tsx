'use client'

import { useRef, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage, Product, CartItem, UserPersona } from '@/lib/types'
import { useStreamingChat } from '@/hooks/useStreamingChat'
import { Send, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'

const QUICK_PROMPTS = [
  "Show me today's deals",
  "Wireless headphones?",
  "I need workout gear",
  "What's on BOGO?",
]

interface ChatPanelProps {
  persona: UserPersona | null
  onProductsFound: (products: Product[]) => void
  onCartUpdate: (items: CartItem[]) => void
}

export function ChatPanel({ persona, onProductsFound, onCartUpdate }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage } = useStreamingChat({ onProductsFound, onCartUpdate })

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

  return (
    <div className="card flex flex-col h-full min-h-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">ShopBot</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-400 font-medium">AI · Nutanix NAI</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-slate-500">Hey! Ask me anything about our store.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p, persona)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg: ChatMessage) => <MessageBubble key={msg.id} message={msg} />)}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-100 bg-white">
        <div className={clsx(
          'flex items-center gap-2 rounded-xl px-3 py-2 border transition-all',
          'bg-slate-50 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100',
          isLoading ? 'border-slate-200' : 'border-slate-200'
        )}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Search products, ask about deals..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}
            className={clsx('p-1.5 rounded-lg transition-all',
              input.trim() && !isLoading ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 cursor-not-allowed'
            )}>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
