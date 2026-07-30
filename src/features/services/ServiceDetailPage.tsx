import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import {
  changeStatus,
  deleteService,
  getParticipants,
  getService,
  getSetlist,
} from '@/services/serviceService'
import type { ServiceStatus } from '@/types/models'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ServiceForm } from './ServiceForm'
import { ServiceStatusBadge } from './ServiceStatusBadge'
import { formatServiceDate, formatServiceTime } from './serviceFormat'
import { SetlistEditor } from './SetlistEditor'
import { ParticipantList } from './ParticipantList'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

// Forward-only status flow (spec: service-edit-and-status-transition).
const NEXT_STATUS: Partial<Record<ServiceStatus, { status: ServiceStatus; label: string }>> = {
  planned: { status: 'active', label: 'Mark active' },
  active: { status: 'completed', label: 'Mark completed' },
}

export function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeChurchId, activeMembership } = useChurch()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false
  // Spec: service deletion is church_admin-only (RLS services_delete_admin).
  const canDelete = activeMembership?.role === 'church_admin'

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service', id],
    queryFn: () => getService(id!),
    enabled: !!id,
  })

  const { data: setlist } = useQuery({
    queryKey: ['setlist', 'service', id],
    queryFn: () => getSetlist(id!),
    enabled: !!id,
  })

  const { data: participants } = useQuery({
    queryKey: ['participants', id],
    queryFn: () => getParticipants(id!),
    enabled: !!id,
  })

  const invalidateService = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service', id] })
    await queryClient.invalidateQueries({ queryKey: ['services'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: ServiceStatus) => changeStatus(id!, status),
    onSuccess: invalidateService,
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not change status'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] })
      navigate('/services')
    },
    onError: (err) => {
      setDeleteOpen(false)
      setActionError(err instanceof Error ? err.message : 'Could not delete service')
    },
  })

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return (
      <div>
        <PageHeader title="Service" />
        <EmptyState title="Could not load service" message={error.message} />
      </div>
    )
  }
  if (!service) return null

  const next = NEXT_STATUS[service.status]

  return (
    <div>
      <PageHeader
        title={`${formatServiceDate(service.service_date)} · ${formatServiceTime(service.start_time)}`}
        description={`${service.team.name} · ${service.timezone}`}
        action={
          <>
            <ServiceStatusBadge status={service.status} />
            <Link
              to="/services"
              className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </Link>
            {canManage && next ? (
              <button
                type="button"
                onClick={() => statusMutation.mutate(next.status)}
                disabled={statusMutation.isPending}
                className="inline-flex min-h-11 items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {next.label}
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex min-h-11 items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            ) : null}
          </>
        }
      />

      {service.notes ? (
        <p className="mx-4 mb-4 rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-600 md:mx-6">{service.notes}</p>
      ) : null}
      {actionError ? <p className="px-4 pb-2 text-sm text-red-600 md:px-6">{actionError}</p> : null}

      {setlist ? (
        <SetlistEditor setlist={setlist} canManage={canManage} />
      ) : (
        <section className="px-4 pb-6 md:px-6">
          <EmptyState title="No setlist" message="This service has no setlist yet." />
        </section>
      )}

      {participants ? (
        <ParticipantList serviceId={service.id} participants={participants} canManage={canManage} />
      ) : (
        <LoadingSpinner />
      )}

      {activeChurchId ? (
        <ServiceForm
          open={editOpen}
          churchId={activeChurchId}
          service={service}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete service"
        message="Delete this service? Its setlist, items, and participant roster will be removed. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
