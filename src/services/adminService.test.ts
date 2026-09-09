import { describe, expect, it, vi } from 'vitest'

const { invoke, rpc } = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke }, rpc } }))

import { AdminApiClient, createChurchViaRpc, createChurchWithFallback } from './adminService'

describe('AdminApiClient listChurches', () => {
  it('maps pagination to the authorized list_churches action', async () => {
    const payload = { churches: [], page: 2, per_page: 25, total: 0, next_page: null }
    invoke.mockResolvedValueOnce({ data: { ok: true, data: payload }, error: null })
    await expect(new AdminApiClient().listChurches(2, 25)).resolves.toEqual(payload)
    expect(invoke).toHaveBeenCalledWith('admin-api', { body: { action: 'list_churches', page: 2, per_page: 25 } })
  })
})

describe('create church service boundary', () => {
  it('keeps the direct RPC fallback behind the admin service', async () => {
    rpc.mockResolvedValueOnce({ error: null })

    await expect(createChurchViaRpc('Planly Centro', 'planly-centro', 'user-1')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('create_church', {
      church_name: 'Planly Centro',
      church_slug: 'planly-centro',
      founding_admin_user_id: 'user-1',
    })
  })

  it('preserves the RPC fallback when the authorized API is unavailable', async () => {
    invoke.mockRejectedValueOnce(new Error('function unavailable'))
    rpc.mockResolvedValueOnce({ error: null })

    await expect(createChurchWithFallback('Planly Centro', 'planly-centro', 'user-1')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('create_church', {
      church_name: 'Planly Centro',
      church_slug: 'planly-centro',
      founding_admin_user_id: 'user-1',
    })
  })
})
