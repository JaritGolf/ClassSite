/**
 * Benchmark performance broken down by reading-load level, cognitive complexity,
 * and stimulus type.
 *
 * All computations are scoped to the teacher's roster students.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'

export interface DimensionBreakdown<K extends string> {
  rows: Array<{ key: K; correctRate: number; sampleSize: number }>
}

export async function getPerformanceByReadingLoad(
  teacherUserId: string,
  benchmarkId: string
): Promise<DimensionBreakdown<'1' | '2' | '3'>> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return { rows: [] }

  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: roster.allStudentIds },
        voided: false,
      },
      question: { benchmarkId },
    },
    select: {
      isCorrect: true,
      question: { select: { readingLoadLevel: true } },
    },
  })

  const byLevel = new Map<number, { correct: number; total: number }>()
  for (const r of responses) {
    const level = r.question.readingLoadLevel
    const entry = byLevel.get(level) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byLevel.set(level, entry)
  }

  const rows = ([1, 2, 3] as const).map((level) => {
    const agg = byLevel.get(level) ?? { correct: 0, total: 0 }
    return {
      key: String(level) as '1' | '2' | '3',
      correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
      sampleSize: agg.total,
    }
  })

  return { rows }
}

export async function getPerformanceByComplexity(
  teacherUserId: string,
  benchmarkId: string
): Promise<DimensionBreakdown<'LOW' | 'MODERATE' | 'HIGH'>> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return { rows: [] }

  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: roster.allStudentIds },
        voided: false,
      },
      question: { benchmarkId },
    },
    select: {
      isCorrect: true,
      question: { select: { cognitiveComplexity: true } },
    },
  })

  const byComplexity = new Map<string, { correct: number; total: number }>()
  for (const r of responses) {
    const key = r.question.cognitiveComplexity as string
    const entry = byComplexity.get(key) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byComplexity.set(key, entry)
  }

  const rows = (['LOW', 'MODERATE', 'HIGH'] as const).map((level) => {
    const agg = byComplexity.get(level) ?? { correct: 0, total: 0 }
    return {
      key: level,
      correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
      sampleSize: agg.total,
    }
  })

  return { rows }
}

export async function getPerformanceByStimulusType(
  teacherUserId: string,
  benchmarkId: string
): Promise<DimensionBreakdown<string>> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return { rows: [] }

  // Questions without a stimulus are grouped under "NONE"
  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: roster.allStudentIds },
        voided: false,
      },
      question: { benchmarkId },
    },
    select: {
      isCorrect: true,
      question: {
        select: {
          stimulus: { select: { stimulusType: true } },
        },
      },
    },
  })

  const byStimulusType = new Map<string, { correct: number; total: number }>()
  for (const r of responses) {
    const key = r.question.stimulus?.stimulusType ?? 'NONE'
    const entry = byStimulusType.get(key) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byStimulusType.set(key, entry)
  }

  const rows = Array.from(byStimulusType.entries()).map(([key, agg]) => ({
    key,
    correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
    sampleSize: agg.total,
  }))

  return { rows }
}
