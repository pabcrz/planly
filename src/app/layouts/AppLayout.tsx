import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/songs', label: 'Songs' },
  { to: '/teams', label: 'Teams' },
  { to: '/services', label: 'Services' },
  { to: '/profile', label: 'Profile' },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
  }`
}

export function AppLayout() {
  const navigate = useNavigate()
  const { memberships, signOut } = useAuth()
  const { activeChurchId, setActiveChurch } = useChurch()

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-3 md:px-6">
        <span className="text-lg font-semibold text-indigo-600">SelahPlan</span>
        <div className="flex items-center gap-3">
          {memberships.length > 0 ? (
            <select
              aria-label="Active church"
              value={activeChurchId ?? ''}
              onChange={(event) => setActiveChurch(event.target.value || null)}
              className="min-h-11 max-w-40 rounded-md border border-gray-300 bg-white px-2 text-sm md:max-w-none"
            >
              {activeChurchId === null ? <option value="">Select church…</option> : null}
              {memberships.map((membership) => (
                <option key={membership.id} value={membership.church_id}>
                  {membership.church.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r bg-white px-3 pt-20 md:flex">
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="pb-20 md:pb-6 md:pl-56">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-white py-1 md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-11 min-w-14 items-center justify-center rounded-md px-2 text-xs font-medium ${
                isActive ? 'text-indigo-700' : 'text-gray-500'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
