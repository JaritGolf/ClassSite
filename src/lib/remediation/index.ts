/**
 * Remediation Engine — Public API
 *
 * All consumers should import from here, not from internal module files.
 */

export { assignRemediation, selectRemediationType } from './assign'
export type { AssignRemediationResult } from './assign'

export { completeRemediation, RemediationError } from './complete'
export type { CompleteRemediationResult } from './complete'

export { fetchAlternateQuestions } from './questions'
export type { AlternateQuestion } from './questions'
