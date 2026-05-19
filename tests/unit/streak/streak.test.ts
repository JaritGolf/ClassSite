/**
 * Unit tests for streak logic (pure functions only — no DB calls).
 * We test the core logic by extracting it from the module.
 */

// ── Pure helpers extracted from streak/index.ts ───────────────────────────────

function toIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000
  const aDay = Math.floor(a.getTime() / msPerDay)
  const bDay = Math.floor(b.getTime() / msPerDay)
  return Math.abs(bDay - aDay)
}

const FREEZE_TOKEN_CAP = 3

interface StreakState {
  currentLength: number
  longestLength: number
  lastActiveDate: Date | null
  freezeTokens: number
  freezeTokensGrantedWeek: string | null
}

function computeNextStreak(streak: StreakState, date: Date): StreakState {
  let freezeTokens = streak.freezeTokens
  let freezeTokensGrantedWeek = streak.freezeTokensGrantedWeek
  let currentLength = streak.currentLength
  let longestLength = streak.longestLength

  // Gap check uses token count BEFORE the weekly grant
  if (!streak.lastActiveDate) {
    currentLength = 1
  } else {
    const gap = daysBetween(streak.lastActiveDate, date)
    if (gap === 0) {
      // Same day — no change
    } else if (gap === 1) {
      currentLength += 1
    } else if (gap >= 2 && gap <= 7 && freezeTokens > 0) {
      freezeTokens -= 1
      currentLength += 1
    } else {
      currentLength = 1
    }
  }

  // Weekly grant happens after gap check
  const currentWeek = toIsoWeek(date)
  if (freezeTokensGrantedWeek !== currentWeek) {
    freezeTokens = Math.min(freezeTokens + 1, FREEZE_TOKEN_CAP)
    freezeTokensGrantedWeek = currentWeek
  }

  if (currentLength > longestLength) longestLength = currentLength

  return { currentLength, longestLength, lastActiveDate: date, freezeTokens, freezeTokensGrantedWeek }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('toIsoWeek', () => {
  it('returns same week string for Monday and Sunday of same week', () => {
    const mon = new Date('2026-05-18') // Monday
    const sun = new Date('2026-05-24') // Sunday
    expect(toIsoWeek(mon)).toBe(toIsoWeek(sun))
  })

  it('returns different week string for adjacent weeks', () => {
    const sun = new Date('2026-05-17') // last Sunday
    const mon = new Date('2026-05-18') // this Monday
    expect(toIsoWeek(sun)).not.toBe(toIsoWeek(mon))
  })
})

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    const d = new Date('2026-05-18')
    expect(daysBetween(d, d)).toBe(0)
  })

  it('returns 1 for consecutive days', () => {
    const a = new Date('2026-05-18')
    const b = new Date('2026-05-19')
    expect(daysBetween(a, b)).toBe(1)
  })

  it('returns 7 for a week apart', () => {
    const a = new Date('2026-05-11')
    const b = new Date('2026-05-18')
    expect(daysBetween(a, b)).toBe(7)
  })
})

describe('computeNextStreak', () => {
  const baseStreak: StreakState = {
    currentLength: 0,
    longestLength: 0,
    lastActiveDate: null,
    freezeTokens: 0,
    freezeTokensGrantedWeek: null,
  }

  it('sets streak to 1 on first activity', () => {
    const result = computeNextStreak(baseStreak, new Date('2026-05-18'))
    expect(result.currentLength).toBe(1)
    expect(result.longestLength).toBe(1)
  })

  it('increments streak on consecutive-day activity', () => {
    const streak: StreakState = {
      currentLength: 3,
      longestLength: 3,
      lastActiveDate: new Date('2026-05-17'),
      freezeTokens: 0,
      freezeTokensGrantedWeek: '2026-W20',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.currentLength).toBe(4)
    expect(result.longestLength).toBe(4)
  })

  it('does not change streak when same-day activity recorded', () => {
    const streak: StreakState = {
      currentLength: 5,
      longestLength: 5,
      lastActiveDate: new Date('2026-05-18'),
      freezeTokens: 2,
      freezeTokensGrantedWeek: '2026-W21',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.currentLength).toBe(5)
  })

  it('uses a freeze token when gap is 2 days', () => {
    const streak: StreakState = {
      currentLength: 5,
      longestLength: 5,
      lastActiveDate: new Date('2026-05-16'),
      freezeTokens: 2,
      freezeTokensGrantedWeek: '2026-W21', // already granted this week — no grant fires
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.currentLength).toBe(6)
    expect(result.freezeTokens).toBe(1)
  })

  it('resets streak when gap > 7 days and no tokens', () => {
    const streak: StreakState = {
      currentLength: 10,
      longestLength: 10,
      lastActiveDate: new Date('2026-05-01'),
      freezeTokens: 0,
      freezeTokensGrantedWeek: '2026-W18',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.currentLength).toBe(1)
    expect(result.longestLength).toBe(10) // longestLength preserved
  })

  it('resets streak when gap is 2 days and no tokens', () => {
    const streak: StreakState = {
      currentLength: 5,
      longestLength: 5,
      lastActiveDate: new Date('2026-05-16'),
      freezeTokens: 0,
      freezeTokensGrantedWeek: '2026-W20',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.currentLength).toBe(1)
  })

  it('grants a freeze token on the first activity of a new week', () => {
    const streak: StreakState = {
      currentLength: 3,
      longestLength: 3,
      lastActiveDate: new Date('2026-05-17'), // Sunday of week 20
      freezeTokens: 0,
      freezeTokensGrantedWeek: '2026-W20',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18')) // Monday week 21
    expect(result.freezeTokensGrantedWeek).toBe('2026-W21')
    expect(result.freezeTokens).toBe(1)
  })

  it('does not grant token on same-week second activity', () => {
    const streak: StreakState = {
      currentLength: 3,
      longestLength: 3,
      lastActiveDate: new Date('2026-05-18'),
      freezeTokens: 1,
      freezeTokensGrantedWeek: '2026-W21',
    }
    const result = computeNextStreak(streak, new Date('2026-05-19'))
    expect(result.freezeTokens).toBe(1) // unchanged
  })

  it('caps freeze tokens at FREEZE_TOKEN_CAP', () => {
    const streak: StreakState = {
      currentLength: 1,
      longestLength: 1,
      lastActiveDate: new Date('2026-05-17'),
      freezeTokens: 3,
      freezeTokensGrantedWeek: '2026-W20',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.freezeTokens).toBe(3) // still 3, capped
  })

  it('updates longestLength when current exceeds it', () => {
    const streak: StreakState = {
      currentLength: 7,
      longestLength: 7,
      lastActiveDate: new Date('2026-05-17'),
      freezeTokens: 0,
      freezeTokensGrantedWeek: '2026-W20',
    }
    const result = computeNextStreak(streak, new Date('2026-05-18'))
    expect(result.longestLength).toBe(8)
  })
})
