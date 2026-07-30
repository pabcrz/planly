import { Link } from 'react-router-dom'
import type { ServiceWithTeam } from '@/services/serviceService'
import { ServiceStatusBadge } from './ServiceStatusBadge'
import { formatServiceDate, formatServiceTime } from './serviceFormat'

export function ServiceCard({ service }: { service: ServiceWithTeam }) {
  return (
    <Link
      to={`/services/${service.id}`}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {formatServiceDate(service.service_date)} · {formatServiceTime(service.start_time)}
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-500">{service.team.name}</p>
      </div>
      <ServiceStatusBadge status={service.status} />
    </Link>
  )
}
