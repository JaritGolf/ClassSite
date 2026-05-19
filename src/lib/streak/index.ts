import { StreakState } from '@prisma/client'
import { prisma } from '@/lib/db'

const FREEZE_TOKEN_CAP = 3

function toIsoWeek(date: Date): string {
  // Use UTC methods throughout to avoid local-timezone offset issues
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

export async function getOrCreateStreak(studentId: string): Promise<StreakState> {
  return prisma.streakState.upsert({
    where: { studentId },
    update: {},
    create: { studentId },
  })
}

export async function recordActivity(studentId: string, date: Date): Promise<StreakState> {
  const streak = await getOrCreateStreak(studentId)

  let freezeTokens = streak.freezeTokens
  let freezeTokensGrantedWeek = streak.freezeTokensGrantedWeek
  let currentLength = streak.currentLength
  let longestLength = streak.longestLength

  // Gap calculation uses the token count BEFORE the weekly grant
  // so a newly granted token cannot retroactively protect the current gap
  if (!streak.lastActiveDate) {
    currentLength = 1
  } else {
    const gap = daysBetween(streak.lastActiveDate, date)
    if (gap === 0) {
      // Same day — no change to streak length
    } else if (gap === 1) {
      currentLength += 1
    } else if (gap >= 2 && gap <= 7 && freezeTokens > 0) {
      freezeTokens -= 1
      currentLength += 1
    } else {
      currentLength = 1
    }
  }

  // Grant one freeze token on the first activity of each calendar week, cap at FREEZE_TOKEN_CAP
  const currentWeek = toIsoWeek(date)
  if (freezeTokensGrantedWeek !== currentWeek) {
    freezeTokens = Math.min(freezeTokens + 1, FREEZE_TOKEN_CAP)
    freezeTokensGrantedWeek = currentWeek
  }

  if (currentLength > longestLength) longestLength = currentLength

  return prisma.streakState.update({
    where: { studentId },
    data: {
      currentLength,
      longestLength,
      lastActiveDate: date,
      freezeTokens,
      freezeTokensGrantedWeek,
    },
  })
}
