import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toastPromise } from '@/lib/toast'
import { adminApi } from '@/services/adminService'
import { Button } from '@/components/ui/Button'

function slugify(value: string) { return value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

export function CreateChurchForm({ users, onComplete }: { users: { id: string; email: string | null }[]; onComplete: () => void }) {
  const [name, setName] = useState('')
  const [founder, setFounder] = useState(users[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const slug = useMemo(() => slugify(name), [name])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2 || slug.length < 2 || !founder) { setError('Completa los campos obligatorios.'); return }
    setError(null); setSubmitting(true)
    try {
      await toastPromise(adminApi.createChurch(name.trim(), slug, founder), { loading: 'Creando iglesia...', success: 'Iglesia creada.' })
      setName(''); onComplete()
    } finally { setSubmitting(false) }
  }
  return <form onSubmit={submit} noValidate className="grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:grid-cols-3">
    <label className="text-sm font-medium text-gray-700">Nombre<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3 py-2" />{error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}</label>
    <label className="text-sm font-medium text-gray-700">Slug<input value={slug} readOnly className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" /></label>
    <label className="text-sm font-medium text-gray-700">Administrador fundador<select value={founder} onChange={(event) => setFounder(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3 py-2">{users.map((user) => <option key={user.id} value={user.id}>{user.email ?? user.id}</option>)}</select></label>
    <p className="text-xs text-gray-500 md:col-span-2">Zona horaria: America/Mexico_City</p><Button disabled={submitting} variant="primary">Crear iglesia</Button>
  </form>
}
