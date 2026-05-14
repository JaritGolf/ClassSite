/**
 * Decay Detection
 *
 * Identifies benchmarks where a student's spaced-review quality is declining.
 * Also provides class-level decay aggregation for the teacher dashboard.
 *
 * Spec reference: Section 15.5 (Teacher View)
 *
 * "Decay" is defined as: the student's most recent review for a previously
 * mastered benchmark had quality < 3 (incorrect, or correct with low
 * confidence that still signals weak retention).
 *
 * Teacher views:
 *   - Per-class decay rate by benchmark (% of class showing recent quality < 3)
 *   - Per-student decay list ("benchmarks slipping")
 *   - Class-wide spike alerts (benchmark suddenly missing across many students)
 */

import { prisma } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DecayingBenchmark {
  benchmarkId: string
  benchmarkCode: string
  lastQuality: number
  lastReviewedAt: Date
  repetitionCount: number
}

export interface ClassDecayRate {
  benchmarkId: string
  benchmarkCode: string
  totalStudents: number
  decayingStudents: number
  decayRatePercent: number
  spikeAlert: boolean  // true if decayRatePercent >= SPIKE_THRESHOLD
}

/** Quality below this value signals decay (failed recall or low-confidence correct). */
const DECAY_QUALITY_THRESHOLD = 3

/**
 * Spike alert threshold: if >= 50% of the class is decaying on a benchmark,
 * flag a class-wide re-prime alert.
 */
const SPIKE_THRESHOLD_PERCENT = 50

// ── Per-student decay ─────────────────────────────────────────────────────────

/**
 * Return the list of benchmarks for which a student's most recent review
 * showed quality < 3 (decaying retention).
 *
 * Only benchmarks that have at least one review event are considered.
 *
 * @param studentId - The Student.id
 */
export async function getDecayingBenchmarks(
  studentId: string
): Promise<DecayingBenchmark[]> {
  // Pull all SpacedReviewState rows where lastQuality is set and < 3
  const decaying = await prisma.spacedReviewState.findMany({
    where: {
      studentId,
      lastQuality: { not: null, lt: DECAY_QUALITY_THRESHOLD },
    },
    select: {
      benchmarkId: true,
      lastQuality: true,
      lastReviewedAt: true,
      repetitionCount: true,
      benchmark: {
        select: { code: true },
      },
    },
    orderBy: { lastReviewedAt: 'desc' },
  })

  return decaying.map((row) => ({
    benchmarkId: row.benchmarkId,
    benchmarkCode: row.benchmark.code,
    lastQuality: row.lastQuality!,
    lastReviewedAt: row.lastReviewedAt!,
    repetitionCount: row.repetitionCount,
  }))
}

// ── Per-class decay ───────────────────────────────────────────────────────────

/**
 * Return class-level decay rates per benchmark for a teacher's class.
 *
 * Looks at all students in the teacher's classes and computes, per benchmark,
 * how many have lastQuality < 3 out of those who have reviewed at all.
 *
 * @param teacherId - The Teacher.id
 */
export async function getClassDecayRates(
  teacherId: string
): Promise<ClassDecayRate[]> {
  // Find all students enrolled in this teacher's classes
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      class: { teacherId },
    },
    select: { studentId: true },
  })

  if (enrollments.length === 0) return []

  const studentIds = enrollments.map((e) => e.studentId)

  // Pull all SpacedReviewState rows for these students where a review has occurred
  const states = await prisma.spacedReviewState.findMany({
    where: {
      studentId: { in: studentIds },
      lastQuality: { not: null }, // at least one review has occurred
    },
    select: {
      benchmarkId: true,
      lastQuality: true,
      benchmark: {
        select: { code: true },
      },
    },
  })

  // Aggregate per benchmark
  const byBenchmark = new Map<
    string,
    { code: string; total: number; decaying: number }
  >()

  for (const state of states) {
    const entry = byBenchmark.get(state.benchmarkId) ?? {
      code: state.benchmark.code,
      total: 0,
      decaying: 0,
    }
    entry.total++
    if (state.lastQuality! < DECAY_QUALITY_THRESHOLD) {
      entry.decaying++
    }
    byBenchmark.set(state.benchmarkId, entry)
  }

  return Array.from(byBenchmark.entries()).map(([benchmarkId, agg]) => {
    const decayRatePercent =
      agg.total === 0 ? 0 : Math.round((agg.decaying / agg.total) * 100)
    return {
      benchmarkId,
      benchmarkCode: agg.code,
      totalStudents: agg.total,
      decayingStudents: agg.decaying,
      decayRatePercent,
      spikeAlert: decayRatePercent >= SPIKE_THRESHOLD_PERCENT,
    }
  })
}
