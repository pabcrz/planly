import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import * as authService from '@/services/authService'
import type { MembershipWithChurch } from '@/services/authService'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  memberships: MembershipWithChurch[]
  membershipsLoaded: boolean
  refreshMemberships: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [memberships, setMemberships] = useState<MembershipWithChurch[]>([])
  const [membershipsLoaded, setMembershipsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Guard against stale promise resolutions: only apply the membership
  // result if the user who triggered the fetch is still the active user.
  const membershipsForUserRef = useRef<string | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      const nextUser = nextSession?.user ?? null
      setUser(nextUser)
      setIsLoading(false)

      if (nextUser) {
        setMembershipsLoaded(false)
        membershipsForUserRef.current = nextUser.id

        authService
          .getMemberships(nextUser.id)
          .then((rows) => {
            // Discard the result if the user changed while the fetch was in-flight.
            if (membershipsForUserRef.current === nextUser.id) {
              setMemberships(rows)
              setMembershipsLoaded(true)
            }
          })
          .catch(() => {
            if (membershipsForUserRef.current === nextUser.id) {
              setMemberships([])
              setMembershipsLoaded(true)
            }
          })
      } else {
        membershipsForUserRef.current = null
        setMemberships([])
        setMembershipsLoaded(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function refreshMemberships() {
    if (!user) return
    const rows = await authService.getMemberships(user.id)
    setMemberships(rows)
    setMembershipsLoaded(true)
  }

  async function signOut() {
    await authService.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, memberships, membershipsLoaded, refreshMemberships, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
