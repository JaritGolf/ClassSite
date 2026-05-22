/**
 * Spaced-retrieval health for a specific benchmark across the class.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'

export interface BenchmarkSpacedHealth {
  totalStudents: number
  decayingStudents: number
  decayRatePercent: number
  avgIntervalDays: number
  itemsDueNow: number
}

const DECAY_QUALITY_THRESHOLD = 3

export async function getBenchmarkSpacedHealth(
  teacherUserId: string,
  benchmarkId: string
): Promise<BenchmarkSpacedHealth> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)

  if (roster.allStudentIds.length === 0) {
    return {
      totalStudents: 0,
      decayingStudents: 0,
      decayRatePercent: 0,
      avgIntervalDays: 0,
      itemsDueNow: 0,
    }
  }

  const states = await prisma.spacedReviewState.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      benchmarkId,
      lastQuality: { not: null }, // at least one review
    },
    select: {
      lastQuality: true,
      intervalDays: true,
      dueAt: true,
    },
  })

  if (states.length === 0) {
    return {
      totalStudents: 0,
      decayingStudents: 0,
      decayRatePercent: 0,
      avgIntervalDays: 0,
      itemsDueNow: 0,
    }
  }

  const now = new Date()
  let decaying = 0
  let totalInterval = 0
  let dueNow = 0

  for (const s of states) {
    if (s.lastQuality! < DECAY_QUALITY_THRESHOLD) decaying++
    totalInterval += s.intervalDays
    if (s.dueAt <= now) dueNow++
  }

  const totalStudents = states.length
  return {
    totalStudents,
    decayingStudents: decaying,
    decayRatePercent: Math.round((decaying / totalStudents) * 100),
    avgIntervalDays: Math.round(totalInterval / totalStudents),
    itemsDueNow: dueNow,
  }
}
