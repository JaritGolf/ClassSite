/**
 * Class-level calibration trend over time.
 *
 * Reads ConfidenceCalibrationSnapshot rows where scope='overall' for all
 * students in the teacher's roster, aggregated by calendar week (default)
 * or calendar day (when granularity='day').
 * Falls back to live AttemptResponse data if no snapshots exist.
 *
 * Phase 10: Added granularity parameter ('day'|'week', default 'week' for
 * back-compat with Phase 9 callers). CalibrationTrendPoint.weekStart renamed
 * to bucketStart.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'
import type { GranularityType } from '@/lib/eoc-analytics/trend'

export interface CalibrationTrendPoint {
  bucketStart: Date
  /** 0..1, where 1 = perfect calibration (all high-confidence answers correct) */
  calibrationScore: number
}

export async function getClassCalibrationTrend(
  teacherUserId: string,
  granularity: GranularityType = 'week'
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
    // Aggregate by bucket (ISO week start Monday, or UTC calendar day)
    const byBucket = new Map<string, { correct: number; total: number; bucketStart: Date }>()

    for (const snap of snapshots) {
      const bucketStart = getBucketStart(snap.snapshotAt, granularity)
      const key = bucketStart.toISOString()
      const entry = byBucket.get(key) ?? { correct: 0, total: 0, bucketStart }
      entry.correct += snap.highConfidenceCorrect
      entry.total += snap.highConfidenceCorrect + snap.highConfidenceIncorrect
      byBucket.set(key, entry)
    }

    return Array.from(byBucket.values())
      .map((w) => ({
        bucketStart: w.bucketStart,
        calibrationScore: w.total === 0 ? 1 : w.correct / w.total,
      }))
      .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
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

  const byBucket = new Map<string, { correct: number; total: number; bucketStart: Date }>()
  for (const r of responses) {
    const bucketStart = getBucketStart(r.attempt.startedAt, granularity)
    const key = bucketStart.toISOString()
    const entry = byBucket.get(key) ?? { correct: 0, total: 0, bucketStart }
    entry.total++
    if (r.isCorrect) entry.correct++
    byBucket.set(key, entry)
  }

  return Array.from(byBucket.values())
    .map((w) => ({
      bucketStart: w.bucketStart,
      calibrationScore: w.total === 0 ? 1 : w.correct / w.total,
    }))
    .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
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

/** Return start of UTC calendar day. */
function getDayStart(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Return bucket start based on granularity. */
function getBucketStart(date: Date, granularity: GranularityType): Date {
  return granularity === 'day' ? getDayStart(date) : getWeekStart(date)
}
