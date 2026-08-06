import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { usePlatformAdmin } = vi.hoisted(() => ({ usePlatformAdmin: vi.fn() }))
const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))
const { useChurch } = vi.hoisted(() => ({ useChurch: vi.fn() }))
vi.mock('@/features/auth/platformAdmin', () => ({ usePlatformAdmin }))
vi.mock('@/app/providers/AuthProvider', () => ({ useAuth }))
vi.mock('@/app/providers/ChurchProvider', () => ({ useChurch }))
import { ChurchGuard } from './ChurchGuard'

function renderGuard() {
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/songs']}><Routes>
    <Route path="/dashboard" element={<p>Tablero</p>} />
    <Route element={<ChurchGuard />}><Route path="/songs" element={<p>Canciones</p>} /></Route>
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('ChurchGuard', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: { id: 'user' }, isLoading: false, membershipsLoaded: true })
    useChurch.mockReturnValue({ activeChurchId: null })
  })
  it('allows an authoritative platform admin without an active church', async () => {
    usePlatformAdmin.mockReturnValue({ data: true, isLoading: false })
    renderGuard()
    await waitFor(() => expect(screen.getByText('Canciones')).toBeTruthy())
  })
  it('redirects an ordinary user without an active church', async () => {
    usePlatformAdmin.mockReturnValue({ data: false, isLoading: false })
    renderGuard()
    await waitFor(() => expect(screen.getByText('Tablero')).toBeTruthy())
  })
})
