'use client'

import { motion } from 'framer-motion'
import type { ChatMessage } from '@/lib/types'
import { Bot, User, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
        isUser ? 'bg-brand-100' : 'bg-slate-100'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-brand-600" />
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

        {(message.content || message.nutritionTable) && (
          <div className={clsx(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
          )}>
            {isUser ? message.content : (
              <>
                {message.content && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="text-xs border-collapse w-full">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                      th: ({ children }) => (
                        <th className="px-2.5 py-1.5 text-left font-semibold text-slate-700 border border-slate-200 whitespace-nowrap">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2.5 py-1.5 border border-slate-200 text-slate-700">{children}</td>
                      ),
                      tr: ({ children }) => <tr className="even:bg-slate-50">{children}</tr>,
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
                {message.nutritionTable && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto mt-2">
                          <table className="text-xs border-collapse w-full">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-emerald-50">{children}</thead>,
                      th: ({ children }) => (
                        <th className="px-2.5 py-1.5 text-left font-semibold text-emerald-800 border border-emerald-200 whitespace-nowrap">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2.5 py-1.5 border border-slate-200 text-slate-700">{children}</td>
                      ),
                      tr: ({ children }) => <tr className="even:bg-slate-50">{children}</tr>,
                      p: ({ children }) => <p className="mt-2 mb-1 font-semibold text-slate-700 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                    }}
                  >
                    {message.nutritionTable}
                  </ReactMarkdown>
                )}
              </>
            )}
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
