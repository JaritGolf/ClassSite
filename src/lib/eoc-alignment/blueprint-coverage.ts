/**
 * Blueprint Coverage (spec §13.2, §29 getBlueprintCoverage).
 *
 * Computes how a benchmark's question bank is distributed across reading-load
 * levels and cognitive complexity, vs. the spec target distribution, with a
 * within-tolerance flag. Pure compute over a question list (DB read kept thin
 * in getBlueprintCoverage).
 */

import { prisma } from '@/lib/db'

// Spec §13.2 targets (fractions).
export const READING_LOAD_TARGETS: Record<'1' | '2' | '3', number> = {
  '1': 0.3,
  '2': 0.5,
  '3': 0.2,
}
export const COMPLEXITY_TARGETS: Record<'LOW' | 'MODERATE' | 'HIGH', number> = {
  LOW: 0.2,
  MODERATE: 0.55,
  HIGH: 0.25,
}

/** Allowed absolute deviation from target before a bucket is flagged. */
export const DEFAULT_TOLERANCE = 0.1

export interface CoverageBucket {
  key: string
  count: number
  actual: number // fraction 0..1
  target: number // fraction 0..1
  withinTolerance: boolean
}

export interface BlueprintCoverage {
  benchmarkId: string
  total: number
  readingLoad: CoverageBucket[]
  complexity: CoverageBucket[]
}

interface CoverageQuestion {
  readingLoadLevel: number
  cognitiveComplexity: 'LOW' | 'MODERATE' | 'HIGH' | string
}

function buildBuckets(
  total: number,
  counts: Record<string, number>,
  targets: Record<string, number>,
  tolerance: number
): CoverageBucket[] {
  return Object.entries(targets).map(([key, target]) => {
    const count = counts[key] ?? 0
    const actual = total === 0 ? 0 : count / total
    return {
      key,
      count,
      actual: Math.round(actual * 1000) / 1000,
      target,
      withinTolerance: Math.abs(actual - target) <= tolerance,
    }
  })
}

/** Pure: compute coverage from an in-memory question list. */
export function computeBlueprintCoverage(
  benchmarkId: string,
  questions: CoverageQuestion[],
  tolerance = DEFAULT_TOLERANCE
): BlueprintCoverage {
  const total = questions.length

  const rlCounts: Record<string, number> = {}
  const cxCounts: Record<string, number> = {}
  for (const q of questions) {
    const rl = String(q.readingLoadLevel)
    rlCounts[rl] = (rlCounts[rl] ?? 0) + 1
    cxCounts[q.cognitiveComplexity] = (cxCounts[q.cognitiveComplexity] ?? 0) + 1
  }

  return {
    benchmarkId,
    total,
    readingLoad: buildBuckets(total, rlCounts, READING_LOAD_TARGETS, tolerance),
    complexity: buildBuckets(total, cxCounts, COMPLEXITY_TARGETS, tolerance),
  }
}

/** DB-backed: load a benchmark's active approved questions and compute coverage. */
export async function getBlueprintCoverage(
  benchmarkId: string,
  tolerance = DEFAULT_TOLERANCE
): Promise<BlueprintCoverage> {
  const questions = await prisma.question.findMany({
    where: { benchmarkId, active: true },
    select: { readingLoadLevel: true, cognitiveComplexity: true },
  })
  return computeBlueprintCoverage(benchmarkId, questions, tolerance)
}
