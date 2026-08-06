import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function AuthLayout() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />
  // Invite verification establishes a session before the invitee sets a password.
  if (user && location.pathname !== '/auth/invite') return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-indigo-600">Planly</span>
          <p className="mt-1 text-sm text-gray-500">plan & lyrics</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
