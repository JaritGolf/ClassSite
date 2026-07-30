/**
 * Pure sessionization logic — no DB.
 *
 * These are the invariants the whole feature rests on: where one session ends
 * and the next begins, and why reported "active time" cannot be inflated by an
 * abandoned browser tab.
 */

import {
  activeDelta,
  activeMinutes,
  addAreaSeconds,
  areaBreakdown,
  areaFromPathname,
  isActivityArea,
  mergeAdjacentSessions,
  parseAreaSeconds,
  presenceState,
  secondsBetween,
  sessionSpanSeconds,
  shouldOpenNewSession,
  spanMinutes,
  sumAreaSeconds,
  ACTIVE_DELTA_CAP_SECONDS,
  SESSION_GAP_MINUTES,
} from '@/lib/activity-sessions'

const T0 = new Date('2026-07-30T08:00:00.000Z')
const at = (minutes: number, seconds = 0): Date =>
  new Date(T0.getTime() + minutes * 60_000 + seconds * 1000)

describe('secondsBetween', () => {
  it('measures forward elapsed seconds', () => {
    expect(secondsBetween(T0, at(2))).toBe(120)
  })

  it('never returns a negative value for out-of-order clocks', () => {
    expect(secondsBetween(at(5), T0)).toBe(0)
  })
})

describe('shouldOpenNewSession', () => {
  it('extends the session inside the gap threshold', () => {
    expect(shouldOpenNewSession(T0, at(SESSION_GAP_MINUTES - 1))).toBe(false)
  })

  it('treats exactly the threshold as still the same session', () => {
    expect(shouldOpenNewSession(T0, at(SESSION_GAP_MINUTES))).toBe(false)
  })

  it('opens a new session one second past the threshold', () => {
    expect(shouldOpenNewSession(T0, at(SESSION_GAP_MINUTES, 1))).toBe(true)
  })

  it('opens a new session the next morning', () => {
    expect(shouldOpenNewSession(T0, at(24 * 60))).toBe(true)
  })
})

describe('activeDelta — the anti-inflation guard', () => {
  it('credits a normal heartbeat interval in full', () => {
    expect(activeDelta(T0, at(1))).toBe(60)
  })

  it('caps a long idle gap instead of crediting it as work', () => {
    // The student backgrounded the tab for 40 minutes and came back. Without
    // the cap this would report 40 minutes of work that never happened.
    expect(activeDelta(T0, at(40))).toBe(ACTIVE_DELTA_CAP_SECONDS)
  })

  it('caps an overnight gap to the same bound', () => {
    expect(activeDelta(T0, at(14 * 60))).toBe(ACTIVE_DELTA_CAP_SECONDS)
  })

  it('credits a slightly late ping in full (cap sits above the interval)', () => {
    expect(activeDelta(T0, at(1, 15))).toBe(75)
  })

  it('contributes nothing for a same-instant touch', () => {
    expect(activeDelta(T0, T0)).toBe(0)
  })
})

describe('span vs. active time', () => {
  const idleSession = {
    startedAt: T0,
    lastActiveAt: at(50),
    endedAt: null,
    // Student was present for 50 minutes of wall clock but only worked ~12.
    activeSeconds: 12 * 60,
  }

  it('reports the wall-clock span from first to last activity', () => {
    expect(sessionSpanSeconds(idleSession)).toBe(50 * 60)
    expect(spanMinutes(idleSession)).toBe(50)
  })

  it('reports active time independently of the span', () => {
    expect(activeMinutes(idleSession)).toBe(12)
  })

  it('measures a closed session to its end, not its last touch', () => {
    const closed = { ...idleSession, endedAt: at(45) }
    expect(sessionSpanSeconds(closed)).toBe(45 * 60)
  })
})

describe('presenceState', () => {
  it('is online just after activity', () => {
    expect(presenceState(T0, at(1))).toBe('online')
  })

  it('is online at exactly the 2-minute boundary', () => {
    expect(presenceState(T0, at(2))).toBe('online')
  })

  it('is idle between 2 and 10 minutes', () => {
    expect(presenceState(T0, at(6))).toBe('idle')
    expect(presenceState(T0, at(10))).toBe('idle')
  })

  it('is offline past 10 minutes', () => {
    expect(presenceState(T0, at(11))).toBe('offline')
  })
})

describe('area accounting', () => {
  it('accumulates seconds per area immutably', () => {
    const first = addAreaSeconds(null, 'mission', 60)
    const second = addAreaSeconds(first, 'mission', 60)
    const third = addAreaSeconds(second, 'drill', 30)

    expect(first).toEqual({ mission: 60 })
    expect(second).toEqual({ mission: 120 })
    expect(third).toEqual({ mission: 120, drill: 30 })
  })

  it('ignores non-positive deltas', () => {
    expect(addAreaSeconds({ mission: 60 }, 'drill', 0)).toEqual({ mission: 60 })
  })

  it('drops junk from an unvalidated JSON column', () => {
    // areaSeconds is Json, so the DB cannot enforce its shape.
    expect(
      parseAreaSeconds({ mission: 60, bogus: 'nope', negative: -5, zero: 0 })
    ).toEqual({ mission: 60 })
    expect(parseAreaSeconds(null)).toEqual({})
    expect(parseAreaSeconds('not an object')).toEqual({})
    expect(parseAreaSeconds([1, 2, 3])).toEqual({})
  })

  it('sums two area maps', () => {
    expect(sumAreaSeconds({ mission: 60 }, { mission: 30, drill: 90 })).toEqual({
      mission: 90,
      drill: 90,
    })
  })

  it('renders a breakdown sorted by time, dropping sub-minute areas', () => {
    expect(
      areaBreakdown({ mission: 600, drill: 1200, dashboard: 10 })
    ).toEqual([
      { area: 'drill', minutes: 20 },
      { area: 'mission', minutes: 10 },
    ])
  })
})

describe('areaFromPathname', () => {
  it('buckets student routes by their section', () => {
    expect(areaFromPathname('/student/dashboard')).toBe('dashboard')
    expect(areaFromPathname('/student/mission/SS.7.CG.1.3')).toBe('mission')
    expect(areaFromPathname('/student/republic-challenge/category')).toBe(
      'republic-challenge'
    )
  })

  it('maps route names that differ from their area name', () => {
    expect(areaFromPathname('/student/daily-drill')).toBe('drill')
    expect(areaFromPathname('/student/source-lab/abc123')).toBe('source-decoder')
  })

  it('falls back to other for unknown or non-student routes', () => {
    expect(areaFromPathname('/student/something-new')).toBe('other')
    expect(areaFromPathname('/teacher/reports')).toBe('other')
    expect(areaFromPathname('/')).toBe('other')
  })

  it('validates area names', () => {
    expect(isActivityArea('mission')).toBe(true)
    expect(isActivityArea('nonsense')).toBe(false)
    expect(isActivityArea(42)).toBe(false)
  })
})

describe('mergeAdjacentSessions — duplicate-row race repair', () => {
  it('collapses two rows that are really one session', () => {
    // The accepted write race: two simultaneous first requests each opened a
    // session. The read model must present one.
    const merged = mergeAdjacentSessions([
      { startedAt: T0, lastActiveAt: at(5), endedAt: null, activeSeconds: 300 },
      { startedAt: at(5), lastActiveAt: at(20), endedAt: null, activeSeconds: 600 },
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0].startedAt).toEqual(T0)
    expect(merged[0].lastActiveAt).toEqual(at(20))
    expect(merged[0].activeSeconds).toBe(900)
  })

  it('keeps genuinely separate sessions separate', () => {
    const merged = mergeAdjacentSessions([
      { startedAt: T0, lastActiveAt: at(20), endedAt: at(20), activeSeconds: 900 },
      { startedAt: at(120), lastActiveAt: at(140), endedAt: null, activeSeconds: 800 },
    ])
    expect(merged).toHaveLength(2)
  })

  it('sorts input ascending regardless of the order given', () => {
    const merged = mergeAdjacentSessions([
      { startedAt: at(120), lastActiveAt: at(140), endedAt: null, activeSeconds: 800 },
      { startedAt: T0, lastActiveAt: at(20), endedAt: at(20), activeSeconds: 900 },
    ])
    expect(merged.map((s) => s.startedAt)).toEqual([T0, at(120)])
  })

  it('leaves the merged session open when the later row is open', () => {
    const merged = mergeAdjacentSessions([
      { startedAt: T0, lastActiveAt: at(5), endedAt: at(5), activeSeconds: 300 },
      { startedAt: at(6), lastActiveAt: at(20), endedAt: null, activeSeconds: 600 },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].endedAt).toBeNull()
  })

  it('merges area tallies too, so no time is dropped', () => {
    const merged = mergeAdjacentSessions([
      {
        startedAt: T0,
        lastActiveAt: at(5),
        endedAt: null,
        activeSeconds: 300,
        areaSeconds: { mission: 300 },
      },
      {
        startedAt: at(5),
        lastActiveAt: at(20),
        endedAt: null,
        activeSeconds: 600,
        areaSeconds: { mission: 300, drill: 300 },
      },
    ])
    expect(merged[0].areaSeconds).toEqual({ mission: 600, drill: 300 })
  })

  it('takes the current area from the later row', async () => {
    const merged = mergeAdjacentSessions([
      {
        startedAt: T0,
        lastActiveAt: at(5),
        endedAt: null,
        activeSeconds: 300,
        lastArea: 'mission',
      },
      {
        startedAt: at(5),
        lastActiveAt: at(20),
        endedAt: null,
        activeSeconds: 600,
        lastArea: 'drill',
      },
    ])
    expect(merged[0].lastArea).toBe('drill')
  })

  it('returns an empty array for no sessions', () => {
    expect(mergeAdjacentSessions([])).toEqual([])
  })
})
