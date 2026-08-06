import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ChurchRole } from '@/types/models'
import { adminApi } from '@/services/adminService'
import { toastPromise, toastSuccess } from '@/lib/toast'

const roles: ChurchRole[] = ['member', 'worship_director', 'church_admin']
const inputClass = 'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm'

export function InviteUserForm({ churchIds, onComplete }: { churchIds: string[]; onComplete: () => void }) {
  const [email, setEmail] = useState('')
  const [churchId, setChurchId] = useState(churchIds[0] ?? '')
  const [role, setRole] = useState<ChurchRole>('member')
  const [errors, setErrors] = useState<{ email?: string; church?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = {
      email: /^\S+@\S+\.\S+$/.test(email) ? undefined : 'Ingresa un correo electrónico válido.',
      church: churchId ? undefined : 'Selecciona una iglesia.',
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.church) return
    setSubmitting(true)
    setGeneratedLink(null)
    try {
      const result = await toastPromise(adminApi.inviteUser(email.trim(), churchId, role), {
        loading: 'Enviando invitación...',
        success: 'Invitación procesada.',
      })
      if (result.action_link) {
        setGeneratedLink(result.action_link)
        onComplete()
      } else {
        setEmail('')
        onComplete()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate className="grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">Correo electrónico
          <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} aria-invalid={Boolean(errors.email)} />
          {errors.email ? <span className="mt-1 block text-xs text-red-700">{errors.email}</span> : null}
        </label>
        <label className="text-sm font-medium text-gray-700">Iglesia
          <select value={churchId} onChange={(event) => setChurchId(event.target.value)} className={inputClass} aria-invalid={Boolean(errors.church)}>
            <option value="">Selecciona una iglesia</option>
            {churchIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          {errors.church ? <span className="mt-1 block text-xs text-red-700">{errors.church}</span> : null}
        </label>
        <label className="text-sm font-medium text-gray-700">Rol
          <select value={role} onChange={(event) => setRole(event.target.value as ChurchRole)} className={inputClass}>
            {roles.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
          </select>
        </label>
        <button type="submit" disabled={submitting} className="mt-5 min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Invitar usuario
        </button>
      </form>
      {generatedLink ? (
        <div className="rounded-xl bg-indigo-50 p-4 shadow-sm ring-1 ring-indigo-200">
          <p className="text-sm font-semibold text-indigo-950">Enlace de invitación generado exitosamente:</p>
          <p className="mt-1 text-xs text-indigo-800">Copia este enlace y envíalo por WhatsApp o mensaje al usuario para que active su cuenta y establezca su contraseña.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input readOnly value={generatedLink} className="min-h-11 min-w-64 flex-1 select-all rounded-md border border-indigo-300 bg-white px-3 py-2 text-xs font-mono text-gray-800" />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(generatedLink)
                toastSuccess('Enlace copiado al portapapeles.')
              }}
              className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={() => {
                setGeneratedLink(null)
                setEmail('')
              }}
              className="min-h-11 rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
