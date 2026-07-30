import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { ChurchGuard } from '@/features/auth/ChurchGuard'

const LoginForm = lazy(() => import('@/features/auth/LoginForm').then((m) => ({ default: m.LoginForm })))
const SignupForm = lazy(() => import('@/features/auth/SignupForm').then((m) => ({ default: m.SignupForm })))
const DashboardPage = lazy(() =>
  import('@/features/auth/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)

// Lazy placeholder for feature pages built in later PRs. The lazy() seam stays
// in place so swapping in the real page is a one-line change.
function lazyPlaceholder(title: string) {
  return lazy(() =>
    Promise.resolve({
      default: function PlaceholderPage() {
        return (
          <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-500">This section is under construction.</p>
          </div>
        )
      },
    }),
  )
}

const SongListPage = lazy(() => import('@/features/songs/SongList').then((m) => ({ default: m.SongList })))
const SongFormPage = lazy(() => import('@/features/songs/SongForm').then((m) => ({ default: m.SongForm })))
const SongDetailPage = lazy(() =>
  import('@/features/songs/SongDetailPage').then((m) => ({ default: m.SongDetailPage })),
)
const TeamListPage = lazy(() => import('@/features/teams/TeamList').then((m) => ({ default: m.TeamList })))
const TeamDetailPage = lazy(() =>
  import('@/features/teams/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage })),
)
const ProfilePage = lazy(() =>
  import('@/features/teams/ProfileForm').then((m) => ({ default: m.ProfileForm })),
)
const ServiceListPage = lazy(() =>
  import('@/features/services/ServiceList').then((m) => ({ default: m.ServiceList })),
)
const ServiceNewPage = lazy(() =>
  import('@/features/services/ServiceForm').then((m) => ({ default: m.NewServicePage })),
)
const ServiceDetailPage = lazy(() =>
  import('@/features/services/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })),
)
const SetlistPage = lazy(() =>
  import('@/features/services/SetlistPage').then((m) => ({ default: m.SetlistPage })),
)
const PublicSetlistPage = lazyPlaceholder('Public setlist')

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/sign-in', element: <LoginForm /> },
      { path: '/sign-up', element: <SignupForm /> },
    ],
  },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      {
        element: <ChurchGuard />,
        children: [
          { path: '/songs', element: <SongListPage /> },
          { path: '/songs/new', element: <SongFormPage /> },
          { path: '/songs/:id', element: <SongDetailPage /> },
          { path: '/songs/:id/edit', element: <SongFormPage /> },
          { path: '/teams', element: <TeamListPage /> },
          { path: '/teams/:id', element: <TeamDetailPage /> },
          { path: '/services', element: <ServiceListPage /> },
          { path: '/services/new', element: <ServiceNewPage /> },
          { path: '/services/:id', element: <ServiceDetailPage /> },
          { path: '/setlists/:id', element: <SetlistPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    // Public view — no auth check by design. PublicLayout arrives in Task 34 (PR #5).
    path: '/s/:serviceId',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <PublicSetlistPage />
      </Suspense>
    ),
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
