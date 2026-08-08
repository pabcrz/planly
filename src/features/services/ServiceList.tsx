import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getServices } from '@/services/serviceService'
import type { ServiceFilters } from '@/services/serviceService'
import type { ServiceStatus } from '@/types/models'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { ServiceCard } from './ServiceCard'
import { Plus, Filter, RotateCcw } from 'lucide-react'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

export function ServiceList() {
  const { activeChurchId, activeMembership } = useChurch()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false

  const filters: ServiceFilters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter === 'all' ? undefined : (statusFilter as ServiceStatus),
    }),
    [dateFrom, dateTo, statusFilter],
  )

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services', activeChurchId, filters],
    queryFn: () => getServices(activeChurchId!, filters),
    enabled: !!activeChurchId,
  })

  // Calculate status counts from returned services or default
  const counts = useMemo(() => {
    const map = { all: services?.length || 0, planned: 0, active: 0, completed: 0 }
    services?.forEach((s) => {
      if (s.status in map) {
        map[s.status as keyof typeof map]++
      }
    })
    return map
  }, [services])

  const filterInputClass =
    'min-h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white'

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all'

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setStatusFilter('all')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios y eventos"
        description="Planificación y coordinación de reuniones y eventos congregacionales."
        action={
          canManage ? (
            <Link to="/services/new">
              <Button variant="primary" className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Nuevo servicio</span>
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start px-4 md:px-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <Filter className="h-4 w-4 text-indigo-600" />
              <span>Filtros</span>
            </span>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 gap-1 p-1 h-auto min-h-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpiar</span>
              </Button>
            ) : null}
          </div>

          {/* Status Tabs */}
          <div>
            <span className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Estado
            </span>
            <ul className="flex flex-col gap-1 text-sm">
              {[
                { id: 'all', label: 'Todos los servicios' },
                { id: 'planned', label: 'Planeados' },
                { id: 'active', label: 'En curso / Activos' },
                { id: 'completed', label: 'Completados' },
              ].map((item) => {
                const active = statusFilter === item.id
                const count = counts[item.id as keyof typeof counts] || 0
                return (
                  <li key={item.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStatusFilter(item.id)}
                      className={`w-full justify-between text-left ${
                        active ? 'bg-indigo-50 text-indigo-900 font-semibold' : ''
                      }`}
                    >
                      <span className="truncate text-left">{item.label}</span>
                      <span
                        className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full font-bold ${
                          active ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {count}
                      </span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Date Range */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <span className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Rango de Fechas
            </span>
            <div>
              <label htmlFor="service-date-from" className="block text-xs text-gray-600 mb-1">
                Desde
              </label>
              <input
                id="service-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={filterInputClass}
              />
            </div>
            <div>
              <label htmlFor="service-date-to" className="block text-xs text-gray-600 mb-1">
                Hasta
              </label>
              <input
                id="service-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={filterInputClass}
              />
            </div>
          </div>
        </aside>

        {/* Services Main List */}
        <main className="lg:col-span-3 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner />
            </div>
          ) : null}

          {error ? (
            <EmptyState title="No fue posible cargar los servicios" message="Intenta de nuevo." />
          ) : null}

          {services && services.length === 0 ? (
            <EmptyState
              title="No se encontraron servicios"
              message={
                canManage
                  ? 'Crea tu primer servicio para comenzar a preparar setlists.'
                  : 'No hay servicios que coincidan con los filtros seleccionados.'
              }
              action={
                canManage ? (
                  <Link to="/services/new">
                    <Button variant="primary" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Nuevo servicio</span>
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : null}

          {services?.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </main>
      </div>
    </div>
  )
}
