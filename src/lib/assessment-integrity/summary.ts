/**
 * Integrity summary — PURE. No DB, no imports.
 *
 * Collapses an attempt's raw integrity events into the one small object the
 * teacher UI renders. The thresholds live HERE, in one authored place, rather
 * than scattered across components — a teacher-facing judgement like "is this
 * worth looking at" should be reviewable in a single file and unit-tested.
 *
 * Design note on counting: the client emits ONE departure event per away
 * episode (see useSecureMode) precisely so this module does not have to
 * de-duplicate the blur + visibilitychange pair that a single tab switch
 * fires. Fullscreen exits are counted separately from departures because they
 * are a different act — pressing Esc is easy to do by accident, leaving the
 * page is not.
 */

/** Departure events: the student's page lost focus or was hidden. */
export const FOCUS_LOSS_EVENT_TYPES = ['BLUR', 'VISIBILITY_HIDDEN'] as const

/** Blocked-input events: the student tried something Focus Mode prevents. */
export const BLOCKED_ACTION_EVENT_TYPES = [
  'COPY_BLOCKED',
  'CUT_BLOCKED',
  'PASTE_BLOCKED',
  'CONTEXT_MENU_BLOCKED',
  'PRINT_BLOCKED',
] as const

/**
 * A "notable" flag needs a teacher's eye; anything lesser is "minor" and shown
 * quietly. One accidental click on a notification must NOT read as cheating,
 * so single incidents never reach notable. Three departures, or a solid half
 * minute away, or three blocked attempts, is where a human should look.
 */
export const NOTABLE_FOCUS_LOSS_COUNT = 3
export const NOTABLE_TOTAL_AWAY_MS = 30_000
export const NOTABLE_BLOCKED_ACTION_COUNT = 3
export const NOTABLE_FULLSCREEN_EXIT_COUNT = 3

export type IntegrityLevel = 'none' | 'minor' | 'notable'

/** Minimal shape so callers can pass Prisma rows or plain objects. */
export interface IntegrityEventLike {
  eventType: string
  durationMs?: number | null
}

export interface IntegritySummary {
  /** Distinct episodes where the page lost focus or was hidden. */
  focusLossCount: number
  /** Times the student left Focus Mode (fullscreen) — a different act. */
  fullscreenExitCount: number
  /**
   * Client-reported total time away, ms. ADVISORY ONLY — the client is the
   * only party that can observe how long its own tab was hidden, so this is
   * never authoritative and never drives a grading decision.
   */
  totalAwayMs: number
  /** Copy / cut / paste / print / right-click attempts that were blocked. */
  blockedActionCount: number
  level: IntegrityLevel
}

const FOCUS_LOSS = new Set<string>(FOCUS_LOSS_EVENT_TYPES)
const BLOCKED = new Set<string>(BLOCKED_ACTION_EVENT_TYPES)

export function summarizeIntegrityEvents(
  events: readonly IntegrityEventLike[]
): IntegritySummary {
  let focusLossCount = 0
  let fullscreenExitCount = 0
  let blockedActionCount = 0
  let totalAwayMs = 0

  for (const e of events) {
    if (FOCUS_LOSS.has(e.eventType)) {
      focusLossCount += 1
      // Guard against a negative or absent duration skewing the total; the
      // value is client-supplied and therefore untrusted.
      if (typeof e.durationMs === 'number' && e.durationMs > 0) {
        totalAwayMs += e.durationMs
      }
    } else if (e.eventType === 'FULLSCREEN_EXIT') {
      fullscreenExitCount += 1
    } else if (BLOCKED.has(e.eventType)) {
      blockedActionCount += 1
    }
    // Unknown event types are ignored rather than throwing: a future client
    // emitting a type this server build has not heard of must not break a
    // teacher's page render.
  }

  const anything =
    focusLossCount > 0 ||
    fullscreenExitCount > 0 ||
    blockedActionCount > 0

  const notable =
    focusLossCount >= NOTABLE_FOCUS_LOSS_COUNT ||
    totalAwayMs >= NOTABLE_TOTAL_AWAY_MS ||
    blockedActionCount >= NOTABLE_BLOCKED_ACTION_COUNT ||
    fullscreenExitCount >= NOTABLE_FULLSCREEN_EXIT_COUNT

  const level: IntegrityLevel = notable ? 'notable' : anything ? 'minor' : 'none'

  return {
    focusLossCount,
    fullscreenExitCount,
    totalAwayMs,
    blockedActionCount,
    level,
  }
}

/**
 * Short teacher-facing label. Kept next to the thresholds so the wording and
 * the rule that produced it cannot drift apart.
 */
export function describeIntegritySummary(s: IntegritySummary): string {
  if (s.level === 'none') return 'No interruptions recorded'
  const parts: string[] = []
  if (s.focusLossCount > 0) {
    parts.push(`left the page ${s.focusLossCount}×`)
  }
  if (s.totalAwayMs > 0) {
    parts.push(`about ${Math.round(s.totalAwayMs / 1000)}s away`)
  }
  if (s.fullscreenExitCount > 0) {
    parts.push(`exited Focus Mode ${s.fullscreenExitCount}×`)
  }
  if (s.blockedActionCount > 0) {
    parts.push(`${s.blockedActionCount} blocked copy/paste attempt(s)`)
  }
  return parts.join(', ')
}
