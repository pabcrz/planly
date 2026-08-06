import { describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke } } }))

import { AdminApiClient } from './adminService'

describe('AdminApiClient listChurches', () => {
  it('maps pagination to the authorized list_churches action', async () => {
    const payload = { churches: [], page: 2, per_page: 25, total: 0, next_page: null }
    invoke.mockResolvedValueOnce({ data: { ok: true, data: payload }, error: null })
    await expect(new AdminApiClient().listChurches(2, 25)).resolves.toEqual(payload)
    expect(invoke).toHaveBeenCalledWith('admin-api', { body: { action: 'list_churches', page: 2, per_page: 25 } })
  })
})
