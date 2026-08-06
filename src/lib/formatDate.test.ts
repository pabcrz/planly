import { describe, expect, it } from 'vitest'
import { formatDate, formatRelative } from './formatDate'

describe('Planly date formatters', () => {
  it('formats dates in Mexico City Spanish', () => {
    expect(formatDate('2026-08-02T16:00:00.000Z')).toContain('ago')
  })

  it('formats relative time in Spanish', () => {
    expect(formatRelative('2026-08-02T13:00:00.000Z', new Date('2026-08-02T16:00:00.000Z'))).toBe('hace 3 horas')
  })
})
