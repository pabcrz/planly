import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function AuthGuard({ children }: { children?: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/sign-in?redirect=${redirect}`} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
