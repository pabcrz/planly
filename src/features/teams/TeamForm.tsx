import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { createTeam, updateTeam } from '@/services/teamService'
import type { Team } from '@/types/models'

type FieldErrors = Partial<Record<'name' | 'description', string>>

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

interface TeamFormProps {
  open: boolean
  churchId: string
  /** When provided the form edits this team; otherwise it creates a new one. */
  team?: Team | null
  onClose: () => void
}

export function TeamForm({ open, churchId, team, onClose }: TeamFormProps) {
  const isEdit = !!team
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setDescription(team?.description ?? '')
    setFieldErrors({})
    setFormError(null)
  }, [open, team])

  const mutation = useMutation({
    mutationFn: async () => {
      const input = { name, description: description.trim() || null }
      if (isEdit) return updateTeam(team.id, input)
      return createTeam({ ...input, church_id: churchId })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
      await queryClient.invalidateQueries({ queryKey: ['team'] })
      onClose()
    },
    onError: (error) => {
      const zodErrors = toFieldErrors(error)
      if (zodErrors) {
        setFieldErrors(zodErrors)
        setFormError(null)
      } else {
        setFieldErrors({})
        setFormError('No se pudo guardar el equipo. Intenta de nuevo.')
      }
    },
  })

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700'
  const errorClass = 'mt-1 text-xs text-red-600'

  return (
    <Modal
      open={open}
      onClose={onClose}
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
        <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Editar equipo' : 'Nuevo equipo'}</h2>

        <div>
          <label htmlFor="team-name" className={labelClass}>
            Nombre *
          </label>
          <input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
          {fieldErrors.name ? <p className={errorClass}>{fieldErrors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="team-description" className={labelClass}>
            Descripción
          </label>
          <textarea
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.description ? <p className={errorClass}>{fieldErrors.description}</p> : null}
        </div>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex justify-end gap-3">
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
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear equipo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
