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
import { formatServiceDay, formatServiceDateOnly, formatServiceTime } from './serviceFormat'
import { SetlistEditor } from './SetlistEditor'
import { ParticipantList } from './ParticipantList'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

// Forward-only status flow (spec: service-edit-and-status-transition).
const NEXT_STATUS: Partial<Record<ServiceStatus, { status: ServiceStatus; label: string }>> = {
  planned: { status: 'active', label: 'Marcar como activo' },
  active: { status: 'completed', label: 'Marcar como completado' },
}

export function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeChurchId, activeMembership } = useChurch()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'setlist' | 'participants'>('setlist')

  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false
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
    onError: () => setActionError('No se pudo cambiar el estado del servicio.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] })
      navigate('/services')
    },
    onError: () => {
      setDeleteOpen(false)
      setActionError('No se pudo eliminar el servicio.')
    },
  })

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return (
      <div>
        <PageHeader title="Servicio" />
        <EmptyState title="No fue posible cargar el servicio" message="Intenta de nuevo." />
      </div>
    )
  }
  if (!service) return null

  const next = NEXT_STATUS[service.status]
  const serviceType = service.service_type || 'General'

  return (
    <div>
      <PageHeader
        title={`${formatServiceDay(service.service_date)}, ${formatServiceDateOnly(service.service_date)} · ${formatServiceTime(service.start_time)} hrs`}
        description={`Equipo: ${service.team.name} ${service.director ? `· Director: ${service.director}` : ''} · Tipo: ${serviceType.toUpperCase()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ServiceStatusBadge status={service.status} />
            <Link
              to="/services"
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Volver
            </Link>
            {canManage && next ? (
              <button
                type="button"
                onClick={() => statusMutation.mutate(next.status)}
                disabled={statusMutation.isPending}
                className="inline-flex min-h-11 items-center rounded-md bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {next.label}
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Editar
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex min-h-11 items-center rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 shadow-sm transition-colors"
              >
                Eliminar
              </button>
            ) : null}
          </div>
        }
      />

      {service.notes ? (
        <p className="mx-4 mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 md:mx-6 max-w-6xl">
          <span className="font-semibold text-gray-900">Notas:</span> {service.notes}
        </p>
      ) : null}
      {actionError ? <p className="px-4 pb-2 text-sm text-red-600 md:px-6">{actionError}</p> : null}

      <div className="mx-4 mb-6 md:mx-6 max-w-6xl border-b border-gray-200">
        <nav className="flex gap-8 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('setlist')}
            className={`py-3 px-1 border-b-2 font-bold text-sm min-h-11 transition-colors ${
              activeTab === 'setlist'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎵 Setlist y Canciones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`py-3 px-1 border-b-2 font-bold text-sm min-h-11 transition-colors ${
              activeTab === 'participants'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            👥 Participantes y Roles ({participants ? participants.length : 0})
          </button>
        </nav>
      </div>

      <div className="max-w-6xl">
        {activeTab === 'setlist' ? (
          setlist ? (
            <SetlistEditor setlist={setlist} canManage={canManage} />
          ) : (
            <section className="px-4 pb-6 md:px-6">
              <EmptyState title="No hay setlist" message="Este servicio aún no tiene un setlist." />
            </section>
          )
        ) : (
          participants ? (
            <ParticipantList serviceId={service.id} participants={participants} canManage={canManage} />
          ) : (
            <LoadingSpinner />
          )
        )}
      </div>

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
        title="Eliminar servicio"
        message="¿Eliminar este servicio? Se eliminarán su setlist, elementos y participantes. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
