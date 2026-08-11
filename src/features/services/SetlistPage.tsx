import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getService, getSetlistById } from '@/services/serviceService'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatServiceDate, formatServiceTime } from './serviceFormat'
import { SetlistEditor } from './SetlistEditor'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

// Standalone setlist route (/setlists/:id): same editor as the service detail
// page, with a link back to the parent service.
export function SetlistPage() {
  const { id } = useParams()
  const { activeMembership } = useChurch()
  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false

  const { data: setlist, isLoading, error } = useQuery({
    queryKey: ['setlist', id],
    queryFn: () => getSetlistById(id!),
    enabled: !!id,
  })

  const { data: service } = useQuery({
    queryKey: ['service', setlist?.service_id],
    queryFn: () => getService(setlist!.service_id),
    enabled: !!setlist,
  })

  if (isLoading) return <LoadingSpinner />
  if (error || !setlist) {
    return (
      <div>
        <PageHeader title="Setlist" />
        <EmptyState title="No fue posible cargar el setlist" message="Intenta de nuevo." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={service ? `${formatServiceDate(service.service_date)} · ${formatServiceTime(service.start_time)}` : 'Setlist'}
        description={service ? service.service_type : undefined}
        action={
          <Link
            to={service ? `/services/${service.id}` : '/services'}
            className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Volver al servicio
          </Link>
        }
      />
      <SetlistEditor setlist={setlist} canManage={canManage} />
    </div>
  )
}
