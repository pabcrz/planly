import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { usePlatformAdmin } from './platformAdmin'

export function ChurchGuard({ children }: { children?: ReactNode }) {
  const { user, isLoading, membershipsLoaded } = useAuth()
  const { activeChurchId } = useChurch()
  const { data: isPlatformAdmin, isLoading: isCheckingAdmin } = usePlatformAdmin()

  // Wait for memberships so a single-membership user is auto-selected before
  // deciding there is no active church.
  if (isLoading || (user && (!membershipsLoaded || isCheckingAdmin))) return <LoadingSpinner />
  if (user && !activeChurchId && !isPlatformAdmin) return <Navigate to="/dashboard" replace />

  return children ? <>{children}</> : <Outlet />
}
