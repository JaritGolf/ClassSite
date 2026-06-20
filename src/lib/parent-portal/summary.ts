/**
 * Parent Portal — parent-scoped summary fetch (Phase 18)
 *
 * Reuses the Phase 14 allowlist VM builder, with parent authorization
 * (verified link) instead of teacher roster scope. The VM itself already
 * excludes answer keys / item-level / calibration data.
 */

import { buildParentSummaryVM, type ParentSummaryVM } from '@/lib/parent-summary'
import { assertParentCanViewStudent } from './authorize'

export async function getParentSummaryForParent(
  parentUserId: string,
  studentId: string
): Promise<ParentSummaryVM> {
  await assertParentCanViewStudent(parentUserId, studentId)
  return buildParentSummaryVM(studentId)
}
