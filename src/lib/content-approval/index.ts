/**
 * Content Approval — Public API
 *
 * Exports all functions needed for teacher content approval workflows:
 *   - listApprovalQueue   — paginated queue with optional filters
 *   - approveContent      — approve a single entity (transactional + AuditLog)
 *   - archiveContent      — archive a single entity (transactional + AuditLog)
 *   - bulkApproveByTag    — bulk approve by filter criteria (transactional + AuditLog)
 *
 * All mutation functions require a teacher/admin actorUserId and write
 * an AuditLog row in the same $transaction as the content mutation.
 */

export type { ApprovableEntity, EntityMapEntry } from './entity-map'
export { ENTITY_MAP } from './entity-map'

export type { QueueFilters, QueueItem } from './queue'
export { listApprovalQueue } from './queue'

export { approveContent } from './approve'

export { archiveContent } from './archive'

export type { BulkApproveCriteria } from './bulk-approve'
export { bulkApproveByTag } from './bulk-approve'
