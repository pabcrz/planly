import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, Calendar, Clock, Users, UserCheck, FileText, 
  Play, CheckCircle, Edit2, Trash2, Music, Shield 
} from 'lucide-react'
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
const NEXT_STATUS: Partial<Record<ServiceStatus, { status: ServiceStatus; label: string; icon: any }>> = {
  planned: { status: 'active', label: 'Iniciar servicio (Activo)', icon: Play },
  active: { status: 'completed', label: 'Concluir servicio', icon: CheckCircle },
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
      <div className="p-6">
        <PageHeader title="Servicio" />
        <EmptyState title="No fue posible cargar el servicio" message="Intenta de nuevo." />
      </div>
    )
  }
  if (!service) return null

  const next = NEXT_STATUS[service.status]
  const serviceType = service.service_type || 'General'
  
  // Discover user's role in this specific service
  const myParticipation = participants?.find(p => p.membership_id === activeMembership?.id || (p as any).membership?.id === activeMembership?.id)

  return (
    <div className="pb-16 bg-gray-50/50 min-h-screen">
      {/* Top Navigation & Action Bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3.5 sm:px-6 md:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Servicios
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ServiceStatusBadge status={service.status} />
            {canManage && next ? (
              <button
                type="button"
                onClick={() => statusMutation.mutate(next.status)}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition-all"
              >
                <next.icon className="h-4 w-4" />
                {next.label}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100/80 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar servicio
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {actionError ? (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 md:px-8">
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{actionError}</p>
        </div>
      ) : null}

      {/* Main Service Dashboard (2-Column Layout) */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column: Principal Service Info Card */}
          <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex w-fit items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wider border border-indigo-100">
                    {serviceType}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {formatServiceDay(service.service_date)} · {service.director || 'Sin Director'}
                  </h1>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                    Editar
                  </button>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Fecha programada</p>
                    <p className="text-sm font-bold text-gray-900">{formatServiceDateOnly(service.service_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Horario y Equipo</p>
                    <p className="text-sm font-bold text-gray-900">{formatServiceTime(service.start_time)} hrs · {service.team.name}</p>
                  </div>
                </div>
              </div>

              {service.notes ? (
                <div className="mt-5 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-sm text-gray-700 flex items-start gap-2.5">
                  <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-amber-900 block mb-1">Notas del servicio:</span>
                    <p className="text-amber-950 leading-relaxed text-xs sm:text-sm">{service.notes}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Column: Sidebar Cards (My Role & Team Summary) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Card 1: Mi rol en este servicio */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mi Asignación</span>
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                </div>
                {myParticipation && myParticipation.roles.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-600 font-medium">Tienes los siguientes roles en este servicio:</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {myParticipation.roles.map(r => (
                        <span key={r.role} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200/60 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs">
                          <Shield className="h-3.5 w-3.5 text-indigo-500" />
                          {r.role}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col gap-1 text-center sm:text-left">
                    <p className="text-sm font-semibold text-gray-700">Sin rol asignado</p>
                    <p className="text-xs text-gray-400">No tienes un turno o instrumento asignado en este servicio.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Resumen del Equipo */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Participantes</span>
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-gray-900">{participants?.length ?? 0}</span>
                  <span className="text-xs text-gray-500 font-medium">miembros en el equipo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('participants')}
                className="mt-4 w-full rounded-xl bg-gray-50 hover:bg-gray-100 py-2.5 text-center text-xs font-bold text-gray-700 transition-colors border border-gray-200/80"
              >
                Ver lista completa y roles
              </button>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Bar (No Emojis, Clean Lucide Icons) */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('setlist')}
              className={`py-3.5 px-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'setlist'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Music className="h-4 w-4" />
              <span>Orden del servicio (Setlist)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`py-3.5 px-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'participants'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Participantes y Roles</span>
              <span className="ml-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 font-semibold">
                {participants ? participants.length : 0}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content Section */}
        <div className="bg-transparent">
          {activeTab === 'setlist' ? (
            setlist ? (
              <SetlistEditor setlist={setlist} canManage={canManage} />
            ) : (
              <section className="py-6">
                <EmptyState title="No hay setlist" message="Este servicio aún no tiene un setlist configurado." />
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
        message="¿Estás seguro de eliminar este servicio? Se borrará el setlist y las asignaciones del equipo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

