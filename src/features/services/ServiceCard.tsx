import { Link } from 'react-router-dom'
import { Clock, Users, UserCheck, ChevronRight } from 'lucide-react'
import type { ServiceWithTeam } from '@/services/serviceService'
import { ServiceStatusBadge } from './ServiceStatusBadge'
import { formatServiceDay, formatServiceDateOnly, formatServiceTime } from './serviceFormat'

export function ServiceCard({ service }: { service: ServiceWithTeam }) {
  const serviceType = service.service_type || 'General'

  return (
    <Link
      to={`/services/${service.id}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 hover:border-indigo-400 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col gap-2.5 min-w-0 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wider border border-indigo-100">
            {serviceType}
          </span>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
            <span className="capitalize">{formatServiceDay(service.service_date)}</span>
            <span className="text-gray-300">·</span>
            <span>{formatServiceDateOnly(service.service_date)}</span>
          </h3>
          <ServiceStatusBadge status={service.status} />
        </div>
        
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600 font-medium">
          <span className="flex items-center gap-1.5 text-gray-700">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>{formatServiceTime(service.start_time)} hrs</span>
          </span>
          <span className="flex items-center gap-1.5 text-gray-700">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-400">Equipo:</span> 
            <span className="font-semibold text-gray-800">{service.team?.name ?? 'Ninguno'}</span>
          </span>
          {service.director ? (
            <span className="flex items-center gap-1.5 text-gray-700">
              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-gray-400">Director:</span> 
              <span className="font-semibold text-indigo-950">{service.director}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end shrink-0">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
          Ver detalles
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

