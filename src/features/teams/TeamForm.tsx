import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

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
        <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit team' : 'New team'}</h2>

        <div>
          <label htmlFor="team-name" className={labelClass}>
            Name *
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
            Description
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
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create team'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
