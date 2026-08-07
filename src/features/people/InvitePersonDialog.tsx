import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ChurchRole } from '@/types/models'
import { adminApi } from '@/services/adminService'
import { toastPromise } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

const roles: { id: ChurchRole; label: string }[] = [
  { id: 'member', label: 'Miembro' },
  { id: 'worship_director', label: 'Director de Alabanza' },
  { id: 'church_admin', label: 'Administrador' },
]
const inputClass = 'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

interface InvitePersonDialogProps {
  open: boolean
  churchId: string
  onClose: () => void
  onSuccess: () => void
}

export function InvitePersonDialog({ open, churchId, onClose, onSuccess }: InvitePersonDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ChurchRole>('member')
  const [errors, setErrors] = useState<{ email?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = {
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? undefined : 'Ingresa un correo electrónico válido.',
    }
    setErrors(nextErrors)
    if (nextErrors.email) return

    setSubmitting(true)
    setGeneratedLink(null)
    try {
      const result = await toastPromise(adminApi.inviteUser(email.trim(), churchId, role), {
        loading: 'Enviando invitación...',
        success: 'Invitación procesada exitosamente.',
      })
      if (result.action_link) {
        setGeneratedLink(result.action_link)
      } else {
        onSuccess()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setEmail('')
    setRole('member')
    setErrors({})
    setGeneratedLink(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invitar persona">
      {generatedLink ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Debido a las políticas antispam (o si el SMTP no está configurado), se generó un enlace manual de invitación. Envíale este enlace a la persona:
          </p>
          <div className="rounded border bg-gray-50 p-2 text-sm break-all">
            {generatedLink}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={onSuccess}>
              Entendido
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Correo electrónico *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="ejemplo@correo.com"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Perfil de Seguridad *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ChurchRole)}
              className={inputClass}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Invitar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
