import toast from 'react-hot-toast'
import type { AdminErrorCode } from '@/types/admin'

export const ERROR_CODE_MAP: Record<AdminErrorCode, string> = {
  bad_request: 'La información enviada no es válida.',
  unauthenticated: 'Tu sesión no es válida. Inicia sesión de nuevo.',
  forbidden: 'No tienes permiso para realizar esta acción.',
  not_found: 'No encontramos el recurso solicitado.',
  conflict: 'Este cambio entra en conflicto con el estado actual.',
  invariant_violation: 'Esta acción no es posible por las reglas de la plataforma.',
  auth_dependency_failed: 'No se pudo completar la operación de acceso. Intenta de nuevo.',
  internal_error: 'Ocurrió un error inesperado. Intenta de nuevo.',
}

const fallback = 'Ocurrió un error inesperado. Intenta de nuevo.'

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && code in ERROR_CODE_MAP) return ERROR_CODE_MAP[code as AdminErrorCode]
  }
  return fallback
}

export function toastSuccess(message: string) {
  return toast.success(`Éxito: ${message}`, { ariaProps: { role: 'status', 'aria-live': 'polite' } })
}

export function toastError(error: unknown, urgent = false) {
  return toast.error(`Error: ${getErrorMessage(error)}`, {
    ariaProps: urgent ? { role: 'alert', 'aria-live': 'assertive' } : { role: 'status', 'aria-live': 'polite' },
  })
}

export function toastLoading(message: string) {
  return toast.loading(`Cargando: ${message}`, { ariaProps: { role: 'status', 'aria-live': 'polite' } })
}

export function toastPromise<T>(promise: Promise<T>, messages: { loading: string; success: string }) {
  return toast.promise(promise, {
    loading: `Cargando: ${messages.loading}`,
    success: `Éxito: ${messages.success}`,
    error: (error) => `Error: ${getErrorMessage(error)}`,
  })
}
