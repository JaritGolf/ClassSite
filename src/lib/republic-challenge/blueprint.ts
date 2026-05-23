/**
 * Blueprint Allocation (Phase 11 / spec §30.3)
 *
 * Distribute a fixed `totalQuestions` across reporting categories proportional
 * to their EOC blueprint weights. Deterministic and pure.
 *
 * Audit 11 item 2: each category must land within ±5 percentage points of
 * its target weight for any `totalQuestions >= 10`.
 *
 * Algorithm:
 *   1. Compute raw quota = weight * totalQuestions per category.
 *   2. Floor each quota; track the fractional remainder.
 *   3. Distribute the leftover (totalQuestions - sum(floors)) one by one
 *      to the categories with the largest remainders (largest-remainder
 *      method, aka Hamilton's method).
 *
 * The result is deterministic for any given (totalQuestions, weights).
 * Sum of returned counts === totalQuestions.
 */

import { REPORTING_CATEGORY_WEIGHTS } from '@/lib/eoc-analytics/readiness'

export interface BlueprintAllocation {
  /** Map of category-name → number of questions. */
  counts: Record<string, number>
  /** Same data sorted; useful for deterministic UI output. */
  ordered: Array<{ name: string; count: number; weight: number }>
}

/**
 * Allocate `totalQuestions` across the categories in `weights`.
 *
 * @param totalQuestions  Must be >= 0.
 * @param weights         Defaults to the canonical REPORTING_CATEGORY_WEIGHTS.
 *                        Weights need not sum to 1 — they are normalised.
 */
export function allocateByBlueprint(
  totalQuestions: number,
  weights: Record<string, number> = REPORTING_CATEGORY_WEIGHTS
): BlueprintAllocation {
  if (totalQuestions < 0 || !Number.isFinite(totalQuestions)) {
    throw new Error(`allocateByBlueprint: totalQuestions must be >= 0 (got ${totalQuestions})`)
  }

  const entries = Object.entries(weights)
  if (entries.length === 0) {
    return { counts: {}, ordered: [] }
  }

  // Normalise so they sum to 1 (defensive against drift).
  const sum = entries.reduce((acc, [, w]) => acc + w, 0)
  const normalised = entries.map(([name, w]) => [name, w / sum] as const)

  // Stage 1: floor each quota and track remainders.
  const staged = normalised.map(([name, w]) => {
    const raw = w * totalQuestions
    const base = Math.floor(raw)
    return { name, weight: w, base, remainder: raw - base }
  })

  let assigned = staged.reduce((acc, s) => acc + s.base, 0)
  let leftover = totalQuestions - assigned

  // Stage 2: assign leftover to largest remainders.
  // Sort by remainder desc, then by name asc for determinism on ties.
  const order = [...staged].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder
    return a.name.localeCompare(b.name)
  })

  for (let i = 0; i < order.length && leftover > 0; i++) {
    order[i].base++
    leftover--
  }

  const counts: Record<string, number> = {}
  for (const s of staged) counts[s.name] = s.base

  const ordered = staged
    .map((s) => ({ name: s.name, count: counts[s.name], weight: s.weight }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))

  return { counts, ordered }
}

/**
 * Verify that an allocation lies within `tolerancePoints` percentage points
 * of its target weight for every category. Used by Audit 11 driver tests.
 *
 * @param allocation       Result of allocateByBlueprint.
 * @param totalQuestions   Same total passed to allocate.
 * @param tolerancePoints  e.g. 5 means each category must be within ±5
 *                         percentage points of its target weight.
 */
export function isWithinTolerance(
  allocation: BlueprintAllocation,
  totalQuestions: number,
  tolerancePoints: number = 5,
  weights: Record<string, number> = REPORTING_CATEGORY_WEIGHTS
): boolean {
  if (totalQuestions === 0) return true
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  for (const [name, weight] of Object.entries(weights)) {
    const targetPct = (weight / sum) * 100
    const actualPct = ((allocation.counts[name] ?? 0) / totalQuestions) * 100
    if (Math.abs(actualPct - targetPct) > tolerancePoints) return false
  }
  return true
}
