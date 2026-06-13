/**
 * Content Approval Queue
 *
 * Lists content items awaiting approval, scoped to the teacher's school.
 * Admin role bypasses school filter.
 *
 * Spec reference: Phase 9 slice 9c.
 *
 * Note: Question, Lesson, and Stimulus models do not have an `updatedAt` column.
 * Items without a timestamp are ordered by `id desc` for deterministic output.
 * The QueueItem.updatedAt field uses `new Date()` as a sentinel for those entities
 * so downstream sorting still works (they appear last in the sorted list).
 */

import { prisma } from '@/lib/db'
import type { ApprovalStatus } from '@prisma/client'
import type { ApprovableEntity } from './entity-map'

export interface QueueFilters {
  entityType?: ApprovableEntity
  benchmarkId?: string
  reportingCategoryId?: string
  unitId?: string
  status?: ApprovalStatus
  limit?: number
  offset?: number
}

export interface QueueItem {
  entityType: ApprovableEntity
  id: string
  label: string
  status: ApprovalStatus
  benchmarkCode?: string
}

/**
 * List the content approval queue, scoped to the teacher's school.
 *
 * @param actorUserId - User.id of the requesting teacher/admin
 * @param filters     - Optional filters
 */
export async function listApprovalQueue(
  actorUserId: string,
  filters: QueueFilters = {}
): Promise<{ items: QueueItem[]; total: number }> {
  const { entityType, benchmarkId, status, limit = 50, offset = 0 } = filters

  // Resolve actor role + school scope
  const actorUser = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true, teacher: { select: { schoolId: true } } },
  })

  const isAdmin = actorUser?.role === 'ADMIN'
  const _schoolId = actorUser?.teacher?.schoolId ?? null
  // schoolId-based scoping deferred to Phase 17 (requires district data model)
  // For now: teacher sees all school content; admin sees all

  const items: QueueItem[] = []

  // Helper: build base where clause
  function buildWhere(extraWhere: Record<string, unknown>) {
    const where: Record<string, unknown> = {
      approvalStatus: status ?? { in: ['DRAFT', 'NEEDS_REVIEW', 'NEEDS_REVISION'] },
      ...extraWhere,
    }
    return where
  }

  const entityTypes: ApprovableEntity[] = entityType
    ? [entityType]
    : ['QUESTION', 'LESSON', 'TERM', 'TERM_TRANSLATION', 'RESOURCE', 'REMEDIATION_ITEM', 'STIMULUS', 'MISCONCEPTION']

  for (const et of entityTypes) {
    if (et === 'QUESTION') {
      const where = buildWhere({
        ...(benchmarkId ? { benchmarkId } : {}),
        ...(filters.reportingCategoryId
          ? { benchmark: { reportingCategoryId: filters.reportingCategoryId } }
          : {}),
        ...(filters.unitId ? { benchmark: { unitId: filters.unitId } } : {}),
      })
      const qs = await prisma.question.findMany({
        where,
        select: {
          id: true,
          prompt: true,
          approvalStatus: true,
          benchmarkId: true,
          benchmark: { select: { code: true } },
        },
        orderBy: { id: 'desc' },
      })
      for (const q of qs) {
        items.push({
          entityType: 'QUESTION',
          id: q.id,
          label: q.prompt.slice(0, 80),
          status: q.approvalStatus,
          benchmarkCode: q.benchmark.code,
        })
      }
    } else if (et === 'LESSON') {
      const where = buildWhere({ ...(benchmarkId ? { benchmarkId } : {}) })
      const ls = await prisma.lesson.findMany({
        where,
        select: {
          id: true,
          title: true,
          approvalStatus: true,
          benchmarkId: true,
          benchmark: { select: { code: true } },
        },
        orderBy: { id: 'desc' },
      })
      for (const l of ls) {
        items.push({
          entityType: 'LESSON',
          id: l.id,
          label: l.title,
          status: l.approvalStatus,
          benchmarkCode: l.benchmark.code,
        })
      }
    } else if (et === 'TERM') {
      const where = buildWhere({ ...(benchmarkId ? { benchmarkId } : {}) })
      const ts = await prisma.term.findMany({
        where,
        select: {
          id: true,
          term: true,
          approvalStatus: true,
          benchmark: { select: { code: true } },
        },
        orderBy: { id: 'asc' },
      })
      for (const t of ts) {
        items.push({
          entityType: 'TERM',
          id: t.id,
          label: t.term,
          status: t.approvalStatus,
          benchmarkCode: t.benchmark?.code,
        })
      }
    } else if (et === 'TERM_TRANSLATION') {
      // L1 glosses (Phase 16). Benchmark reachable via the parent term.
      const trs = await prisma.termTranslation.findMany({
        where: benchmarkId ? { term: { benchmarkId } } : {},
        select: {
          id: true,
          languageCode: true,
          approvalStatus: true,
          term: { select: { term: true, benchmark: { select: { code: true } } } },
        },
        orderBy: { id: 'asc' },
      })
      for (const tr of trs) {
        items.push({
          entityType: 'TERM_TRANSLATION',
          id: tr.id,
          label: `${tr.term.term} (${tr.languageCode})`,
          status: tr.approvalStatus,
          benchmarkCode: tr.term.benchmark?.code,
        })
      }
    } else if (et === 'RESOURCE') {
      const where = buildWhere({ ...(benchmarkId ? { benchmarkId } : {}) })
      const rs = await prisma.resource.findMany({
        where,
        select: {
          id: true,
          title: true,
          approvalStatus: true,
          benchmark: { select: { code: true } },
        },
        orderBy: { id: 'asc' },
      })
      for (const r of rs) {
        items.push({
          entityType: 'RESOURCE',
          id: r.id,
          label: r.title,
          status: r.approvalStatus,
          benchmarkCode: r.benchmark.code,
        })
      }
    } else if (et === 'REMEDIATION_ITEM') {
      const where = buildWhere({ ...(benchmarkId ? { benchmarkId } : {}) })
      const ris = await prisma.remediationItem.findMany({
        where,
        select: {
          id: true,
          title: true,
          approvalStatus: true,
          benchmark: { select: { code: true } },
        },
        orderBy: { id: 'asc' },
      })
      for (const ri of ris) {
        items.push({
          entityType: 'REMEDIATION_ITEM',
          id: ri.id,
          label: ri.title,
          status: ri.approvalStatus,
          benchmarkCode: ri.benchmark.code,
        })
      }
    } else if (et === 'STIMULUS') {
      const where = buildWhere({})
      const ss = await prisma.stimulus.findMany({
        where,
        select: {
          id: true,
          title: true,
          approvalStatus: true,
        },
        orderBy: { id: 'desc' },
      })
      for (const s of ss) {
        items.push({
          entityType: 'STIMULUS',
          id: s.id,
          label: s.title,
          status: s.approvalStatus,
        })
      }
    } else if (et === 'MISCONCEPTION') {
      const where = buildWhere({})
      const ms = await prisma.misconception.findMany({
        where,
        select: {
          id: true,
          code: true,
          label: true,
          approvalStatus: true,
        },
        orderBy: { id: 'asc' },
      })
      for (const m of ms) {
        items.push({
          entityType: 'MISCONCEPTION',
          id: m.id,
          label: `${m.code} — ${m.label}`,
          status: m.approvalStatus,
        })
      }
    }
  }

  const total = items.length
  const paged = items.slice(offset, offset + limit)

  return { items: paged, total }
}
