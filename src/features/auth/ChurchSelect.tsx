import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { PageHeader } from '@/components/shared/PageHeader'
import { createChurch } from '@/services/authService'

const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
]

const inputClass =
  'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ChurchSelect() {
  const { memberships, refreshMemberships } = useAuth()
  const { setActiveChurch } = useChurch()
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const slug = useMemo(() => deriveSlug(name), [name])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const church = await createChurch({ name: name.trim(), slug, timezone })
      await refreshMemberships()
      setActiveChurch(church.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create church')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Your churches" description="Select a church to work with, or create a new one." />

      <div className="grid gap-6 px-4 pb-6 md:grid-cols-2 md:px-6">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Memberships</h2>
          {memberships.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              You are not a member of any church yet. To join an existing church, ask its admin to add your
              account — it will show up here.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {memberships.map((membership) => (
                <li key={membership.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChurch(membership.church_id)}
                    className="flex min-h-11 w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{membership.church.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {membership.role.replace('_', ' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => void refreshMemberships()}
            className="mt-4 min-h-11 rounded-md px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Refresh list
          </button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Create a new church</h2>
          <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-4">
            {error ? (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Church name
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Grace Community Church"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Slug
              <input type="text" readOnly value={slug} aria-readonly className={`${inputClass} bg-gray-50`} />
              <span className="text-xs font-normal text-gray-500">Auto-derived from the name</span>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Timezone
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className={inputClass}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || slug.length < 2}
              className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create church'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
