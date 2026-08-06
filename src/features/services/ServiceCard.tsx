import { Link } from 'react-router-dom'
import type { ServiceWithTeam } from '@/services/serviceService'
import { ServiceStatusBadge } from './ServiceStatusBadge'
import { formatServiceDay, formatServiceDateOnly, formatServiceTime } from './serviceFormat'

export function ServiceCard({ service }: { service: ServiceWithTeam }) {
  const serviceType = service.service_type || 'General'

  return (
    <Link
      to={`/services/${service.id}`}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
            {serviceType}
          </span>
          <h3 className="text-base font-bold text-gray-900">
            {formatServiceDay(service.service_date)}, {formatServiceDateOnly(service.service_date)} · {formatServiceTime(service.start_time)} hrs
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600 font-medium">
          <span className="flex items-center gap-1">
            <span className="text-gray-400">Equipo:</span> {service.team.name}
          </span>
          {service.director ? (
            <span className="flex items-center gap-1">
              <span className="text-gray-400">Director:</span> <span className="font-semibold text-gray-800">{service.director}</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="self-start sm:self-center shrink-0">
        <ServiceStatusBadge status={service.status} />
      </div>
    </Link>
  )
}
