/**
 * Suggestion Box — typed domain error (ADR 0021).
 *
 * Lives in a leaf file rather than `index.ts` on purpose: `src/lib/teacher-roster/`
 * declares `RosterError` in its barrel and then has `resolve.ts` import it back
 * *from* `./index`, which is a live import cycle that happens to work.
 * `src/lib/lesson-editor/` sets the better precedent — follow that one.
 *
 * Routes translate `code` to an HTTP status; see the two route handlers.
 */
export class SuggestionError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_BODY'
      | 'INVALID_LOCATION'
      | 'ROLE_NOT_ALLOWED'
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'INVALID_STATUS_TRANSITION'
      | 'RATE_LIMITED',
    message: string
  ) {
    super(message)
    this.name = 'SuggestionError'
  }
}
