import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useChurch } from '@/app/providers/ChurchProvider'
import { changeStatus, createService, updateService } from '@/services/serviceService'
import { getChurchSettings, updateChurchServiceTypes } from '@/services/peopleService'
import type { ServiceWithTeam } from '@/services/serviceService'
import type { Service, ServiceStatus } from '@/types/models'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

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

interface ServiceFormProps {
  open: boolean
  churchId: string
  /** When provided the form edits this service; otherwise it creates a new one. */
  service?: ServiceWithTeam | null
  onClose: () => void
  onSaved?: (service: Service) => void
}

export function ServiceForm({ open, churchId, service, onClose, onSaved }: ServiceFormProps) {
  const { activeMembership } = useChurch()
  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false
  const isEdit = !!service
  const queryClient = useQueryClient()

  if (!canManage) return null

  const { data: settings } = useQuery({
    queryKey: ['church-settings', churchId],
    queryFn: () => getChurchSettings(churchId),
    enabled: !!churchId && open,
  })
  const configuredTypes = settings?.service_types && settings.service_types.length > 0 ? settings.service_types : ['general']

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

  useEffect(() => {
    if (!open) return
    setTeamId(service?.team_id ?? '')
    const currentType = service?.service_type ?? 'general'
    if (configuredTypes.includes(currentType)) {
      setServiceType(currentType)
      setCustomType('')
    } else if (currentType && currentType !== 'general') {
      setServiceType('nuevo')
      setCustomType(currentType)
    } else {
      setServiceType('general')
      setCustomType('')
    }
    setDirector(service?.director ?? '')
    setServiceDate(service?.service_date ?? '')
    setStartTime(service?.start_time?.slice(0, 5) ?? '')
    setNotes(service?.notes ?? '')
    setStatus(service?.status ?? 'planned')
    setFieldErrors({})
    setFormError(null)
  }, [open, service, configuredTypes])

  const mutation = useMutation({
    mutationFn: async () => {
      const finalType = serviceType === 'nuevo' ? customType.trim() : serviceType
      const actualType = finalType || 'general'

      if (serviceType === 'nuevo' && customType.trim()) {
        const newTypeClean = customType.trim()
        await updateChurchServiceTypes(churchId, [...configuredTypes, newTypeClean])
        await queryClient.invalidateQueries({ queryKey: ['church-settings', churchId] })
      }

      const input = {
        team_id: teamId || null,
        service_type: actualType,
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
    <Modal
      open={open}
      onClose={onClose}
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
          <label htmlFor="service-type" className={labelClass}>
            Tipo de servicio *
          </label>
          <select
            id="service-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className={inputClass}
          >
            {configuredTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'general' ? 'General (Predeterminado)' : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
            <option value="nuevo">+ Crear nuevo tipo de servicio...</option>
          </select>
          {fieldErrors.service_type ? <p className={errorClass}>{fieldErrors.service_type}</p> : null}
        </div>

        {serviceType === 'nuevo' ? (
          <div>
            <label htmlFor="service-type-custom" className={labelClass}>
              Nombre del nuevo tipo de servicio *
            </label>
            <input
              id="service-type-custom"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Ej. Reunión de Jóvenes, Discipulado, Culto de Oración"
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Route wrapper for /services/new: the form itself is a dialog so the same
// component can edit in place from the detail page.
export function NewServicePage() {
  const navigate = useNavigate()
  const { activeChurchId, activeMembership } = useChurch()
  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false

  if (!activeChurchId || !canManage) {
    return <Navigate to="/services" replace />
  }

  return (
    <ServiceForm
      open
      churchId={activeChurchId}
      onClose={() => navigate('/services')}
      onSaved={(service) => navigate(`/services/${service.id}`)}
    />
  )
}
