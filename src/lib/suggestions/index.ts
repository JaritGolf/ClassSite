/**
 * Suggestion Box — public API (ADR 0021).
 *
 * A nav-bar suggestion box on the student, teacher, and admin shells. Students'
 * suggestions surface on /teacher/reports?tab=suggestions; teachers' and admins'
 * surface on /admin/reports. Every suggestion carries a server-derived snapshot of
 * the page it was filed from, which is what makes "which page confuses people"
 * answerable without any third-party analytics (rule #9).
 *
 * CLIENT-BUNDLE WARNING: this barrel reaches `create.ts` -> `@/lib/db` -> Prisma
 * Client. Client components must deep-import the pure leaves instead:
 *     import { SUGGESTION_MAX_BODY_CHARS } from '@/lib/suggestions/constants'
 *     import { labelForPathname }          from '@/lib/suggestions/location'
 *     import { SUGGESTION_STATUS_LABELS }  from '@/lib/suggestions/status'
 * Type-only imports from this barrel are safe (erased at compile time).
 */

export { SuggestionError } from './errors'

export {
  SUGGESTION_MAX_BODY_CHARS,
  SUGGESTION_MIN_BODY_CHARS,
  SUGGESTION_MAX_PAGE_LABEL_CHARS,
  SUGGESTION_MAX_PATHNAME_CHARS,
  SUGGESTION_MAX_REVIEWER_NOTE_CHARS,
  SUGGESTION_MIN_INTERVAL_MS,
  SUGGESTION_DAILY_CAP,
  SUGGESTION_SUBMITTED,
  SUGGESTION_STATUS_CHANGED,
  SUGGESTION_ENTITY_TYPE,
  SUGGESTION_UNKNOWN_PAGE_LABEL,
  SUGGESTION_KINDS,
  SUGGESTION_KIND_LABELS,
  SUGGESTION_KIND_COPY,
} from './constants'
export type { SuggestionKindValue } from './constants'

export { resolvePageLocation, labelForPathname } from './location'
export type { PageLocation } from './location'

export {
  canTransition,
  SUGGESTION_STATUS_TRANSITIONS,
  SUGGESTION_STATUS_LABELS,
} from './status'

export { createSuggestion } from './create'
export type { CreateSuggestionInput, CreatedSuggestion } from './create'

export { listSuggestionsForTeacher, listSuggestionsForAdmin } from './list'
export type {
  SuggestionListFilters,
  SuggestionListItem,
  SuggestionListResult,
} from './list'

export { updateSuggestionStatus } from './review'
export type { UpdateSuggestionStatusInput, UpdatedSuggestion } from './review'

export { resolveTeacherScope, isVisibleToTeacherScope } from './scope'
export type { TeacherScope } from './scope'
