'use client'

import { motion } from 'framer-motion'
import type { ChatMessage } from '@/lib/types'
import { Bot, User, Zap } from 'lucide-react'
import { clsx } from 'clsx'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={clsx('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={clsx(
        'shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5',
        isUser ? 'bg-indigo-100' : 'bg-slate-100'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-indigo-600" />
          : <Bot className="w-3.5 h-3.5 text-slate-600" />
        }
      </div>

      <div className={clsx('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.toolCalls.map((tc, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Zap className="w-2.5 h-2.5" />
                {tc.summary}
              </span>
            ))}
          </div>
        )}

        {message.content && (
          <div className={clsx(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
          )}>
            {message.content}
          </div>
        )}

        {!isUser && !message.content && (!message.toolCalls || message.toolCalls.length === 0) && (
          <div className="px-3.5 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
