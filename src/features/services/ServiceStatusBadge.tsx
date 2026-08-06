import type { ServiceStatus } from '@/types/models'

const STYLES: Record<ServiceStatus, string> = {
  planned: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
}

const LABELS: Record<ServiceStatus, string> = {
  planned: 'Planeado',
  active: 'Activo',
  completed: 'Completado',
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
