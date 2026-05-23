/**
 * EOC Readiness Engine
 *
 * Computes student and class-level EOC readiness by reporting category.
 * Uses Wilson 95% confidence intervals to bound readiness estimates.
 *
 * Spec reference: Section 20 (EOC Analytics), Section 7.3 (Blueprint Weights)
 */

import { prisma } from '@/lib/db'

// ── Blueprint Weights ──────────────────────────────────────────────────────────

/**
 * EOC blueprint weights per reporting category (spec §7.3).
 * Keyed by ReportingCategory.name (case-insensitive substring match).
 * Midpoints of each blueprint range.
 */
export const REPORTING_CATEGORY_WEIGHTS: Record<string, number> = {
  'Origins and Purposes': 0.275,          // 25-30% midpoint
  'Roles, Rights, and Responsibilities': 0.275,
  'Government Policies': 0.175,           // 15-20% midpoint
  'Organization and Function': 0.225,     // 20-25% midpoint
}

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ReadinessByCategory {
  reportingCategoryId: string
  name: string
  weight: number
  masteredCount: number
  totalBenchmarks: number
  readinessPercent: number   // 0..100
  readinessLow: number       // 0..100, Wilson 95% CI low
  readinessHigh: number      // 0..100, Wilson 95% CI high
}

export interface StudentReadiness {
  studentId: string
  byCategory: ReadinessByCategory[]
  overallPercent: number   // weighted across categories
  overallLow: number
  overallHigh: number
}

export interface ClassReadiness {
  classId: string
  byCategory: ReadinessByCategory[]
  overallPercent: number
  studentCount: number
}

// ── Pure Helpers ───────────────────────────────────────────────────────────────

/**
 * Wilson 95% confidence interval for a binomial proportion.
 * Returns {low, high} in [0..1].
 *
 * Edge cases:
 *   - total === 0: returns {low: 0, high: 0}
 *   - successes === total: returns {low: Wilson lower, high: 1.0}
 */
export function wilsonInterval(
  successes: number,
  total: number,
  z: number = 1.96
): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 0 }
  const p = successes / total
  const denominator = 1 + (z * z) / total
  const centre = p + (z * z) / (2 * total)
  const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))
  const low = Math.max(0, (centre - spread) / denominator)
  const high = Math.min(1, (centre + spread) / denominator)
  return { low, high }
}

/**
 * Find the weight for a category name by case-insensitive substring match.
 * Returns 0.25 as a fallback if no match found.
 */
export function weightForCategoryName(name: string): number {
  const nameLower = name.toLowerCase()
  for (const [key, weight] of Object.entries(REPORTING_CATEGORY_WEIGHTS)) {
    if (nameLower.includes(key.toLowerCase())) return weight
  }
  // Fallback: equal weight
  return 0.25
}

// ── Student Readiness ──────────────────────────────────────────────────────────

/**
 * Compute EOC readiness for a single student.
 * Pulls all StudentProgress rows joined through Benchmark.reportingCategoryId.
 * Per category: masteredCount / totalBenchmarks → readinessPercent.
 */
export async function computeStudentReadiness(studentId: string): Promise<StudentReadiness> {
  // Load all reporting categories with their benchmarks
  const categories = await prisma.reportingCategory.findMany({
    select: {
      id: true,
      name: true,
      benchmarks: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  })

  // Load all mastered progress rows for this student
  const masteredProgress = await prisma.studentProgress.findMany({
    where: {
      studentId,
      status: 'MASTERED',
    },
    select: {
      benchmarkId: true,
      benchmark: { select: { reportingCategoryId: true } },
    },
  })

  // Build a set of mastered benchmark IDs per reporting category
  const masteredByRC = new Map<string, Set<string>>()
  for (const prog of masteredProgress) {
    const rcId = prog.benchmark.reportingCategoryId
    const set = masteredByRC.get(rcId) ?? new Set()
    set.add(prog.benchmarkId)
    masteredByRC.set(rcId, set)
  }

  // Compute per-category readiness
  const byCategory: ReadinessByCategory[] = categories.map((rc) => {
    const totalBenchmarks = rc.benchmarks.length
    const masteredCount = masteredByRC.get(rc.id)?.size ?? 0
    const wi = wilsonInterval(masteredCount, totalBenchmarks)
    const weight = weightForCategoryName(rc.name)
    return {
      reportingCategoryId: rc.id,
      name: rc.name,
      weight,
      masteredCount,
      totalBenchmarks,
      readinessPercent: totalBenchmarks === 0 ? 0 : (masteredCount / totalBenchmarks) * 100,
      readinessLow: wi.low * 100,
      readinessHigh: wi.high * 100,
    }
  })

  // Compute weighted overall — normalize weights to sum=1
  const totalWeight = byCategory.reduce((sum, rc) => sum + rc.weight, 0)
  const overallPercent =
    totalWeight === 0
      ? 0
      : byCategory.reduce((sum, rc) => sum + (rc.readinessPercent * rc.weight) / totalWeight, 0)

  // Aggregate Wilson interval for overall (weighted average of midpoints)
  const totalBenchmarks = byCategory.reduce((sum, rc) => sum + rc.totalBenchmarks, 0)
  const totalMastered = byCategory.reduce((sum, rc) => sum + rc.masteredCount, 0)
  const overallWi = wilsonInterval(totalMastered, totalBenchmarks)

  return {
    studentId,
    byCategory,
    overallPercent,
    overallLow: overallWi.low * 100,
    overallHigh: overallWi.high * 100,
  }
}

// ── Class Readiness ────────────────────────────────────────────────────────────

/**
 * Compute aggregate EOC readiness for a class.
 * Averages mastery rates across all enrolled students per reporting category.
 */
export async function computeClassReadiness(classId: string): Promise<ClassReadiness> {
  // Get all enrolled students
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId, status: 'ACTIVE' },
    select: { studentId: true },
  })
  const studentIds = enrollments.map((e) => e.studentId)
  const studentCount = studentIds.length

  // Load all reporting categories
  const categories = await prisma.reportingCategory.findMany({
    select: {
      id: true,
      name: true,
      benchmarks: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  })

  if (studentCount === 0) {
    const byCategory: ReadinessByCategory[] = categories.map((rc) => {
      const weight = weightForCategoryName(rc.name)
      return {
        reportingCategoryId: rc.id,
        name: rc.name,
        weight,
        masteredCount: 0,
        totalBenchmarks: rc.benchmarks.length,
        readinessPercent: 0,
        readinessLow: 0,
        readinessHigh: 0,
      }
    })
    return { classId, byCategory, overallPercent: 0, studentCount: 0 }
  }

  // Load all mastered progress for enrolled students
  const masteredProgress = await prisma.studentProgress.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'MASTERED',
    },
    select: {
      studentId: true,
      benchmarkId: true,
      benchmark: { select: { reportingCategoryId: true } },
    },
  })

  // For class-level: count (student, benchmark) mastered pairs per RC
  // masteredCount = number of students who mastered at least one benchmark in this RC
  // Actually use total mastered benchmark-student pairs / (totalBenchmarks * studentCount)
  const masteredPairsByRC = new Map<string, number>()
  for (const prog of masteredProgress) {
    const rcId = prog.benchmark.reportingCategoryId
    masteredPairsByRC.set(rcId, (masteredPairsByRC.get(rcId) ?? 0) + 1)
  }

  const byCategory: ReadinessByCategory[] = categories.map((rc) => {
    const totalBenchmarks = rc.benchmarks.length
    const totalPossible = totalBenchmarks * studentCount
    const masteredPairs = masteredPairsByRC.get(rc.id) ?? 0
    const wi = wilsonInterval(masteredPairs, totalPossible)
    const weight = weightForCategoryName(rc.name)
    return {
      reportingCategoryId: rc.id,
      name: rc.name,
      weight,
      masteredCount: masteredPairs,
      totalBenchmarks: totalPossible,
      readinessPercent: totalPossible === 0 ? 0 : (masteredPairs / totalPossible) * 100,
      readinessLow: wi.low * 100,
      readinessHigh: wi.high * 100,
    }
  })

  const totalWeight = byCategory.reduce((sum, rc) => sum + rc.weight, 0)
  const overallPercent =
    totalWeight === 0
      ? 0
      : byCategory.reduce((sum, rc) => sum + (rc.readinessPercent * rc.weight) / totalWeight, 0)

  return { classId, byCategory, overallPercent, studentCount }
}
