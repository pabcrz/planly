import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toastSuccess } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

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

  // Parse token and type from query params or URL hash fragment
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const tokenHash = params.get('token') || params.get('token_hash') || hashParams.get('token_hash') || hashParams.get('access_token')
  const typeParam = params.get('type') || hashParams.get('type') || 'invite'
  const isRecovery = typeParam === 'recovery'
  const validType = typeParam === 'invite' || isRecovery

  const [hasSession, setHasSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [state, setState] = useState<InviteState>(tokenHash && validType ? 'ready' : 'missing')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasSession(true)
        setState('ready')
      }
      setCheckingSession(false)
    })
  }, [])

  async function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) return setFieldError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirmation) return setFieldError('Las contraseñas no coinciden.')
    setFieldError(null)
    setSubmitting(true)

    if (!hasSession) {
      if (!tokenHash) {
        setState('missing')
        setSubmitting(false)
        return
      }
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: (typeParam as 'invite' | 'recovery') ?? 'invite',
      })
      if (error || !data.session) {
        setState(classify(error))
        setSubmitting(false)
        return
      }
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

  if (checkingSession) return <p className="text-center text-sm text-gray-600">Verificando invitación...</p>
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
    <Button type="submit" disabled={submitting} variant="primary">{submitting ? (isRecovery ? 'Guardando…' : 'Activando…') : (isRecovery ? 'Restablecer contraseña' : 'Aceptar invitación')}</Button>
  </form>
}

function InviteNotice({ message }: { message: string }) {
  return <div className="flex flex-col gap-4"><h1 className="text-lg font-semibold text-gray-900">Invitación</h1><p role="alert" className="text-sm text-red-700">{message}</p><Link to="/sign-in" className="text-sm font-medium text-indigo-600">Ir a iniciar sesión</Link></div>
}
