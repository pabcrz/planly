import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Public views get their own QueryClient: a longer staleTime suits read-heavy
// anonymous traffic, and the cache stays isolated from the authenticated app.
const publicQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

// Minimal shell for anonymous setlist/lyrics views: no navigation chrome, no
// auth state, no session creation. The only chrome is a subtle brand header.
export function PublicLayout() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <div className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-100">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
            <Link to="/sign-in" className="text-lg font-semibold tracking-tight text-indigo-600">
              Planly
            </Link>
            <Link
              to="/sign-in"
              className="flex min-h-11 items-center text-sm text-gray-400 hover:text-gray-600"
            >
              Sign in
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </QueryClientProvider>
  )
}
