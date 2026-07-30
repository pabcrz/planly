import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function ChurchGuard({ children }: { children?: ReactNode }) {
  const { user, isLoading, membershipsLoaded } = useAuth()
  const { activeChurchId } = useChurch()

  // Wait for memberships so a single-membership user is auto-selected before
  // deciding there is no active church.
  if (isLoading || (user && !membershipsLoaded)) return <LoadingSpinner />
  if (user && !activeChurchId) return <Navigate to="/dashboard" replace />

  return children ? <>{children}</> : <Outlet />
}
