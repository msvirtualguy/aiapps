'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, Product, CartItem, UserPersona } from '@/lib/types'

interface UseStreamingChatOptions {
  onProductsFound?: (products: Product[]) => void
  onCartUpdate?: (items: CartItem[]) => void
}

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (
    content: string,
    persona: UserPersona | null
  ) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    const assistantId = `msg_${Date.now() + 1}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMsg])

    abortRef.current = new AbortController()

    try {
      // Build history for the API (exclude current empty assistant message)
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, persona }),
        signal: abortRef.current.signal,
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'tool_call') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? {
                    ...m,
                    toolCalls: [...(m.toolCalls ?? []), {
                      name: event.name,
                      status: 'done' as const,
                      summary: event.name,
                    }],
                  }
                  : m
              ))
            } else if (event.type === 'products') {
              options.onProductsFound?.(event.data)
            } else if (event.type === 'cart_update') {
              options.onCartUpdate?.(event.data)
            } else if (event.type === 'nutrition') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, nutritionTable: event.data } : m
              ))
            } else if (event.type === 'message') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: event.content } : m
              ))
            }
          } catch { /* ignore malformed events */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Try again?" }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, options])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, clearMessages }
}
