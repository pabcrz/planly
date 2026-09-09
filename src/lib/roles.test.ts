import { describe, expect, it } from 'vitest'
import { DEFAULT_MUSICAL_ROLES, MANAGER_ROLES, isManagerRole } from './roles'

describe('role helpers', () => {
  it('identifies the canonical manager roles', () => {
    expect(MANAGER_ROLES).toEqual(['church_admin', 'worship_director'])
    expect(isManagerRole('church_admin')).toBe(true)
    expect(isManagerRole('worship_director')).toBe(true)
  })

  it('rejects a non-manager role', () => {
    expect(isManagerRole('member')).toBe(false)
  })

  it('provides a non-empty default musical role list', () => {
    expect(DEFAULT_MUSICAL_ROLES.length).toBeGreaterThan(0)
  })
})
