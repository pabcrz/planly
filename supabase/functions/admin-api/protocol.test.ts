import { describe, expect, it } from 'vitest'
import { ApiError, errorPayload, normalizeEmail, parseRequest } from './protocol.ts'

describe('admin-api protocol', () => {
  it('normalizes invitation email and validates role', () => {
    expect(parseRequest({ action: 'invite_user', email: ' Admin@Example.com ', church_id: '123e4567-e89b-12d3-a456-426614174000', role: 'member' })).toMatchObject({ email: 'admin@example.com' })
    expect(() => parseRequest({ action: 'invite_user', email: 'admin@example.com', church_id: '123e4567-e89b-12d3-a456-426614174000', role: 'owner' })).toThrow(ApiError)
  })

  it('rejects unknown fields, malformed UUIDs, and unsafe pagination', () => {
    expect(() => parseRequest({ action: 'list_users', page: 101 })).toThrow(ApiError)
    expect(() => parseRequest({ action: 'list_churches', page: 0 })).toThrow(ApiError)
    expect(() => parseRequest({ action: 'list_churches', extra: true })).toThrow(ApiError)
    expect(() => parseRequest({ action: 'revoke_membership', membership_id: 'nope' })).toThrow(ApiError)
    expect(() => parseRequest({ action: 'reactivate_user', user_id: '123e4567-e89b-12d3-a456-426614174000', extra: true })).toThrow(ApiError)
  })

  it('accepts the strict paginated church listing request', () => {
    expect(parseRequest({ action: 'list_churches', page: 2, per_page: 25 })).toEqual({
      action: 'list_churches', page: 2, per_page: 25,
    })
  })

  it('requires selected membership ids only for selected revocation', () => {
    expect(parseRequest({ action: 'deactivate_user', user_id: '123e4567-e89b-12d3-a456-426614174000', membership_mode: 'revoke_selected', membership_ids: ['123e4567-e89b-12d3-a456-426614174001'] })).toMatchObject({ membership_mode: 'revoke_selected' })
    expect(() => parseRequest({ action: 'deactivate_user', user_id: '123e4567-e89b-12d3-a456-426614174000', membership_mode: 'retain', membership_ids: [] })).toThrow(ApiError)
  })

  it('maps errors without provider details', () => {
    expect(normalizeEmail(' USER@EXAMPLE.COM ')).toBe('user@example.com')
    expect(errorPayload(new ApiError('forbidden', 403)).body).toEqual({ ok: false, error: { code: 'forbidden', message: 'No tienes permiso para realizar esta acción.' } })
  })

  it('parses generate_recovery_link request with valid user uuid', () => {
    expect(parseRequest({ action: 'generate_recovery_link', user_id: '123e4567-e89b-12d3-a456-426614174000' })).toEqual({
      action: 'generate_recovery_link', user_id: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(() => parseRequest({ action: 'generate_recovery_link', user_id: 'not-a-uuid' })).toThrow(ApiError)
  })

  it('parses delete_church request with valid church uuid', () => {
    expect(parseRequest({ action: 'delete_church', church_id: '123e4567-e89b-12d3-a456-426614174000' })).toEqual({
      action: 'delete_church', church_id: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(() => parseRequest({ action: 'delete_church', church_id: 'bad-id' })).toThrow(ApiError)
  })
})
