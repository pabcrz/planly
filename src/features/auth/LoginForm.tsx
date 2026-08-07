import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { signIn } from '@/services/authService'
import { getErrorMessage } from '@/lib/toast'
import { Button } from '@/components/ui/Button'

const inputClass =
  'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

export function LoginForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signIn(email.trim(), password)
      const redirect = searchParams.get('redirect')
      const target = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'
      navigate(target, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <h1 className="text-lg font-semibold text-gray-900">Iniciar sesión</h1>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Correo electrónico
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </label>

      <Button
        type="submit"
        disabled={isSubmitting}
        variant="primary"
      >
        {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        El acceso a Planly es solo por invitación. Solicita una invitación al administrador.
      </p>
    </form>
  )
}
