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

type FieldErrors = Partial<Record<'team_id' | 'service_date' | 'start_time' | 'timezone' | 'notes', string>>

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
  const { activeMembership } = useChurch()

  const [teamId, setTeamId] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [timezone, setTimezone] = useState('')
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
    setServiceDate(service?.service_date ?? '')
    setStartTime(service?.start_time?.slice(0, 5) ?? '')
    setTimezone(service?.timezone ?? activeMembership?.church.timezone ?? '')
    setNotes(service?.notes ?? '')
    setStatus(service?.status ?? 'planned')
    setFieldErrors({})
    setFormError(null)
  }, [open, service, activeMembership])

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        team_id: teamId,
        service_date: serviceDate,
        start_time: startTime,
        timezone,
        notes: notes.trim() || null,
      }
      if (isEdit) {
        const updated = await updateService(service.id, input)
        // Status transitions go through changeStatus, which enforces the
        // forward-only planned → active → completed flow.
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
        setFormError(error instanceof Error ? error.message : 'Something went wrong')
      }
    },
  })

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700'
  const errorClass = 'mt-1 text-xs text-red-600'

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/40"
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          setFieldErrors({})
          setFormError(null)
          mutation.mutate()
        }}
      >
        <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit service' : 'New service'}</h2>

        <div>
          <label htmlFor="service-team" className={labelClass}>
            Team *
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
              <option value="">Select a team</option>
              {teams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.team_id ? <p className={errorClass}>{fieldErrors.team_id}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="service-date" className={labelClass}>
              Date *
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
              Start time *
            </label>
            <input
              id="service-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
              required
            />
            {fieldErrors.start_time ? <p className={errorClass}>{fieldErrors.start_time}</p> : null}
          </div>
        </div>

        <div>
          <label htmlFor="service-timezone" className={labelClass}>
            Timezone *
          </label>
          <input
            id="service-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/Argentina/Buenos_Aires"
            className={inputClass}
            required
          />
          {fieldErrors.timezone ? <p className={errorClass}>{fieldErrors.timezone}</p> : null}
        </div>

        {isEdit ? (
          <div>
            <label htmlFor="service-status" className={labelClass}>
              Status
            </label>
            <select
              id="service-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceStatus)}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="service-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="service-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.notes ? <p className={errorClass}>{fieldErrors.notes}</p> : null}
        </div>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
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
