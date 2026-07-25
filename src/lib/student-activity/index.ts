/**
 * Student Last Activity — Public API
 *
 * All consumers should import from here, not from internal module files.
 */

export { recordLastActivity } from './record'

export { getLastActivityForStudent, resolveAssessmentActivity } from './resolve'
export type { LastActivityView, LastActivityIcon } from './resolve'
