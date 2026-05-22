/**
 * Class-level calibration trend over time.
 *
 * Reads ConfidenceCalibrationSnapshot rows where scope='overall' for all
 * students in the teacher's roster, aggregated by calendar week.
 * Falls back to live AttemptResponse data if no snapshots exist.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'

export interface CalibrationTrendPoint {
  weekStart: Date
  /** 0..1, where 1 = perfect calibration (all high-confidence answers correct) */
  calibrationScore: number
}

export async function getClassCalibrationTrend(
  teacherUserId: string
): Promise<CalibrationTrendPoint[]> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Try ConfidenceCalibrationSnapshot first (scope='overall', last 12 weeks)
  const cutoff = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000) // 12 weeks
  const snapshots = await prisma.confidenceCalibrationSnapshot.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      scope: 'overall',
      snapshotAt: { gte: cutoff },
    },
    select: {
      snapshotAt: true,
      highConfidenceCorrect: true,
      highConfidenceIncorrect: true,
    },
    orderBy: { snapshotAt: 'asc' },
  })

  if (snapshots.length > 0) {
    // Aggregate by ISO week start (Monday)
    const byWeek = new Map<string, { correct: number; total: number; weekStart: Date }>()

    for (const snap of snapshots) {
      const weekStart = getWeekStart(snap.snapshotAt)
      const key = weekStart.toISOString()
      const entry = byWeek.get(key) ?? { correct: 0, total: 0, weekStart }
      entry.correct += snap.highConfidenceCorrect
      entry.total += snap.highConfidenceCorrect + snap.highConfidenceIncorrect
      byWeek.set(key, entry)
    }

    return Array.from(byWeek.values())
      .map((w) => ({
        weekStart: w.weekStart,
        calibrationScore: w.total === 0 ? 1 : w.correct / w.total,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
  }

  // Fallback: live AttemptResponse data
  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: roster.allStudentIds },
        voided: false,
        startedAt: { gte: cutoff },
      },
      confidence: 2, // "Very sure" = high confidence
    },
    select: {
      isCorrect: true,
      attempt: { select: { startedAt: true } },
    },
    orderBy: { attempt: { startedAt: 'asc' } },
  })

  if (responses.length === 0) return []

  const byWeek = new Map<string, { correct: number; total: number; weekStart: Date }>()
  for (const r of responses) {
    const weekStart = getWeekStart(r.attempt.startedAt)
    const key = weekStart.toISOString()
    const entry = byWeek.get(key) ?? { correct: 0, total: 0, weekStart }
    entry.total++
    if (r.isCorrect) entry.correct++
    byWeek.set(key, entry)
  }

  return Array.from(byWeek.values())
    .map((w) => ({
      weekStart: w.weekStart,
      calibrationScore: w.total === 0 ? 1 : w.correct / w.total,
    }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
}

/** Return the Monday of the ISO week containing the given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
