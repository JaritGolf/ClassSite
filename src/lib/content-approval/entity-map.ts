/**
 * Entity Map for Content Approval
 *
 * Maps ApprovableEntity string keys to Prisma model names and audit entity types.
 * Used by queue, approve, archive, and bulk-approve to query the correct table.
 */

export type ApprovableEntity =
  | 'QUESTION'
  | 'LESSON'
  | 'TERM'
  | 'RESOURCE'
  | 'REMEDIATION_ITEM'
  | 'STIMULUS'
  | 'MISCONCEPTION'

export interface EntityMapEntry {
  /** Prisma model key (for dynamic access) */
  prismaModel: string
  /** The entity type string stored in AuditLog */
  auditEntityType: string
  /** The field on the entity that holds the benchmarkId (for queue filters) */
  benchmarkPath?: string
}

export const ENTITY_MAP: Record<ApprovableEntity, EntityMapEntry> = {
  QUESTION: {
    prismaModel: 'question',
    auditEntityType: 'Question',
    benchmarkPath: 'benchmarkId',
  },
  LESSON: {
    prismaModel: 'lesson',
    auditEntityType: 'Lesson',
    benchmarkPath: 'benchmarkId',
  },
  TERM: {
    prismaModel: 'term',
    auditEntityType: 'Term',
    benchmarkPath: 'benchmarkId',
  },
  RESOURCE: {
    prismaModel: 'resource',
    auditEntityType: 'Resource',
    benchmarkPath: 'benchmarkId',
  },
  REMEDIATION_ITEM: {
    prismaModel: 'remediationItem',
    auditEntityType: 'RemediationItem',
    benchmarkPath: 'benchmarkId',
  },
  STIMULUS: {
    prismaModel: 'stimulus',
    auditEntityType: 'Stimulus',
    // No direct benchmarkPath for Stimulus
  },
  MISCONCEPTION: {
    prismaModel: 'misconception',
    auditEntityType: 'Misconception',
    // No direct benchmarkPath for Misconception
  },
}
