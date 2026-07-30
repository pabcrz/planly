import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import type { MembershipWithChurch } from '@/services/authService'

const STORAGE_KEY = 'planly.activeChurchId'

interface ChurchContextValue {
  activeChurchId: string | null
  activeMembership: MembershipWithChurch | null
  setActiveChurch: (id: string | null) => void
}

const ChurchContext = createContext<ChurchContextValue | null>(null)

export function ChurchProvider({ children }: { children: ReactNode }) {
  const { user, memberships, isLoading } = useAuth()
  const [activeChurchId, setActiveChurchId] = useState<string | null>(null)

  // Resolve the active church once auth/membership data arrives:
  // keep a still-valid current/stored selection, else auto-select a single
  // membership, else require an explicit pick.
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      setActiveChurchId(null)
      return
    }
    setActiveChurchId((current) => {
      if (current && memberships.some((m) => m.church_id === current)) return current
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && memberships.some((m) => m.church_id === stored)) return stored
      if (memberships.length === 1) return memberships[0].church_id
      return null
    })
  }, [user, memberships, isLoading])

  // Persist the selection so reloads restore it.
  useEffect(() => {
    if (activeChurchId) localStorage.setItem(STORAGE_KEY, activeChurchId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [activeChurchId])

  const activeMembership = useMemo(
    () => memberships.find((m) => m.church_id === activeChurchId) ?? null,
    [memberships, activeChurchId],
  )

  return (
    <ChurchContext.Provider value={{ activeChurchId, activeMembership, setActiveChurch: setActiveChurchId }}>
      {children}
    </ChurchContext.Provider>
  )
}

export function useChurch(): ChurchContextValue {
  const ctx = useContext(ChurchContext)
  if (!ctx) throw new Error('useChurch must be used within ChurchProvider')
  return ctx
}
