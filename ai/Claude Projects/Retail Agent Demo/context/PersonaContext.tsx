'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { UserPersona } from '@/lib/types'

interface PersonaContextValue {
  persona: UserPersona | null
  setPersona: (persona: UserPersona) => void
  clearPersona: () => void
}

const PersonaContext = createContext<PersonaContextValue | null>(null)

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<UserPersona | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('futurestore_persona')
      if (saved) {
        setPersonaState(JSON.parse(saved))
      }
    } catch { /* ignore */ }
  }, [])

  const setPersona = (p: UserPersona) => {
    setPersonaState(p)
    try {
      localStorage.setItem('futurestore_persona', JSON.stringify(p))
    } catch { /* ignore */ }
  }

  const clearPersona = () => {
    setPersonaState(null)
    try {
      localStorage.removeItem('futurestore_persona')
    } catch { /* ignore */ }
  }

  return (
    <PersonaContext.Provider value={{ persona, setPersona, clearPersona }}>
      {children}
    </PersonaContext.Provider>
  )
}

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider')
  return ctx
}
