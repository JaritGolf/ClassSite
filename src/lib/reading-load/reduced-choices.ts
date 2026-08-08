/**
 * ACC-REDUCED-CHOICES — serve three answer choices instead of four.
 *
 * A common IEP/504 support: fewer plausible distractors lowers the working-memory
 * load of an item without changing what it asks. This code exists because the
 * accommodation was in the catalog, grantable, and audit-logged since Phase 12
 * with **no implementation at all** — a teacher could grant it to a student whose
 * IEP required it and reasonably believe it had taken effect.
 *
 * ── WHERE IT APPLIES, AND WHY THAT IS AN ALLOWLIST ──────────────────────────
 * Only on the practice-style types below. It must never touch an assessment that
 * decides mastery: dropping a distractor raises the floor on a random guess from
 * 25% to 33%, which would quietly change what the 80% mastery threshold means and
 * make one student's mastery non-comparable to another's.
 *
 * The eligible set is an ALLOWLIST rather than "everything except the secure
 * types" so that adding a new AssessmentType fails closed. A new type gets the
 * accommodation only when someone decides it should.
 *
 * ── GRADING SAFETY ──────────────────────────────────────────────────────────
 * The correct option is always retained; only distractors are dropped. Grading
 * matches on optionId, so a shorter list cannot mis-grade. Selection is seeded on
 * the same key the option shuffle uses, so a student sees the same three choices
 * on refresh rather than a fresh draw each time.
 *
 * The result must still be shuffled by the caller. Keeping the correct option in
 * a fixed slot would be an answer-key leak by position (rule #2).
 */

import { seededShuffle } from '@/lib/shuffle'

export const ACC_REDUCED_CHOICES_CODE = 'ACC-REDUCED-CHOICES'

/** How many choices a student with the accommodation sees. */
export const REDUCED_CHOICE_COUNT = 3

/**
 * Assessment types on which reduced choices may be served.
 * Deliberately excludes every type in SECURE_ASSESSMENT_TYPES.
 */
export const REDUCED_CHOICES_ELIGIBLE_TYPES: ReadonlySet<string> = new Set([
  'PRACTICE',
  'PRE_CHECK',
  'VOCAB_CHECK',
  'UNIT_REVIEW',
])

export function isReducedChoicesEligibleType(assessmentType: string): boolean {
  return REDUCED_CHOICES_ELIGIBLE_TYPES.has(assessmentType)
}

/**
 * Drop distractors down to REDUCED_CHOICE_COUNT, always keeping the correct one.
 *
 * Returns the input unchanged when:
 *   - it is already at or below the target count, or
 *   - no correct option is identifiable among them (fail open rather than risk
 *     removing the only right answer — a four-choice item is a working item; an
 *     item with no correct answer is a broken one).
 */
export function reduceChoices<T extends { id: string }>(
  options: T[],
  correctOptionIds: ReadonlySet<string>,
  seed: string,
  targetCount: number = REDUCED_CHOICE_COUNT
): T[] {
  if (options.length <= targetCount) return options

  const correct = options.filter((o) => correctOptionIds.has(o.id))
  if (correct.length === 0) return options

  // Multi-select items would need every correct option kept; if that alone meets
  // or exceeds the target there is nothing safe left to drop.
  if (correct.length >= targetCount) return options

  const distractors = options.filter((o) => !correctOptionIds.has(o.id))
  const keptDistractors = seededShuffle(distractors, `reduced:${seed}`).slice(
    0,
    targetCount - correct.length
  )

  const keep = new Set([...correct, ...keptDistractors].map((o) => o.id))

  // Preserve the caller's incoming order; the caller shuffles afterwards.
  return options.filter((o) => keep.has(o.id))
}
