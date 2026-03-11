'use client'

import { motion } from 'framer-motion'
import type { ChatMessage } from '@/lib/types'
import { Bot, User, Zap } from 'lucide-react'
import { clsx } from 'clsx'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={clsx(
        'shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5',
        isUser ? 'bg-neon-blue/20 border border-neon-blue/30' : 'bg-neon-green/20 border border-neon-green/30'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-neon-blue" />
          : <Bot className="w-3.5 h-3.5 text-neon-green" />
        }
      </div>

      <div className={clsx('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {/* Tool call chips */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-neon-yellow/10 text-neon-yellow border border-neon-yellow/20"
              >
                <Zap className="w-2.5 h-2.5" />
                {tc.summary}
              </span>
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div className={clsx(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-neon-blue/15 border border-neon-blue/20 text-white rounded-tr-sm'
              : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm'
          )}>
            {message.content}
          </div>
        )}

        {/* Typing indicator (empty assistant message = still loading) */}
        {!isUser && !message.content && (!message.toolCalls || message.toolCalls.length === 0) && (
          <div className="px-3.5 py-3 bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-neon-green/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
