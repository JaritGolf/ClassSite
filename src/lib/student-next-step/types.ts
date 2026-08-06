/**
 * What a student should do next — the shared vocabulary.
 *
 * These types are BOTH the internal domain shape and the wire contract for
 * `GET /api/student/next-step`. That is deliberate: this repo has shipped three
 * separate client/server drift bugs (questionId, position, confidence), and the
 * remedy that stuck was `src/lib/assessment/wire.ts` — one client-safe module
 * both sides import, with a contract test parsing real output through the real
 * schema. Same approach here.
 *
 * Nothing in this file may import Prisma. Client components import it.
 */

/**
 * The kinds of work the platform can point a student at, in no particular order
 * (ranking lives in `rank.ts`).
 *
 * `ALL_CAUGHT_UP` is a real step, not an absence of one. The whole point of this
 * module is that the platform always has an answer to "what now?" — so
 * `StudentPlan.primary` is non-nullable and this is what fills it when a student
 * has genuinely finished everything available.
 */
export type NextStepKind =
  /** An ASSIGNED StudentRemediation — targeted work the engine chose. */
  | 'REMEDIATION'
  /** The current mission, already begun. */
  | 'MISSION_RESUME'
  /** Due SM-2 spaced-review items. */
  | 'DRILL'
  /** The current mission, not yet begun. */
  | 'MISSION_START'
  /** Strategy uses the teacher requires but the student still owes. */
  | 'STRATEGY'
  /** Optional cumulative review — offered once there is something to review. */
  | 'REPUBLIC_CHALLENGE'
  /**
   * The genuinely-last-touched activity, when it is not already represented
   * above. Carries the "pick up where you left off" behaviour for the parallel
   * tracks this ranker does not otherwise model (Source Decoder, a specific
   * Republic Challenge mode) — see the note in `rank.ts`.
   */
  | 'LAST_ACTIVITY'
  /** Nothing left to do today. Renders as celebration, never as an error. */
  | 'ALL_CAUGHT_UP'

/**
 * Icon names, constrained to the existing `TrackIcon` set.
 *
 * Kept a strict superset of `LastActivityIcon` (`src/lib/student-activity`) so a
 * last-activity entry can be lifted into a `NextStep` without a mapping table —
 * `star` and `flag` are here only for that reason.
 */
export type NextStepIcon =
  | 'target'
  | 'sparkle'
  | 'bolt'
  | 'map'
  | 'compass'
  | 'shield'
  | 'medal'
  | 'check'
  | 'book'
  | 'search'
  | 'home'
  | 'chat'
  | 'star'
  | 'flag'

export interface NextStep {
  kind: NextStepKind
  /** The activity, named the way a student would say it. */
  label: string
  /**
   * What specifically to do. This is the load-bearing field for guidance:
   * "Continue Mission" tells a 12-year-old nothing, "You've unlocked the
   * Mastery Challenge" tells them exactly where they are.
   */
  subLabel: string
  /** Where the CTA goes. Always a real, reachable destination. */
  href: string
  icon: NextStepIcon
  /** CTA text, e.g. "Continue Mission". */
  ctaLabel: string
  /**
   * Nominal minutes, or null when we cannot honestly say.
   *
   * Only DRILL is derived from real data (the due-item count). The rest are
   * fixed per-activity estimates from `ESTIMATED_MINUTES` and must always be
   * rendered approximately ("about 15 min") — a precise-looking number we did
   * not measure would be a fabrication.
   */
  estimatedMinutes: number | null
  /** Item count where one is meaningful (drill items due, strategy uses owed). */
  count?: number
}

export interface StudentPlan {
  /** The one thing to do now. Never null — see `ALL_CAUGHT_UP`. */
  primary: NextStep
  /** What follows it, in order. Capped; may be empty. */
  then: NextStep[]
}

/**
 * Nominal duration estimates, in minutes.
 *
 * Deliberately one table with one comment rather than numbers sprinkled through
 * the ranker. These are honest guesses at typical effort, NOT measurements —
 * `StudentActivitySession.areaSeconds` holds real per-area timings and could
 * eventually replace them with per-student medians.
 */
export const ESTIMATED_MINUTES = {
  REMEDIATION: 10,
  MISSION_RESUME: 15,
  MISSION_START: 20,
  STRATEGY: 5,
  REPUBLIC_CHALLENGE: 10,
} as const

/** Drill length from the real due count — the one estimate that is derived. */
export function estimateDrillMinutes(dueCount: number): number {
  return Math.max(2, Math.ceil(dueCount * 0.75))
}

/** How many follow-on steps the "then" list shows. Three fits without crowding. */
export const MAX_THEN_STEPS = 3
