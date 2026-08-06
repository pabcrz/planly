import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toastSuccess } from '@/lib/toast'
import { supabase } from '@/lib/supabase'

type InviteState = 'missing' | 'expired' | 'used' | 'invalid' | 'ready'

const messages: Record<Exclude<InviteState, 'ready'>, string> = {
  missing: 'El enlace de invitación está incompleto. Solicita una nueva invitación.',
  expired: 'La invitación venció. Solicita una nueva invitación al administrador de Planly.',
  used: 'Esta invitación ya fue utilizada. Inicia sesión para continuar.',
  invalid: 'No se pudo validar la invitación. Solicita una nueva invitación.',
}

function classify(error: { code?: string } | null): InviteState {
  if (error?.code === 'otp_expired') return 'expired'
  if (error?.code === 'otp_already_used') return 'used'
  return 'invalid'
}

export function InvitePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tokenHash = params.get('token_hash')
  const typeParam = params.get('type')
  const isRecovery = typeParam === 'recovery'
  const validType = typeParam === 'invite' || isRecovery
  const [state, setState] = useState<InviteState>(tokenHash && validType ? 'ready' : 'missing')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokenHash || !validType) return
    if (password.length < 8) return setFieldError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirmation) return setFieldError('Las contraseñas no coinciden.')
    setFieldError(null)
    setSubmitting(true)
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (typeParam as 'invite' | 'recovery') ?? 'invite' })
    if (error || !data.session) {
      setState(classify(error))
      setSubmitting(false)
      return
    }
    const passwordResult = await supabase.auth.updateUser({ password })
    if (passwordResult.error) {
      setState('invalid')
      setSubmitting(false)
      return
    }
    const activation = await supabase.rpc('activate_current_user')
    if (activation.error) {
      await supabase.auth.signOut()
      navigate('/sign-in?invite_error=activation', { replace: true })
      return
    }
    toastSuccess(isRecovery ? 'Tu contraseña fue restablecida.' : 'Tu cuenta fue activada.')
    navigate('/dashboard', { replace: true })
  }

  if (state !== 'ready') return <InviteNotice message={messages[state]} />
  return <form onSubmit={acceptInvite} className="flex flex-col gap-4" noValidate>
    <h1 className="text-lg font-semibold text-gray-900">{isRecovery ? 'Restablecer contraseña' : 'Activa tu cuenta'}</h1>
    <p className="text-sm text-gray-600">{isRecovery ? 'Ingresa tu nueva contraseña para acceder a Planly.' : 'Establece una contraseña para acceder a Planly.'}</p>
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Contraseña
      <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 rounded-md border border-gray-300 px-3 py-2" />
    </label>
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Confirmar contraseña
      <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-11 rounded-md border border-gray-300 px-3 py-2" />
    </label>
    {fieldError ? <p className="text-sm text-red-600">{fieldError}</p> : null}
    <button type="submit" disabled={submitting} className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{submitting ? (isRecovery ? 'Guardando…' : 'Activando…') : (isRecovery ? 'Restablecer contraseña' : 'Aceptar invitación')}</button>
  </form>
}

function InviteNotice({ message }: { message: string }) {
  return <div className="flex flex-col gap-4"><h1 className="text-lg font-semibold text-gray-900">Invitación</h1><p role="alert" className="text-sm text-red-700">{message}</p><Link to="/sign-in" className="text-sm font-medium text-indigo-600">Ir a iniciar sesión</Link></div>
}
