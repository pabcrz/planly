import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { usePlatformAdmin } from './platformAdmin'

export function AdminGuard({ children }: { children?: ReactNode }) {
  const { user, isLoading } = useAuth()
  const { data: isAdmin, isLoading: isChecking } = usePlatformAdmin()

  if (isLoading || (user && isChecking)) return <LoadingSpinner />
  if (!user || !isAdmin) return <Navigate to="/dashboard" replace />
  return children ? <>{children}</> : <Outlet />
}
