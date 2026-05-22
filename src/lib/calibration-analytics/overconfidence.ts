/**
 * Overconfidence detection.
 *
 * For each student in the roster, computes the gap between:
 *   highConfidenceRate — always 1.0 (by definition: these were all "Very sure")
 *   highConfidenceAccuracy — fraction of "Very sure" answers that were correct
 *
 * gap = highConfidenceRate - highConfidenceAccuracy
 *
 * Students with gap >= threshold (default 0.3) are overconfident.
 * Minimum sample size: 5 high-confidence responses.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'

export interface OverconfidenceRow {
  studentId: string
  displayName: string
  gap: number
  sampleSize: number
}

const MIN_SAMPLE = 5

export async function getOverconfidenceStudents(
  teacherUserId: string,
  gapThreshold = 0.3
): Promise<OverconfidenceRow[]> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Pull the most recent 20 responses per student where confidence=2 ("Very sure")
  // We over-fetch then slice per student in JS to avoid complex lateral joins.
  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: roster.allStudentIds },
        voided: false,
      },
      confidence: 2,
    },
    select: {
      isCorrect: true,
      attempt: {
        select: {
          studentId: true,
          startedAt: true,
        },
      },
    },
    orderBy: { attempt: { startedAt: 'desc' } },
    // Fetch up to 20 per student — take roster×20 total
    take: roster.allStudentIds.length * 20,
  })

  // Group by student, keep only last 20 per student
  const byStudent = new Map<string, { correct: number; total: number }>()

  for (const r of responses) {
    const sid = r.attempt.studentId
    const entry = byStudent.get(sid) ?? { correct: 0, total: 0 }
    if (entry.total < 20) {
      entry.total++
      if (r.isCorrect) entry.correct++
      byStudent.set(sid, entry)
    }
  }

  // Identify overconfident students
  const overconfidentIds: string[] = []
  const gapBySid = new Map<string, { gap: number; sampleSize: number }>()

  for (const [sid, stats] of byStudent.entries()) {
    if (stats.total < MIN_SAMPLE) continue
    const highConfAccuracy = stats.correct / stats.total
    // highConfidenceRate is always 1.0 (they were all "Very sure")
    const gap = 1.0 - highConfAccuracy
    if (gap >= gapThreshold) {
      overconfidentIds.push(sid)
      gapBySid.set(sid, { gap: Math.round(gap * 1000) / 1000, sampleSize: stats.total })
    }
  }

  if (overconfidentIds.length === 0) return []

  const students = await prisma.student.findMany({
    where: { id: { in: overconfidentIds } },
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
  })

  return students.map((s) => {
    const g = gapBySid.get(s.id)!
    return {
      studentId: s.id,
      displayName: `${s.user.firstName} ${s.user.lastName}`,
      gap: g.gap,
      sampleSize: g.sampleSize,
    }
  })
}
