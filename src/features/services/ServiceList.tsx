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
    'min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <div>
      <PageHeader
        title="Services"
        action={
          canManage ? (
            <Link
              to="/services/new"
              className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New service
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 px-4 pb-4 md:px-6">
        <input
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={filterClass}
        />
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={filterClass}
        />
        <select
          aria-label="Filter by team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className={filterClass}
        >
          <option value="">All teams</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={filterClass}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-6 md:px-6">
        {isLoading ? <LoadingSpinner /> : null}
        {error ? <EmptyState title="Could not load services" message={error.message} /> : null}
        {services && services.length === 0 ? (
          <EmptyState
            title="No services found"
            message={canManage ? 'Create your first service to start building setlists.' : 'No services match the current filters.'}
          />
        ) : null}
        {services?.map((service) => <ServiceCard key={service.id} service={service} />)}
      </div>
    </div>
  )
}
