import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getServices } from '@/services/serviceService'
import type { ServiceFilters } from '@/services/serviceService'
import { getTeams } from '@/services/teamService'
import type { ServiceStatus } from '@/types/models'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ServiceCard } from './ServiceCard'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])
const STATUSES: ServiceStatus[] = ['planned', 'active', 'completed']

export function ServiceList() {
  const { activeChurchId, activeMembership } = useChurch()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [teamId, setTeamId] = useState('')
  const [status, setStatus] = useState('')

  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false

  const filters: ServiceFilters = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    teamId: teamId || undefined,
    status: (status || undefined) as ServiceStatus | undefined,
  }

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services', activeChurchId, filters],
    queryFn: () => getServices(activeChurchId!, filters),
    enabled: !!activeChurchId,
  })

  const { data: teams } = useQuery({
    queryKey: ['teams', activeChurchId],
    queryFn: () => getTeams(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const filterClass =
    'min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white shadow-sm'

  const statusLabels: Record<ServiceStatus, string> = {
    planned: 'Planeados',
    active: 'Activos',
    completed: 'Completados',
  }

  return (
    <div>
      <PageHeader
        title="Servicios y eventos"
        description="Administra los servicios, ensayos y eventos programados para tus equipos."
        action={
          canManage ? (
            <Link
              to="/services/new"
              className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Nuevo servicio
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3 px-4 pb-5 md:px-6 max-w-5xl">
        <input
          type="date"
          aria-label="Fecha desde"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={filterClass}
        />
        <input
          type="date"
          aria-label="Fecha hasta"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={filterClass}
        />
        <select
          aria-label="Filtrar por equipo"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className={filterClass}
        >
          <option value="">Todos los equipos</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={filterClass}
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-12 md:px-6 max-w-5xl">
        {isLoading ? <LoadingSpinner /> : null}
        {error ? <EmptyState title="No fue posible cargar los servicios" message="Intenta de nuevo." /> : null}
        {services && services.length === 0 ? (
          <EmptyState
            title="No se encontraron servicios"
            message={canManage ? 'Crea tu primer servicio para comenzar a preparar setlists.' : 'No hay servicios que coincidan con los filtros actuales.'}
            action={
              canManage ? (
                <Link
                  to="/services/new"
                  className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Nuevo servicio
                </Link>
              ) : undefined
            }
          />
        ) : null}
        {services?.map((service) => <ServiceCard key={service.id} service={service} />)}
      </div>
    </div>
  )
}
