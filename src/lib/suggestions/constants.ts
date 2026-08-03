/**
 * Suggestion Box — limits and audit action names (ADR 0021).
 *
 * MUST stay free of any `@/lib/db` import: `SuggestionBox` is a client component
 * and deep-imports this file directly. Importing prisma here would pull Prisma
 * Client into the client bundle.
 */

/** Hard cap on a suggestion body. Also the textarea's `maxLength`. */
export const SUGGESTION_MAX_BODY_CHARS = 2000
/** Below this the submit button stays disabled and the server rejects. */
export const SUGGESTION_MIN_BODY_CHARS = 3
export const SUGGESTION_MAX_PAGE_LABEL_CHARS = 120
export const SUGGESTION_MAX_PATHNAME_CHARS = 512
export const SUGGESTION_MAX_REVIEWER_NOTE_CHARS = 500

/**
 * Anti-spam. There is no rate-limiting infrastructure in this app, and a queue
 * a bored student can flood is a queue teachers stop opening. Enforced in the
 * domain layer (a cheap count query), not middleware.
 */
export const SUGGESTION_MIN_INTERVAL_MS = 10_000
export const SUGGESTION_DAILY_CAP = 20

/** Audit-log actions. Catalogued in CLAUDE.md; consts, not an enum (module convention). */
export const SUGGESTION_SUBMITTED = 'SUGGESTION_SUBMITTED'
export const SUGGESTION_STATUS_CHANGED = 'SUGGESTION_STATUS_CHANGED'
export const SUGGESTION_ENTITY_TYPE = 'Suggestion'

/** Shown in the box when the server's route table can't name the current page. */
export const SUGGESTION_UNKNOWN_PAGE_LABEL = 'Unknown page'

/**
 * Comment vs. question. Kept as a plain literal union here (not imported from
 * @prisma/client as a value) so this file stays safe for the client bundle.
 */
export const SUGGESTION_KINDS = ['COMMENT', 'QUESTION'] as const
export type SuggestionKindValue = (typeof SUGGESTION_KINDS)[number]

export const SUGGESTION_KIND_LABELS: Record<SuggestionKindValue, string> = {
  COMMENT: 'Comment',
  QUESTION: 'Question',
}

/** Author-facing copy for each kind, used by the box's hint line and placeholder. */
export const SUGGESTION_KIND_COPY: Record<
  SuggestionKindValue,
  { placeholder: string; studentHint: string; staffHint: string; success: string }
> = {
  COMMENT: {
    placeholder: 'Suggest an improvement…',
    studentHint: 'Sent to your teacher along with the page you’re on',
    staffHint: 'Sent to the site administrator along with the page you’re on',
    success: 'Thanks — your comment was sent.',
  },
  QUESTION: {
    placeholder: 'Ask a question about this page…',
    studentHint: 'Your teacher will see this question along with the page you’re on',
    staffHint: 'The site administrator will see this question with the page you’re on',
    success: 'Thanks — your question was sent.',
  },
}
