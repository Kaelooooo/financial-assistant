// web/src/lib/budget-utils.test.ts
import { describe, it, expect } from 'vitest'
import { getPeriodWindow } from './budget-utils'

describe('getPeriodWindow', () => {
  it('returns correct monthly window', () => {
    const { windowStart, windowEnd } = getPeriodWindow('2026-01-01', 'monthly', new Date('2026-03-15'))
    expect(windowStart.toISOString().slice(0, 10)).toBe('2026-03-01')
    expect(windowEnd.toISOString().slice(0, 10)).toBe('2026-03-31')
  })

  it('returns correct weekly window', () => {
    const { windowStart, windowEnd } = getPeriodWindow('2026-01-05', 'weekly', new Date('2026-01-08'))
    expect(windowStart.toISOString().slice(0, 10)).toBe('2026-01-05')
    expect(windowEnd.toISOString().slice(0, 10)).toBe('2026-01-11')
  })
})
