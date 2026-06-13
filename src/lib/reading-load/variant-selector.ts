/**
 * Reading-Load Variant Selector — Pure Functions
 *
 * No DB imports. No Next.js imports.
 * All functions are pure and independently testable.
 *
 * Spec reference: Section 16 (Reading-Load Ladder)
 */

import type { ApprovalStatus } from '@prisma/client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface VariantLike {
  readingLoadLevel: number
  content: string
  approvalStatus: ApprovalStatus
}

export interface StimulusLike {
  content: string
  readingLoadLevel: number
  variants: VariantLike[]
}

export interface GlossaryTerm {
  term: string
  definition: string
  tier: 'TIER_2' | 'TIER_3'
  /** Approved L1 (first-language) gloss, when available for the active language. */
  l1Definition?: string
  /** BCP-47-ish language code of the L1 gloss (e.g. 'es', 'ht'). */
  l1Language?: string
}

export interface GlossaryAnnotation {
  matchText: string
  definition: string
  tier: 'TIER_2' | 'TIER_3'
  l1Definition?: string
  l1Language?: string
}

export interface VariantSelection {
  content: string
  resolvedLevel: number
  fromVariant: boolean
}

// ── Accommodation codes that trigger level-1 default ──────────────────────
// Shared between variant-selector (pure) and accommodation.ts (DB)

export const LEVEL_1_ACCOMMODATION_CODES = new Set([
  'ACC-SIMPLE-LANG',
  'ELL',
  'BELOW-GRADE-READER',
])

// ── selectVariantContent ───────────────────────────────────────────────────

/**
 * Given a stimulus and a requested reading-load level, return the best
 * matching content.
 *
 * Selection priority:
 *   1. Exact APPROVED variant at `requestedLevel`
 *   2. Base stimulus content (fallback — always available)
 *
 * The `resolvedLevel` field tells callers what level was actually served
 * (may differ from `requestedLevel` when no variant is available).
 */
export function selectVariantContent(
  stimulus: StimulusLike,
  requestedLevel: number
): VariantSelection {
  // Only APPROVED variants are eligible
  const approvedVariants = stimulus.variants.filter(
    (v) => v.approvalStatus === 'APPROVED'
  )

  // Try exact match first
  const exactMatch = approvedVariants.find(
    (v) => v.readingLoadLevel === requestedLevel
  )
  if (exactMatch) {
    return {
      content: exactMatch.content,
      resolvedLevel: requestedLevel,
      fromVariant: true,
    }
  }

  // No matching variant — fall back to base stimulus content
  return {
    content: stimulus.content,
    resolvedLevel: stimulus.readingLoadLevel,
    fromVariant: false,
  }
}

// ── resolveAccommodationLevel ─────────────────────────────────────────────

/**
 * Given a student's active accommodation codes, determine the effective
 * reading-load level to use.
 *
 * Rules (spec Section 16.5):
 *   - If any accommodation code is in LEVEL_1_ACCOMMODATION_CODES AND
 *     this is NOT a Mastery Challenge → return 1
 *   - Mastery Challenges are never downgraded (level 2 minimum is a
 *     separate hard constraint)
 *   - Otherwise → return requestedLevel unchanged
 */
export function resolveAccommodationLevel(
  accommodationCodes: string[],
  requestedLevel: number,
  isMasteryChallenge: boolean
): number {
  if (isMasteryChallenge) {
    // Accommodations never downgrade mastery level — level 2 minimum is
    // enforced separately. Return unchanged.
    return requestedLevel
  }

  const hasLevel1Override = accommodationCodes.some((code) =>
    LEVEL_1_ACCOMMODATION_CODES.has(code)
  )

  return hasLevel1Override ? 1 : requestedLevel
}

// ── buildGlossaryAnnotations ───────────────────────────────────────────────

/**
 * Scan `content` for occurrences of known glossary terms and return
 * annotation objects suitable for rendering popovers.
 *
 * Level 3 content has no scaffolding per spec Section 16.2 — returns [].
 * Levels 1 and 2: annotate all matching TIER_2 and TIER_3 terms.
 *
 * Match is case-insensitive. Only returns the first matched form of each
 * term to avoid duplicate annotations.
 */
export function buildGlossaryAnnotations(
  content: string,
  glossaryTerms: GlossaryTerm[],
  resolvedLevel: number
): GlossaryAnnotation[] {
  // Level 3 = raw passage, no scaffolding
  if (resolvedLevel >= 3) return []

  const annotations: GlossaryAnnotation[] = []

  for (const gTerm of glossaryTerms) {
    // Word-boundary case-insensitive search
    try {
      const regex = new RegExp(`\\b${escapeRegex(gTerm.term)}\\b`, 'i')
      const match = content.match(regex)
      if (match && match[0]) {
        annotations.push({
          matchText: match[0],
          definition: gTerm.definition,
          tier: gTerm.tier,
          ...(gTerm.l1Definition ? { l1Definition: gTerm.l1Definition, l1Language: gTerm.l1Language } : {}),
        })
      }
    } catch {
      // If regex construction fails (unusual term), skip
    }
  }

  return annotations
}

// ── filterQuestionsForMastery ─────────────────────────────────────────────

export interface QuestionWithLevel {
  id: string
  readingLoadLevel: number
  [key: string]: unknown
}

/**
 * Filter a question array to only include items at reading-load level 2+.
 * Used to enforce Mastery Challenge level-2 minimum (Audit 7 item 2).
 * Pure function — no DB access.
 */
export function filterQuestionsForMastery<T extends QuestionWithLevel>(
  questions: T[]
): T[] {
  return questions.filter((q) => q.readingLoadLevel >= 2)
}

// ── Internal helpers ───────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
