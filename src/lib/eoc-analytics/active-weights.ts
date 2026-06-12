/**
 * Active EOC Blueprint Weights — Calibration Loop closure (Phase 13)
 *
 * Phase 10 stored admin-approved calibration weights in
 * EocCalibrationRun.recommendedWeightChanges but readiness scoring still used the
 * hard-coded REPORTING_CATEGORY_WEIGHTS constant, leaving the calibration loop OPEN.
 *
 * This module closes the loop: readiness scoring now reads the **latest
 * admin-approved (applied=true) calibration run** and uses its recommended weights.
 * If no run has been approved yet (year one / pre-calibration), it falls back to the
 * canonical blueprint constant.
 *
 * NON-NEGOTIABLE COMPLIANCE: This is NOT auto-applying calibration. Only runs an
 * admin has explicitly approved (applied=true via approveCalibrationRun) are ever
 * read. The REPORTING_CATEGORY_WEIGHTS constant is never mutated — it remains the
 * immutable blueprint baseline that recommendations are computed against.
 *
 * Spec reference: Section 20.5 (Calibration Feedback Loop)
 */

import { prisma } from '@/lib/db'
import { REPORTING_CATEGORY_WEIGHTS } from './readiness'

// ── Types ────────────────────────────────────────────────────────────────────

/** Shape of a single entry in EocCalibrationRun.recommendedWeightChanges JSON. */
interface WeightChangeEntry {
  current: number
  recommended: number
  deltaPercent: number
}

export interface ActiveWeightSource {
  /** 'calibrated' if a run has been approved; 'default' for the blueprint baseline. */
  source: 'calibrated' | 'default'
  /** Reporting-category-name → active weight (sums to ~1.0). */
  weights: Record<string, number>
  /** The approved run backing these weights, if source === 'calibrated'. */
  runId?: string
  schoolYear?: string
  appliedAt?: Date
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve the weight for a reporting-category name against a weight map, using a
 * case-insensitive substring match (mirrors readiness.weightForCategoryName).
 * Falls back to 0.25 (equal weight) when no key matches.
 */
export function resolveCategoryWeight(
  name: string,
  weights: Record<string, number>
): number {
  const nameLower = name.toLowerCase()
  for (const [key, weight] of Object.entries(weights)) {
    if (nameLower.includes(key.toLowerCase())) return weight
  }
  return 0.25
}

/**
 * Build a {name → weight} map from a run's recommendedWeightChanges JSON.
 * Returns null if the JSON is missing/malformed so callers can fall back.
 */
export function weightsFromRecommendedChanges(
  recommendedWeightChanges: unknown
): Record<string, number> | null {
  if (
    recommendedWeightChanges === null ||
    typeof recommendedWeightChanges !== 'object' ||
    Array.isArray(recommendedWeightChanges)
  ) {
    return null
  }

  const out: Record<string, number> = {}
  for (const [name, entry] of Object.entries(
    recommendedWeightChanges as Record<string, unknown>
  )) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as WeightChangeEntry).recommended === 'number' &&
      Number.isFinite((entry as WeightChangeEntry).recommended)
    ) {
      out[name] = (entry as WeightChangeEntry).recommended
    }
  }

  return Object.keys(out).length > 0 ? out : null
}

// ── DB-backed resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the currently active blueprint weights and their provenance.
 * Reads the most recently applied (admin-approved) EocCalibrationRun.
 */
export async function getActiveWeightSource(): Promise<ActiveWeightSource> {
  const latestApplied = await prisma.eocCalibrationRun.findFirst({
    where: { applied: true },
    orderBy: { runAt: 'desc' },
    select: {
      id: true,
      schoolYear: true,
      runAt: true,
      recommendedWeightChanges: true,
    },
  })

  if (latestApplied) {
    const weights = weightsFromRecommendedChanges(latestApplied.recommendedWeightChanges)
    if (weights) {
      return {
        source: 'calibrated',
        weights,
        runId: latestApplied.id,
        schoolYear: latestApplied.schoolYear,
        appliedAt: latestApplied.runAt,
      }
    }
  }

  return { source: 'default', weights: { ...REPORTING_CATEGORY_WEIGHTS } }
}

/**
 * Convenience: just the active {name → weight} map (calibrated if approved, else
 * the blueprint baseline). Used by readiness scoring.
 */
export async function getActiveCategoryWeights(): Promise<Record<string, number>> {
  const { weights } = await getActiveWeightSource()
  return weights
}
