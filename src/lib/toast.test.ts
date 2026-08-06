import { describe, expect, it, vi } from 'vitest'

const { toast } = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  }),
}))

vi.mock('react-hot-toast', () => ({ default: toast }))

import { getErrorMessage, toastPromise } from './toast'

describe('toast error mapping', () => {
  it('maps known API codes and never returns raw exception text', () => {
    expect(getErrorMessage({ code: 'conflict', message: 'duplicate slug from postgres' })).toBe(
      'Este cambio entra en conflicto con el estado actual.',
    )
    expect(getErrorMessage(new Error('service key leaked'))).toBe('Ocurrió un error inesperado. Intenta de nuevo.')
  })

  it('uses one labelled promise lifecycle with a sanitized error callback', () => {
    const promise = Promise.reject({ code: 'forbidden', message: 'raw provider text' })
    void promise.catch(() => undefined)
    toastPromise(promise, { loading: 'Guardando...', success: 'Guardado.' })
    expect(toast.promise).toHaveBeenCalledWith(
      promise,
      expect.objectContaining({ loading: 'Cargando: Guardando...', success: 'Éxito: Guardado.' }),
    )
    const options = vi.mocked(toast.promise).mock.calls[0][1] as { error: (error: unknown) => string }
    expect(options.error({ code: 'forbidden', message: 'raw provider text' })).toBe(
      'Error: No tienes permiso para realizar esta acción.',
    )
  })
})
