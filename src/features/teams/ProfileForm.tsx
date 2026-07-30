import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getPerson, upsertProfile } from '@/services/peopleService'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type FieldErrors = Partial<Record<'display_name' | 'instruments' | 'musical_roles', string>>

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

function toList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ProfileForm() {
  const { user } = useAuth()
  const { activeMembership } = useChurch()
  const queryClient = useQueryClient()
  const membershipId = activeMembership?.id

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', membershipId],
    queryFn: () => getPerson(membershipId!),
    enabled: !!membershipId,
  })

  const defaultDisplayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Member'

  const [displayName, setDisplayName] = useState('')
  const [instruments, setInstruments] = useState('')
  const [musicalRoles, setMusicalRoles] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Spec (profile-auto-creation): the first visit to /profile creates the
  // people row with a default display_name if none exists yet.
  const autoCreateStarted = useRef(false)
  useEffect(() => {
    if (person !== null || !membershipId || autoCreateStarted.current) return
    autoCreateStarted.current = true
    upsertProfile({ membership_id: membershipId, display_name: defaultDisplayName })
      .then(() => queryClient.invalidateQueries({ queryKey: ['person', membershipId] }))
      .catch(() => {
        // Fall back to create-on-first-save; the form still upserts.
        autoCreateStarted.current = false
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, membershipId])

  // Populate the form once the profile loads. With no profile yet, prefill the
  // default display name; the first save upserts the people row.
  useEffect(() => {
    if (person === undefined) return
    setDisplayName(person?.display_name ?? defaultDisplayName)
    setInstruments(person?.instruments.join(', ') ?? '')
    setMusicalRoles(person?.musical_roles.join(', ') ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person])

  const mutation = useMutation({
    mutationFn: () =>
      upsertProfile({
        membership_id: membershipId!,
        display_name: displayName,
        instruments: toList(instruments),
        musical_roles: toList(musicalRoles),
      }),
    onSuccess: async () => {
      setSaved(true)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['person', membershipId] })
      await queryClient.invalidateQueries({ queryKey: ['people'] })
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => {
      setSaved(false)
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

  if (isLoading) return <LoadingSpinner />

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700'
  const errorClass = 'mt-1 text-xs text-red-600'

  return (
    <div>
      <PageHeader title="Profile" description="How other church members see you." />
      <form
        className="flex max-w-xl flex-col gap-4 px-4 pb-6 md:px-6"
        onSubmit={(e) => {
          e.preventDefault()
          setFieldErrors({})
          setFormError(null)
          setSaved(false)
          mutation.mutate()
        }}
      >
        <div>
          <label htmlFor="display_name" className={labelClass}>
            Display name *
          </label>
          <input
            id="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            required
          />
          {fieldErrors.display_name ? <p className={errorClass}>{fieldErrors.display_name}</p> : null}
        </div>

        <div>
          <label htmlFor="instruments" className={labelClass}>
            Instruments (comma-separated)
          </label>
          <input
            id="instruments"
            value={instruments}
            onChange={(e) => setInstruments(e.target.value)}
            placeholder="Guitarra acústica, Bajo"
            className={inputClass}
          />
          {fieldErrors.instruments ? <p className={errorClass}>{fieldErrors.instruments}</p> : null}
        </div>

        <div>
          <label htmlFor="musical_roles" className={labelClass}>
            Musical roles (comma-separated)
          </label>
          <input
            id="musical_roles"
            value={musicalRoles}
            onChange={(e) => setMusicalRoles(e.target.value)}
            placeholder="Vocalista, Líder"
            className={inputClass}
          />
          {fieldErrors.musical_roles ? <p className={errorClass}>{fieldErrors.musical_roles}</p> : null}
        </div>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
        {saved ? <p className="text-sm text-emerald-600">Profile saved.</p> : null}

        <div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
