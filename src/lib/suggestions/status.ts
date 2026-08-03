/**
 * Suggestion Box — status transition matrix (ADR 0021). Pure; no DB access.
 *
 * RESOLVED and DISMISSED are reopenable, but only back through IN_REVIEW, so the
 * audit trail always shows an explicit reopen rather than a silent jump to NEW.
 * NEW is a creation-only state — nothing transitions back into it.
 *
 * MUST stay free of any `@/lib/db` import (client deep-import safety). The
 * `SuggestionStatus` import below is type-only and erased at compile time.
 */

import type { SuggestionStatus } from '@prisma/client'

export const SUGGESTION_STATUS_TRANSITIONS: Record<SuggestionStatus, SuggestionStatus[]> = {
  NEW: ['IN_REVIEW', 'RESOLVED', 'DISMISSED'],
  IN_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: ['IN_REVIEW'],
  DISMISSED: ['IN_REVIEW'],
}

/**
 * `from === to` is rejected: a no-op PATCH must not write an audit row or move
 * `reviewedAt`.
 */
export function canTransition(from: SuggestionStatus, to: SuggestionStatus): boolean {
  if (from === to) return false
  return SUGGESTION_STATUS_TRANSITIONS[from].includes(to)
}

/** Human labels for the triage control and table cells. */
export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  NEW: 'New',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
}
