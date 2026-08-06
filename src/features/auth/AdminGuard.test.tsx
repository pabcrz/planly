import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isLoading: false }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))

import { AdminGuard } from './AdminGuard'

function renderGuard() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/dashboard" element={<p>Tablero</p>} />
          <Route element={<AdminGuard />}><Route path="/admin/users" element={<p>Administración</p>} /></Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminGuard', () => {
  it('denies a user without the authoritative platform_admins result', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })
    renderGuard()
    await waitFor(() => expect(screen.getByText('Tablero')).toBeTruthy())
    expect(rpc).toHaveBeenCalledWith('is_platform_admin')
  })

  it('allows an active table-authorized platform admin', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })
    renderGuard()
    await waitFor(() => expect(screen.getByText('Administración')).toBeTruthy())
  })
})
