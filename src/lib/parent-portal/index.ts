/**
 * Parent Portal — public API (Phase 18, spec §23 Phase 2 / audit §36.19)
 */

export { isParentPortalEnabled } from './feature'

export {
  ParentAccessError,
  getVerifiedLinkedStudents,
  assertParentCanViewStudent,
} from './authorize'
export type { LinkedStudent } from './authorize'

export { getParentSummaryForParent } from './summary'

export { recordParentLoginEvent } from './login'

export {
  ParentAdminError,
  createParentAccount,
  linkParentToStudent,
  setLinkVerification,
  listParents,
} from './admin'
export type { CreateParentInput, ParentRow } from './admin'
