/**
 * Streak rule — pure. Runs in the browser against device-local progress.
 *
 * No timers that punish absence: a gap of 2–7 days spends a freeze token
 * instead of resetting the streak, and one token is granted per ISO week.
 */

export interface StreakData {
  currentLength: number
  longestLength: number
  /** Local calendar day, YYYY-MM-DD. */
  lastActiveDate: string | null
  freezeTokens: number
  freezeTokensGrantedWeek: string | null
}

export const INITIAL_STREAK: StreakData = {
  currentLength: 0,
  longestLength: 0,
  lastActiveDate: null,
  freezeTokens: 2,
  freezeTokensGrantedWeek: null,
}

const FREEZE_TOKEN_CAP = 3

/** YYYY-MM-DD for the device's local calendar day. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

export function isoWeekKey(dayKey: string): string {
  const [y, m, day] = dayKey.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/** Credit one day of activity. Idempotent for repeats on the same day. */
export function applyActivity(streak: StreakData, date: Date): StreakData {
  const today = localDayKey(date)
  let { currentLength, longestLength, freezeTokens, freezeTokensGrantedWeek } = streak

  if (!streak.lastActiveDate) {
    currentLength = 1
  } else {
    const gap = Math.abs(dayNumber(today) - dayNumber(streak.lastActiveDate))
    if (gap === 0) {
      // same day — no change
    } else if (gap === 1) {
      currentLength += 1
    } else if (gap >= 2 && gap <= 7 && freezeTokens > 0) {
      freezeTokens -= 1
      currentLength += 1
    } else {
      currentLength = 1
    }
  }

  const week = isoWeekKey(today)
  if (freezeTokensGrantedWeek !== week) {
    freezeTokens = Math.min(freezeTokens + 1, FREEZE_TOKEN_CAP)
    freezeTokensGrantedWeek = week
  }

  if (currentLength > longestLength) longestLength = currentLength

  return { currentLength, longestLength, lastActiveDate: today, freezeTokens, freezeTokensGrantedWeek }
}
