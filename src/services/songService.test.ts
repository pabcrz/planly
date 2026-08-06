import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, eq, is, or, order } = vi.hoisted(() => ({
  from: vi.fn(), eq: vi.fn(), is: vi.fn(), or: vi.fn(), order: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { from, auth: { getUser: vi.fn() } } }))
import { getSongs } from './songService'

describe('getSongs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    order.mockResolvedValue({ data: [], error: null })
    is.mockReturnValue({ order })
    eq.mockReturnValue({ is })
    or.mockReturnValue({ order })
    from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq, or }) })
  })

  it('uses the canonical-only query for the no-church platform-admin path', async () => {
    await getSongs(null)
    expect(eq).toHaveBeenCalledWith('is_canonical', true)
    expect(is).toHaveBeenCalledWith('church_id', null)
    expect(or).not.toHaveBeenCalled()
  })

  it('keeps ordinary church listing scoped to canonical plus the active church', async () => {
    await getSongs('church-1')
    expect(or).toHaveBeenCalledWith('is_canonical.eq.true,church_id.eq.church-1')
  })
})
