import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ChurchSelect } from '@/features/auth/ChurchSelect'
import { getSongs } from '@/services/songService'
import { getTeams } from '@/services/teamService'
import { getPeople } from '@/services/peopleService'
import { getServices } from '@/services/serviceService'
import { ServiceCard } from '@/features/services/ServiceCard'

export function DashboardPage() {
  const { user } = useAuth()
  const { activeChurchId, activeMembership } = useChurch()

  const { data: songs, isLoading: songsLoading } = useQuery({
    queryKey: ['songs', activeChurchId],
    queryFn: () => getSongs(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', activeChurchId],
    queryFn: () => getTeams(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const { data: people, isLoading: peopleLoading } = useQuery({
    queryKey: ['people', activeChurchId],
    queryFn: () => getPeople(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', activeChurchId],
    queryFn: () => getServices(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const upcomingServices = useMemo(() => {
    if (!services) return []
    const today = new Date().toISOString().slice(0, 10)
    return services
      .filter((s) => s.status !== 'completed' && s.service_date >= today)
      .sort((a, b) => a.service_date.localeCompare(b.service_date) || a.start_time.localeCompare(b.start_time))
      .slice(0, 4)
  }, [services])

  if (!activeChurchId) return <ChurchSelect />

  const isLoading = songsLoading || teamsLoading || peopleLoading || servicesLoading

  const statCards = [
    { label: 'Canciones', value: songs?.length ?? 0, hint: 'Catálogo de alabanza', link: '/songs' },
    { label: 'Equipos', value: teams?.length ?? 0, hint: 'Equipos ministeriales', link: '/teams' },
    { label: 'Personas', value: people?.length ?? 0, hint: 'Miembros en el roster', link: '/people' },
    { label: 'Próximos Servicios', value: upcomingServices.length, hint: 'Servicios programados', link: '/services' },
  ]

  const canManage = activeMembership?.role === 'church_admin' || activeMembership?.role === 'worship_director'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={activeMembership ? `Tablero · ${activeMembership.church.name}` : 'Tablero'}
        description={user?.email ? `Sesión iniciada como ${user.email} · Rol: ${activeMembership?.role === 'church_admin' ? 'Admin' : activeMembership?.role === 'worship_director' ? 'Editor (Director)' : 'Viewer (Miembro)'}` : undefined}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <Link
                key={card.label}
                to={card.link}
                className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-extrabold text-indigo-900">{card.value}</p>
                </div>
                <p className="mt-4 text-xs font-medium text-gray-400 border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span>{card.hint}</span>
                  <span className="text-indigo-600 font-bold">Ver todo →</span>
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Próximos Servicios</h2>
                <p className="text-sm text-gray-600">Servicios programados próximamente para esta iglesia</p>
              </div>
              <div className="flex items-center gap-3">
                {canManage ? (
                  <Link
                    to="/services/new"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    <span>+ Programar servicio</span>
                  </Link>
                ) : null}
                <Link
                  to="/services"
                  className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Ver todos
                </Link>
              </div>
            </div>

            {upcomingServices.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-700">No hay servicios programados o activos en fechas futuras.</p>
                {canManage ? (
                  <Link
                    to="/services/new"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  >
                    + Crear primer servicio
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

