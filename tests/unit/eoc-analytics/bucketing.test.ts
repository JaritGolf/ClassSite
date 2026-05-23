/**
 * Unit tests — Date Bucketing Utilities
 *
 * Verifies startOfUtcDay for known datetimes and ISO-week boundary cases.
 */

import { startOfUtcDay } from '@/lib/eoc-analytics/snapshot'

describe('startOfUtcDay', () => {
  it('strips time component for a mid-day UTC timestamp', () => {
    const d = new Date('2026-05-22T14:30:00.000Z')
    const result = startOfUtcDay(d)
    expect(result.toISOString()).toBe('2026-05-22T00:00:00.000Z')
  })

  it('does not modify a date already at midnight UTC', () => {
    const d = new Date('2026-05-22T00:00:00.000Z')
    const result = startOfUtcDay(d)
    expect(result.toISOString()).toBe('2026-05-22T00:00:00.000Z')
  })

  it('handles end-of-day correctly', () => {
    const d = new Date('2026-05-22T23:59:59.999Z')
    const result = startOfUtcDay(d)
    expect(result.toISOString()).toBe('2026-05-22T00:00:00.000Z')
  })

  it('does not mutate the input date', () => {
    const d = new Date('2026-05-22T14:30:00.000Z')
    const before = d.toISOString()
    startOfUtcDay(d)
    expect(d.toISOString()).toBe(before)
  })

  it('handles day boundary at midnight', () => {
    const d = new Date('2026-05-23T00:00:00.001Z')
    const result = startOfUtcDay(d)
    expect(result.toISOString()).toBe('2026-05-23T00:00:00.000Z')
  })

  it('preserves date across UTC month boundary', () => {
    const d = new Date('2026-06-01T10:00:00.000Z')
    const result = startOfUtcDay(d)
    expect(result.toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })
})

describe('ISO-week bucketing — granularity boundary cases', () => {
  // These test the logic inline since getWeekStart is not exported;
  // we verify via behavior that consecutive days within a week bucket together

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  it('Monday (day=1) buckets to itself', () => {
    const monday = new Date('2026-05-18T10:00:00Z') // Monday
    const ws = getWeekStart(monday)
    expect(ws.toISOString()).toBe('2026-05-18T00:00:00.000Z')
  })

  it('Sunday (day=0) buckets to previous Monday', () => {
    const sunday = new Date('2026-05-24T10:00:00Z') // Sunday
    const ws = getWeekStart(sunday)
    expect(ws.toISOString()).toBe('2026-05-18T00:00:00.000Z')
  })

  it('Saturday (day=6) buckets to Monday of same week', () => {
    const saturday = new Date('2026-05-23T10:00:00Z') // Saturday
    const ws = getWeekStart(saturday)
    expect(ws.toISOString()).toBe('2026-05-18T00:00:00.000Z')
  })

  it('Tuesday of next week buckets to next Monday', () => {
    const tuesday = new Date('2026-05-26T10:00:00Z') // Tuesday
    const ws = getWeekStart(tuesday)
    expect(ws.toISOString()).toBe('2026-05-25T00:00:00.000Z')
  })

  it('two dates in same week have identical weekStart', () => {
    const monday = new Date('2026-05-18T10:00:00Z')
    const friday = new Date('2026-05-22T15:00:00Z')
    const ws1 = getWeekStart(monday)
    const ws2 = getWeekStart(friday)
    expect(ws1.toISOString()).toBe(ws2.toISOString())
  })

  it('two dates across week boundary have different weekStart', () => {
    const friday = new Date('2026-05-22T23:00:00Z')
    const nextMonday = new Date('2026-05-25T01:00:00Z')
    const ws1 = getWeekStart(friday)
    const ws2 = getWeekStart(nextMonday)
    expect(ws1.toISOString()).not.toBe(ws2.toISOString())
  })
})
