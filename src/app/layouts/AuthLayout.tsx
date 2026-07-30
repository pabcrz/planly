import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function AuthLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-indigo-600">SelahPlan</span>
          <p className="mt-1 text-sm text-gray-500">Church service planning</p>
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
