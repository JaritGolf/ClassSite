/**
 * EOC Analytics — Dimension Breakdowns
 *
 * Aggregate-across-benchmarks dimension breakdowns at class & student scope.
 * Phase 9's benchmark-analytics covers per-benchmark dimensions.
 * Phase 10 adds cross-benchmark aggregation here.
 *
 * Spec reference: Section 20.2 (Dimension Analysis)
 */

import { prisma } from '@/lib/db'

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ClassDimensionBreakdown {
  readingLoad: Array<{ key: '1' | '2' | '3'; correctRate: number; sampleSize: number }>
  complexity: Array<{ key: 'LOW' | 'MODERATE' | 'HIGH'; correctRate: number; sampleSize: number }>
  stimulusType: Array<{ key: string; correctRate: number; sampleSize: number }>
}

export interface StudentDimensionBreakdown extends ClassDimensionBreakdown {
  studentId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type AggMap = Map<string, { correct: number; total: number }>

function buildRateRow<K extends string>(
  map: AggMap,
  key: K
): { key: K; correctRate: number; sampleSize: number } {
  const agg = map.get(key) ?? { correct: 0, total: 0 }
  return {
    key,
    correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
    sampleSize: agg.total,
  }
}

function aggregateResponses(
  responses: Array<{
    isCorrect: boolean
    question: {
      readingLoadLevel: number
      cognitiveComplexity: string
      stimulus: { stimulusType: string } | null
    }
  }>
): {
  readingLoadMap: AggMap
  complexityMap: AggMap
  stimulusMap: AggMap
} {
  const readingLoadMap: AggMap = new Map()
  const complexityMap: AggMap = new Map()
  const stimulusMap: AggMap = new Map()

  for (const r of responses) {
    // Reading load
    const rlKey = String(r.question.readingLoadLevel)
    const rlEntry = readingLoadMap.get(rlKey) ?? { correct: 0, total: 0 }
    rlEntry.total++
    if (r.isCorrect) rlEntry.correct++
    readingLoadMap.set(rlKey, rlEntry)

    // Complexity
    const cxKey = r.question.cognitiveComplexity
    const cxEntry = complexityMap.get(cxKey) ?? { correct: 0, total: 0 }
    cxEntry.total++
    if (r.isCorrect) cxEntry.correct++
    complexityMap.set(cxKey, cxEntry)

    // Stimulus type
    const stKey = r.question.stimulus?.stimulusType ?? 'NONE'
    const stEntry = stimulusMap.get(stKey) ?? { correct: 0, total: 0 }
    stEntry.total++
    if (r.isCorrect) stEntry.correct++
    stimulusMap.set(stKey, stEntry)
  }

  return { readingLoadMap, complexityMap, stimulusMap }
}

function buildBreakdown(
  readingLoadMap: AggMap,
  complexityMap: AggMap,
  stimulusMap: AggMap
): Omit<ClassDimensionBreakdown, never> {
  const readingLoad = (['1', '2', '3'] as const).map((key) =>
    buildRateRow(readingLoadMap, key)
  )

  const complexity = (['LOW', 'MODERATE', 'HIGH'] as const).map((key) =>
    buildRateRow(complexityMap, key)
  )

  const stimulusType = Array.from(stimulusMap.entries()).map(([key, agg]) => ({
    key,
    correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
    sampleSize: agg.total,
  }))

  return { readingLoad, complexity, stimulusType }
}

// ── Class Breakdown ────────────────────────────────────────────────────────────

/**
 * Aggregate dimension breakdown for all students in a class.
 * Pulls AttemptResponse rows joined to AssessmentAttempt (voided=false) and Question.
 * Buckets by readingLoadLevel, cognitiveComplexity, and stimulusType.
 */
export async function getDimensionBreakdownForClass(classId: string): Promise<ClassDimensionBreakdown> {
  // Get enrolled students
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId },
    select: { studentId: true },
  })
  const studentIds = enrollments.map((e) => e.studentId)

  if (studentIds.length === 0) {
    return {
      readingLoad: (['1', '2', '3'] as const).map((key) => ({ key, correctRate: 0, sampleSize: 0 })),
      complexity: (['LOW', 'MODERATE', 'HIGH'] as const).map((key) => ({ key, correctRate: 0, sampleSize: 0 })),
      stimulusType: [],
    }
  }

  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: studentIds },
        voided: false,
      },
    },
    select: {
      isCorrect: true,
      question: {
        select: {
          readingLoadLevel: true,
          cognitiveComplexity: true,
          stimulus: { select: { stimulusType: true } },
        },
      },
    },
  })

  const { readingLoadMap, complexityMap, stimulusMap } = aggregateResponses(responses)
  return buildBreakdown(readingLoadMap, complexityMap, stimulusMap)
}

// ── Student Breakdown ──────────────────────────────────────────────────────────

/**
 * Aggregate dimension breakdown for a single student.
 * Filters out voided attempts.
 */
export async function getDimensionBreakdownForStudent(studentId: string): Promise<StudentDimensionBreakdown> {
  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId,
        voided: false,
      },
    },
    select: {
      isCorrect: true,
      question: {
        select: {
          readingLoadLevel: true,
          cognitiveComplexity: true,
          stimulus: { select: { stimulusType: true } },
        },
      },
    },
  })

  const { readingLoadMap, complexityMap, stimulusMap } = aggregateResponses(responses)
  const breakdown = buildBreakdown(readingLoadMap, complexityMap, stimulusMap)
  return { studentId, ...breakdown }
}
