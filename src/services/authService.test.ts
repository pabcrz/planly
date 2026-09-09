import { describe, expect, it, vi } from 'vitest'

const { getSession, verifyOtp, updateUser, signOut, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession, verifyOtp, updateUser, signOut },
    rpc,
  },
}))

import { activateCurrentUser, getCurrentSession, signOut as signOutUser, updatePassword, verifyInviteToken } from './authService'

describe('auth service invite operations', () => {
  it('returns the current session through the service boundary', async () => {
    const session = { access_token: 'memory-only' }
    getSession.mockResolvedValueOnce({ data: { session }, error: null })

    await expect(getCurrentSession()).resolves.toEqual(session)
    expect(getSession).toHaveBeenCalledOnce()
  })

  it('verifies invite tokens with the requested token type', async () => {
    const session = { access_token: 'memory-only' }
    verifyOtp.mockResolvedValueOnce({ data: { session }, error: null })

    await expect(verifyInviteToken('token-hash', 'recovery')).resolves.toEqual(session)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'token-hash', type: 'recovery' })
  })

  it('propagates password and activation errors without exposing Supabase to callers', async () => {
    const passwordError = new Error('password update failed')
    updateUser.mockResolvedValueOnce({ error: passwordError })
    rpc.mockResolvedValueOnce({ error: null })

    await expect(updatePassword('password123')).rejects.toBe(passwordError)
    await expect(activateCurrentUser()).resolves.toBeUndefined()
    expect(updateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(rpc).toHaveBeenCalledWith('activate_current_user')
  })

  it('keeps sign-out behind the auth service', async () => {
    signOut.mockResolvedValueOnce({ error: null })

    await expect(signOutUser()).resolves.toBeUndefined()
    expect(signOut).toHaveBeenCalledOnce()
  })
})
