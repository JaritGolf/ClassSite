/**
 * Per-student calibration series for the teacher's student profile view.
 */

import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass } from '@/lib/teacher-roster'
import type { CalibrationTrendPoint } from './class-trend'

export interface CalibrationSeries {
  studentId: string
  points: CalibrationTrendPoint[]
  overallGap: number
}

/** Return the Monday of the ISO week containing the given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function getCalibrationByStudent(
  teacherUserId: string,
  studentId: string
): Promise<CalibrationSeries> {
  await assertStudentInTeacherClass(teacherUserId, studentId)

  // Try snapshots first
  const cutoff = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
  const snapshots = await prisma.confidenceCalibrationSnapshot.findMany({
    where: {
      studentId,
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

  let points: CalibrationTrendPoint[] = []

  if (snapshots.length > 0) {
    const byWeek = new Map<string, { correct: number; total: number; weekStart: Date }>()
    for (const snap of snapshots) {
      const weekStart = getWeekStart(snap.snapshotAt)
      const key = weekStart.toISOString()
      const entry = byWeek.get(key) ?? { correct: 0, total: 0, weekStart }
      entry.correct += snap.highConfidenceCorrect
      entry.total += snap.highConfidenceCorrect + snap.highConfidenceIncorrect
      byWeek.set(key, entry)
    }
    points = Array.from(byWeek.values())
      .map((w) => ({
        weekStart: w.weekStart,
        calibrationScore: w.total === 0 ? 1 : w.correct / w.total,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
  } else {
    // Fallback to live responses
    const responses = await prisma.attemptResponse.findMany({
      where: {
        attempt: {
          studentId,
          voided: false,
          startedAt: { gte: cutoff },
        },
        confidence: 2,
      },
      select: {
        isCorrect: true,
        attempt: { select: { startedAt: true } },
      },
      orderBy: { attempt: { startedAt: 'asc' } },
    })

    const byWeek = new Map<string, { correct: number; total: number; weekStart: Date }>()
    for (const r of responses) {
      const weekStart = getWeekStart(r.attempt.startedAt)
      const key = weekStart.toISOString()
      const entry = byWeek.get(key) ?? { correct: 0, total: 0, weekStart }
      entry.total++
      if (r.isCorrect) entry.correct++
      byWeek.set(key, entry)
    }
    points = Array.from(byWeek.values())
      .map((w) => ({
        weekStart: w.weekStart,
        calibrationScore: w.total === 0 ? 1 : w.correct / w.total,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
  }

  // Overall gap: pull last 20 high-confidence responses
  const highConfResponses = await prisma.attemptResponse.findMany({
    where: {
      attempt: { studentId, voided: false },
      confidence: 2,
    },
    select: { isCorrect: true },
    orderBy: { attempt: { startedAt: 'desc' } },
    take: 20,
  })

  const totalHigh = highConfResponses.length
  const correctHigh = highConfResponses.filter((r) => r.isCorrect).length
  const overallGap =
    totalHigh === 0 ? 0 : Math.round((1.0 - correctHigh / totalHigh) * 1000) / 1000

  return { studentId, points, overallGap }
}
