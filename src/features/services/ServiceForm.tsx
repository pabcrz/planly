import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { useChurch } from '@/app/providers/ChurchProvider'
import { changeStatus, createService, updateService } from '@/services/serviceService'
import type { ServiceWithTeam } from '@/services/serviceService'
import { getTeams } from '@/services/teamService'
import type { Service, ServiceStatus } from '@/types/models'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type FieldErrors = Partial<Record<'team_id' | 'service_date' | 'start_time' | 'notes' | 'director' | 'service_type', string>>

function toFieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ZodError)) return null
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && field in errors === false) {
      errors[field as keyof FieldErrors] = issue.message
    }
  }
  return errors
}

const STATUSES: ServiceStatus[] = ['planned', 'active', 'completed']
const TIME_ZONE = 'America/Mexico_City'

const TIME_INTERVALS: string[] = []
for (let h = 6; h <= 22; h++) {
  const hourStr = h.toString().padStart(2, '0')
  TIME_INTERVALS.push(`${hourStr}:00`, `${hourStr}:30`)
}
TIME_INTERVALS.push('23:00')

const DEFAULT_SERVICE_TYPES = ['general', 'domingo', 'jueves', 'viernes', 'especial', 'otro']

interface ServiceFormProps {
  open: boolean
  churchId: string
  /** When provided the form edits this service; otherwise it creates a new one. */
  service?: ServiceWithTeam | null
  onClose: () => void
  onSaved?: (service: Service) => void
}

export function ServiceForm({ open, churchId, service, onClose, onSaved }: ServiceFormProps) {
  const isEdit = !!service
  const dialogRef = useRef<HTMLDialogElement>(null)
  const queryClient = useQueryClient()

  const [teamId, setTeamId] = useState('')
  const [serviceType, setServiceType] = useState('general')
  const [customType, setCustomType] = useState('')
  const [director, setDirector] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ServiceStatus>('planned')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', churchId],
    queryFn: () => getTeams(churchId),
    enabled: open,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    setTeamId(service?.team_id ?? '')
    const currentType = service?.service_type ?? 'general'
    if (DEFAULT_SERVICE_TYPES.includes(currentType)) {
      setServiceType(currentType)
      setCustomType('')
    } else {
      setServiceType('otro')
      setCustomType(currentType)
    }
    setDirector(service?.director ?? '')
    setServiceDate(service?.service_date ?? '')
    setStartTime(service?.start_time?.slice(0, 5) ?? '')
    setNotes(service?.notes ?? '')
    setStatus(service?.status ?? 'planned')
    setFieldErrors({})
    setFormError(null)
  }, [open, service])

  const mutation = useMutation({
    mutationFn: async () => {
      const actualType = serviceType === 'otro' ? customType.trim() || 'general' : serviceType
      const input = {
        team_id: teamId,
        service_type: actualType || 'general',
        service_date: serviceDate,
        start_time: startTime,
        director: director.trim() || null,
        timezone: TIME_ZONE,
        notes: notes.trim() || null,
      }
      if (isEdit) {
        const updated = await updateService(service.id, input)
        if (status !== service.status) await changeStatus(service.id, status)
        return updated
      }
      return createService({ ...input, church_id: churchId })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['services'] })
      await queryClient.invalidateQueries({ queryKey: ['service'] })
      onSaved?.(saved)
      onClose()
    },
    onError: (error) => {
      const zodErrors = toFieldErrors(error)
      if (zodErrors) {
        setFieldErrors(zodErrors)
        setFormError(null)
      } else {
        setFieldErrors({})
        setFormError('No se pudo guardar el servicio. Intenta de nuevo.')
      }
    },
  })

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-700'
  const errorClass = 'mt-1 text-xs text-red-600'

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="w-full max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-black/40 border border-gray-100"
    >
      <form
        className="flex flex-col gap-5 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          setFieldErrors({})
          setFormError(null)
          mutation.mutate()
        }}
      >
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
          {isEdit ? 'Editar servicio' : 'Nuevo servicio'}
        </h2>

        <div>
          <label htmlFor="service-team" className={labelClass}>
            Equipo *
          </label>
          {teamsLoading ? (
            <LoadingSpinner />
          ) : (
            <select
              id="service-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Selecciona un equipo</option>
              {teams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.team_id ? <p className={errorClass}>{fieldErrors.team_id}</p> : null}
        </div>

        <div>
          <label htmlFor="service-type" className={labelClass}>
            Tipo de servicio *
          </label>
          <select
            id="service-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className={inputClass}
          >
            <option value="general">General</option>
            <option value="domingo">Domingo</option>
            <option value="jueves">Jueves</option>
            <option value="viernes">Viernes</option>
            <option value="especial">Especial</option>
            <option value="otro">Otro (personalizado)...</option>
          </select>
          {fieldErrors.service_type ? <p className={errorClass}>{fieldErrors.service_type}</p> : null}
        </div>

        {serviceType === 'otro' ? (
          <div>
            <label htmlFor="service-type-custom" className={labelClass}>
              Nombre del tipo personalizado *
            </label>
            <input
              id="service-type-custom"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Ej. Congreso, Vigilia, Jóvenes"
              className={inputClass}
              required
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="service-date" className={labelClass}>
              Fecha *
            </label>
            <input
              id="service-date"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className={inputClass}
              required
            />
            {fieldErrors.service_date ? <p className={errorClass}>{fieldErrors.service_date}</p> : null}
          </div>
          <div>
            <label htmlFor="service-time" className={labelClass}>
              Hora de inicio *
            </label>
            <select
              id="service-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Selecciona la hora</option>
              {!TIME_INTERVALS.includes(startTime) && startTime ? (
                <option value={startTime}>{startTime}</option>
              ) : null}
              {TIME_INTERVALS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {fieldErrors.start_time ? <p className={errorClass}>{fieldErrors.start_time}</p> : null}
          </div>
        </div>

        <div>
          <label htmlFor="service-director" className={labelClass}>
            Director de servicio / Alabanza
          </label>
          <input
            id="service-director"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            placeholder="Ej. Pastor Juan, Marcos..."
            className={inputClass}
          />
          {fieldErrors.director ? <p className={errorClass}>{fieldErrors.director}</p> : null}
        </div>

        {isEdit ? (
          <div>
            <label htmlFor="service-status" className={labelClass}>
              Estado
            </label>
            <select
              id="service-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceStatus)}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {{ planned: 'Planeado', active: 'Activo', completed: 'Completado' }[s]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="service-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="service-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.notes ? <p className={errorClass}>{fieldErrors.notes}</p> : null}
        </div>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="min-h-11 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// Route wrapper for /services/new: the form itself is a dialog so the same
// component can edit in place from the detail page.
export function NewServicePage() {
  const navigate = useNavigate()
  const { activeChurchId } = useChurch()
  if (!activeChurchId) return null
  return (
    <ServiceForm
      open
      churchId={activeChurchId}
      onClose={() => navigate('/services')}
      onSaved={(service) => navigate(`/services/${service.id}`)}
    />
  )
}
