import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

import { LayoutDashboard, Music, Users, Shield, CalendarDays, UserCircle } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tablero', icon: LayoutDashboard },
  { to: '/songs', label: 'Canciones', icon: Music },
  { to: '/people', label: 'Personas', icon: Users },
  { to: '/teams', label: 'Equipos', icon: Shield },
  { to: '/services', label: 'Servicios', icon: CalendarDays },
  { to: '/profile', label: 'Perfil', icon: UserCircle },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
        <span className="text-lg font-semibold text-indigo-600">Planly</span>
        <div className="flex items-center gap-3">
          {memberships.length > 0 ? (
            <select
              aria-label="Iglesia activa"
              value={activeChurchId ?? ''}
              onChange={(event) => setActiveChurch(event.target.value || null)}
              className="min-h-11 max-w-40 rounded-md border border-gray-300 bg-white px-2 text-sm md:max-w-none"
            >
              {activeChurchId === null ? <option value="">Selecciona una iglesia…</option> : null}
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
            Cerrar sesión
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r bg-white px-3 pt-20 md:flex">
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <Icon className="h-5 w-5 opacity-75" />
                {item.label}
              </NavLink>
            )
          })}
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
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col min-h-14 min-w-14 items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
