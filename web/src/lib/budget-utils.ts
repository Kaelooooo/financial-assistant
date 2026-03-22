// web/src/lib/budget-utils.ts
import type { BudgetPeriod } from '@/types/database'

export function getPeriodWindow(
  anchorDate: string,
  period: BudgetPeriod,
  queryDate: Date = new Date(),
): { windowStart: Date; windowEnd: Date } {
  const anchor = new Date(anchorDate)
  let windowStart: Date
  let windowEnd: Date

  if (period === 'monthly') {
    const months =
      (queryDate.getFullYear() - anchor.getFullYear()) * 12 +
      (queryDate.getMonth() - anchor.getMonth())
    windowStart = new Date(anchor)
    windowStart.setMonth(anchor.getMonth() + months)
    if (windowStart > queryDate) windowStart.setMonth(windowStart.getMonth() - 1)
    windowEnd = new Date(windowStart)
    windowEnd.setMonth(windowEnd.getMonth() + 1)
    windowEnd.setDate(windowEnd.getDate() - 1)
  } else if (period === 'weekly') {
    const daysDiff = Math.floor((queryDate.getTime() - anchor.getTime()) / 86400000)
    const weeks = Math.floor(daysDiff / 7)
    windowStart = new Date(anchor)
    windowStart.setDate(anchor.getDate() + weeks * 7)
    if (windowStart > queryDate) windowStart.setDate(windowStart.getDate() - 7)
    windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 6)
  } else {
    // yearly
    const years = queryDate.getFullYear() - anchor.getFullYear()
    windowStart = new Date(anchor)
    windowStart.setFullYear(anchor.getFullYear() + years)
    if (windowStart > queryDate) windowStart.setFullYear(windowStart.getFullYear() - 1)
    windowEnd = new Date(windowStart)
    windowEnd.setFullYear(windowEnd.getFullYear() + 1)
    windowEnd.setDate(windowEnd.getDate() - 1)
  }

  return { windowStart, windowEnd }
}
