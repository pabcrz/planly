import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { ChurchRole } from '@/types/models'
import { adminApi } from '@/services/adminService'
import { toastPromise, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/Button'

const roles: { id: ChurchRole; label: string }[] = [
  { id: 'member', label: 'Miembro' },
  { id: 'worship_director', label: 'Director de Alabanza' },
  { id: 'church_admin', label: 'Administrador' },
]
const inputClass = 'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

export function InviteUserForm({
  churches,
  onComplete,
}: {
  churches: { id: string; name: string }[]
  onComplete: () => void
}) {
  const [email, setEmail] = useState('')
  const [churchId, setChurchId] = useState(churches[0]?.id ?? '')
  const [role, setRole] = useState<ChurchRole>('member')
  const [errors, setErrors] = useState<{ email?: string; church?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  useEffect(() => {
    if (!churchId && churches.length > 0) {
      setChurchId(churches[0].id)
    }
  }, [churches])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetChurchId = churchId || churches[0]?.id
    const nextErrors = {
      email: /^\S+@\S+\.\S+$/.test(email) ? undefined : 'Ingresa un correo electrónico válido.',
      church: targetChurchId ? undefined : 'Selecciona una iglesia.',
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.church) return

    setSubmitting(true)
    setGeneratedLink(null)
    try {
      const result = await toastPromise(adminApi.inviteUser(email.trim(), targetChurchId, role), {
        loading: 'Enviando invitación...',
        success: 'Invitación procesada exitosamente.',
      })
      if (result.action_link) {
        setGeneratedLink(result.action_link)
        onComplete()
      } else {
        setEmail('')
        onComplete()
      }
    } catch {
      // Toast handles error display
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate className="grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">Correo electrónico
          <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="correo@ejemplo.com" aria-invalid={Boolean(errors.email)} />
          {errors.email ? <span className="mt-1 block text-xs text-red-700">{errors.email}</span> : null}
        </label>
        <label className="text-sm font-medium text-gray-700">Iglesia
          <select value={churchId || churches[0]?.id || ''} onChange={(event) => setChurchId(event.target.value)} className={inputClass} aria-invalid={Boolean(errors.church)}>
            {churches.length === 0 ? <option value="">No hay iglesias disponibles</option> : null}
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.church ? <span className="mt-1 block text-xs text-red-700">{errors.church}</span> : null}
        </label>
        <label className="text-sm font-medium text-gray-700">Perfil de Seguridad
          <select value={role} onChange={(event) => setRole(event.target.value as ChurchRole)} className={inputClass}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={submitting} variant="primary" className="mt-5">
          Invitar usuario
        </Button>
      </form>
      {generatedLink ? (
        <div className="rounded-xl bg-indigo-50 p-4 shadow-sm ring-1 ring-indigo-200">
          <p className="text-sm font-semibold text-indigo-950">Enlace de invitación generado exitosamente:</p>
          <p className="mt-1 text-xs text-indigo-800">Copia este enlace y envíalo por WhatsApp o mensaje al usuario para que active su cuenta y establezca su contraseña.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input readOnly value={generatedLink} className="min-h-11 min-w-64 flex-1 select-all rounded-md border border-indigo-300 bg-white px-3 py-2 text-xs font-mono text-gray-800" />
            <Button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(generatedLink)
                toastSuccess('Enlace copiado al portapapeles.')
              }}
              variant="primary"
            >
              Copiar enlace
            </Button>
            <Button
              type="button"
              onClick={() => {
                setGeneratedLink(null)
                setEmail('')
              }}
              variant="secondary"
            >
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
