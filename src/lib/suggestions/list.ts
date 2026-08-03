/**
 * Suggestion Box — read queries (ADR 0021).
 *
 * Two entry points, one per destination:
 *   listSuggestionsForTeacher — roster-scoped, hard-pinned to audience TEACHER
 *   listSuggestionsForAdmin   — ADMIN-only, may filter by audience
 *
 * Both do their own authorization. The admin one deliberately re-checks the role
 * rather than trusting the admin layout, so an integration test can prove a
 * TEACHER user id cannot read the admin queue with no HTTP layer involved.
 */

import type {
  Prisma,
  SuggestionAudience,
  SuggestionKind,
  SuggestionStatus,
  UserRole,
} from '@prisma/client'
import { prisma } from '@/lib/db'
import { SuggestionError } from './errors'
import { resolveTeacherScope } from './scope'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

export interface SuggestionListFilters {
  status?: SuggestionStatus | SuggestionStatus[]
  /** Comments tab vs questions tab. Omit for both. */
  kind?: SuggestionKind
  classId?: string
  routePattern?: string
  since?: Date
  limit?: number
  offset?: number
}

export interface SuggestionListItem {
  id: string
  body: string
  pathname: string
  routePattern: string
  pageLabel: string
  status: SuggestionStatus
  audience: SuggestionAudience
  kind: SuggestionKind
  createdAt: Date
  author: { userId: string; displayName: string; role: UserRole }
  className: string | null
  teacherName: string | null
  reviewedAt: Date | null
  reviewerNote: string | null
}

export interface SuggestionListResult {
  items: SuggestionListItem[]
  total: number
  countsByStatus: Record<SuggestionStatus, number>
  /** NEW-count per kind across the caller's whole scope, ignoring the kind filter —
   *  this is what the tab badges read, so each tab can show the other's backlog. */
  newCountsByKind: Record<SuggestionKind, number>
  topRoutes: Array<{ routePattern: string; pageLabel: string; count: number }>
}

const EMPTY_STATUS_COUNTS: Record<SuggestionStatus, number> = {
  NEW: 0,
  IN_REVIEW: 0,
  RESOLVED: 0,
  DISMISSED: 0,
}

const LIST_SELECT = {
  id: true,
  body: true,
  pathname: true,
  routePattern: true,
  pageLabel: true,
  status: true,
  audience: true,
  kind: true,
  createdAt: true,
  reviewedAt: true,
  reviewerNote: true,
  authorUser: { select: { id: true, firstName: true, lastName: true, role: true } },
  class: { select: { name: true, period: true } },
  teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.SuggestionSelect

type ListRow = Prisma.SuggestionGetPayload<{ select: typeof LIST_SELECT }>

function toItem(row: ListRow): SuggestionListItem {
  return {
    id: row.id,
    body: row.body,
    pathname: row.pathname,
    routePattern: row.routePattern,
    pageLabel: row.pageLabel,
    status: row.status,
    audience: row.audience,
    kind: row.kind,
    createdAt: row.createdAt,
    author: {
      userId: row.authorUser.id,
      displayName: `${row.authorUser.firstName} ${row.authorUser.lastName}`.trim(),
      role: row.authorUser.role,
    },
    className: row.class
      ? row.class.period
        ? `${row.class.name} (${row.class.period})`
        : row.class.name
      : null,
    teacherName: row.teacher
      ? `${row.teacher.user.firstName} ${row.teacher.user.lastName}`.trim()
      : null,
    reviewedAt: row.reviewedAt,
    reviewerNote: row.reviewerNote,
  }
}

/** Filters that narrow the visible set. `status` is applied separately so the
 *  status tallies can be computed across all statuses in scope. */
function applyFilters(
  base: Prisma.SuggestionWhereInput,
  filters: SuggestionListFilters
): { withStatus: Prisma.SuggestionWhereInput; withoutStatus: Prisma.SuggestionWhereInput } {
  const withoutStatus: Prisma.SuggestionWhereInput = { ...base }

  if (filters.kind) withoutStatus.kind = filters.kind
  if (filters.classId) withoutStatus.classId = filters.classId
  if (filters.routePattern) {
    withoutStatus.routePattern = { contains: filters.routePattern, mode: 'insensitive' }
  }
  if (filters.since) withoutStatus.createdAt = { gte: filters.since }

  const withStatus: Prisma.SuggestionWhereInput = { ...withoutStatus }
  if (filters.status) {
    withStatus.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status
  }

  return { withStatus, withoutStatus }
}

async function runList(
  base: Prisma.SuggestionWhereInput,
  filters: SuggestionListFilters
): Promise<SuggestionListResult> {
  const { withStatus, withoutStatus } = applyFilters(base, filters)
  const take = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const skip = Math.max(filters.offset ?? 0, 0)

  // The kind tallies deliberately ignore the kind filter: the tab badges must show
  // the OTHER tab's backlog, so a teacher sitting on Comments still sees that
  // questions are waiting.
  const kindTallyWhere: Prisma.SuggestionWhereInput = { ...withoutStatus, status: 'NEW' }
  delete kindTallyWhere.kind

  const [rows, total, statusGroups, kindGroups, routeGroups] = await Promise.all([
    prisma.suggestion.findMany({
      where: withStatus,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.suggestion.count({ where: withStatus }),
    prisma.suggestion.groupBy({
      by: ['status'],
      where: withoutStatus,
      _count: { _all: true },
    }),
    prisma.suggestion.groupBy({
      by: ['kind'],
      where: kindTallyWhere,
      _count: { _all: true },
    }),
    prisma.suggestion.groupBy({
      by: ['routePattern', 'pageLabel'],
      where: withoutStatus,
      _count: { _all: true },
      orderBy: { _count: { routePattern: 'desc' } },
      take: 10,
    }),
  ])

  const countsByStatus = { ...EMPTY_STATUS_COUNTS }
  for (const g of statusGroups) countsByStatus[g.status] = g._count._all

  const newCountsByKind: Record<SuggestionKind, number> = { COMMENT: 0, QUESTION: 0 }
  for (const g of kindGroups) newCountsByKind[g.kind] = g._count._all

  return {
    items: rows.map(toItem),
    total,
    countsByStatus,
    newCountsByKind,
    topRoutes: routeGroups.map((g) => ({
      routePattern: g.routePattern,
      pageLabel: g.pageLabel,
      count: g._count._all,
    })),
  }
}

/**
 * A teacher's queue: student-authored suggestions visible under the union scope.
 * `audience` is hard-pinned to TEACHER so a teacher's own submissions (which are
 * addressed to the admin) never appear in their own inbox.
 *
 * Propagates `RosterError('FORBIDDEN')` when the caller has no Teacher row.
 */
export async function listSuggestionsForTeacher(
  actorUserId: string,
  filters: SuggestionListFilters = {}
): Promise<SuggestionListResult> {
  const scope = await resolveTeacherScope(actorUserId)
  return runList({ audience: 'TEACHER', ...scope.where }, filters)
}

/**
 * The admin queue. Defaults to teacher-authored (`audience: 'ADMIN'`) submissions;
 * pass `audience: undefined` explicitly via `includeStudentAudience` to widen.
 */
export async function listSuggestionsForAdmin(
  actorUserId: string,
  filters: SuggestionListFilters & { includeStudentAudience?: boolean } = {}
): Promise<SuggestionListResult> {
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true, status: true },
  })
  if (!user || user.status !== 'ACTIVE' || user.role !== 'ADMIN') {
    throw new SuggestionError('FORBIDDEN', 'Admin role required to read the suggestion queue')
  }

  // Off by default: student volume would bury the teacher-authored signal an admin
  // actually needs. Admin is already a super-role here (reads every roster and audit
  // row), so this is a default, not a boundary.
  const base: Prisma.SuggestionWhereInput = filters.includeStudentAudience
    ? {}
    : { audience: 'ADMIN' }

  return runList(base, filters)
}
