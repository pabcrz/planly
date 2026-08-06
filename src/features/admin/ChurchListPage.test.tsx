import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { listChurches, listUsers } = vi.hoisted(() => ({ listChurches: vi.fn(), listUsers: vi.fn() }))

vi.mock('@/services/adminService', () => ({
  adminApi: { listChurches, listUsers, createChurch: vi.fn() },
}))

import { ChurchListPage } from './ChurchListPage'

describe('ChurchListPage', () => {
  it('renders a zero-membership church from the authoritative church list', async () => {
    listChurches.mockResolvedValueOnce({
      churches: [{ id: 'church-1', name: 'Planly Centro', slug: 'planly-centro', type: 'church', timezone: 'America/Mexico_City', settings: {}, created_at: '2026-01-01T00:00:00Z', member_count: 0 }],
      page: 1, per_page: 25, total: 1, next_page: null,
    })
    listUsers.mockResolvedValueOnce({ users: [{ id: 'user-1', email: 'admin@example.com', status: 'active', memberships: [] }], page: 1, per_page: 100, total: 1, next_page: null })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ChurchListPage /></QueryClientProvider>)
    await waitFor(() => expect(screen.getByText('Planly Centro')).toBeTruthy())
    expect(screen.getByText('0 miembros')).toBeTruthy()
    expect(listChurches).toHaveBeenCalledWith(1, 25)
  })
})
