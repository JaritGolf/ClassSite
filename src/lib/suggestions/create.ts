/**
 * Suggestion Box — submission (ADR 0021).
 *
 * Role gating and body validation live HERE, not only in the route: the domain
 * function is the contract, and the integration suite exercises it with no HTTP
 * layer in the loop. The route's zod schema is a second, outer layer.
 */

import type {
  SuggestionAudience,
  SuggestionKind,
  SuggestionStatus,
  UserRole,
} from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  SUGGESTION_DAILY_CAP,
  SUGGESTION_ENTITY_TYPE,
  SUGGESTION_MAX_BODY_CHARS,
  SUGGESTION_MAX_PAGE_LABEL_CHARS,
  SUGGESTION_MAX_PATHNAME_CHARS,
  SUGGESTION_MIN_BODY_CHARS,
  SUGGESTION_MIN_INTERVAL_MS,
  SUGGESTION_SUBMITTED,
  SUGGESTION_UNKNOWN_PAGE_LABEL,
} from './constants'
import { SuggestionError } from './errors'
import { resolvePageLocation } from './location'

export interface CreateSuggestionInput {
  body: string
  pathname: string
  /** Comment (default) or question — chosen by the author in the box. */
  kind?: SuggestionKind
  /** Client hint. Used ONLY when the server's route table can't match `pathname`. */
  pageLabel?: string
  /** Non-identifying triage context. */
  viewportWidth?: number
}

export interface CreatedSuggestion {
  id: string
  audience: SuggestionAudience
  status: SuggestionStatus
  kind: SuggestionKind
  pageLabel: string
  createdAt: Date
}

/** STUDENT feedback goes to their teacher; TEACHER and ADMIN feedback goes to the admin. */
function audienceForRole(role: UserRole): SuggestionAudience {
  switch (role) {
    case 'STUDENT':
      return 'TEACHER'
    case 'TEACHER':
    case 'ADMIN':
      return 'ADMIN'
    default:
      // PARENT — the box is not mounted in the parent UI. The domain layer asserts
      // that rather than trusting the UI not to render it.
      throw new SuggestionError(
        'ROLE_NOT_ALLOWED',
        `Role ${role} may not file suggestions`
      )
  }
}

export async function createSuggestion(
  actorUserId: string,
  input: CreateSuggestionInput
): Promise<CreatedSuggestion> {
  const body = input.body?.trim() ?? ''
  if (body.length < SUGGESTION_MIN_BODY_CHARS || body.length > SUGGESTION_MAX_BODY_CHARS) {
    throw new SuggestionError(
      'INVALID_BODY',
      `Suggestion body must be ${SUGGESTION_MIN_BODY_CHARS}-${SUGGESTION_MAX_BODY_CHARS} characters`
    )
  }

  const pathname = input.pathname?.trim() ?? ''
  if (
    !pathname.startsWith('/') ||
    pathname.length > SUGGESTION_MAX_PATHNAME_CHARS
  ) {
    throw new SuggestionError('INVALID_LOCATION', 'pathname must be an app-relative path')
  }

  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: {
      role: true,
      status: true,
      student: { select: { id: true } },
      teacher: { select: { id: true } },
    },
  })
  if (!user || user.status !== 'ACTIVE') {
    throw new SuggestionError('FORBIDDEN', 'No active user for this session')
  }

  const audience = audienceForRole(user.role)

  // ── Throttle ───────────────────────────────────────────────────────────────
  const now = new Date()
  const [recentCount, dailyCount] = await Promise.all([
    prisma.suggestion.count({
      where: {
        authorUserId: actorUserId,
        createdAt: { gt: new Date(now.getTime() - SUGGESTION_MIN_INTERVAL_MS) },
      },
    }),
    prisma.suggestion.count({
      where: {
        authorUserId: actorUserId,
        createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])
  if (recentCount > 0 || dailyCount >= SUGGESTION_DAILY_CAP) {
    throw new SuggestionError('RATE_LIMITED', 'Too many suggestions in a short window')
  }

  // ── Recipient resolution ───────────────────────────────────────────────────
  // For a student: snapshot the teacher/class from the earliest active enrollment.
  // Deterministic (enrolledAt, then classId) so a multi-class student produces a
  // stable single row; every current teacher still sees it via the roster-union
  // read in list.ts. No enrollment is NOT an error — the union read recovers it.
  let teacherId: string | null = null
  let classId: string | null = null

  if (user.role === 'STUDENT' && user.student) {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        studentId: user.student.id,
        status: 'ACTIVE',
        class: { active: true },
      },
      orderBy: [{ enrolledAt: 'asc' }, { classId: 'asc' }],
      select: { classId: true, class: { select: { teacherId: true } } },
    })
    if (enrollment) {
      teacherId = enrollment.class.teacherId
      classId = enrollment.classId
    }
  } else if (user.role === 'TEACHER' && user.teacher) {
    // "The teacher in the loop" — here, the author themselves.
    teacherId = user.teacher.id
  }

  // ── Location: server is authoritative ──────────────────────────────────────
  const resolved = resolvePageLocation(pathname)
  const clientLabel = input.pageLabel?.trim().slice(0, SUGGESTION_MAX_PAGE_LABEL_CHARS)
  const pageLabel =
    resolved.pageLabel === SUGGESTION_UNKNOWN_PAGE_LABEL && clientLabel
      ? clientLabel
      : resolved.pageLabel

  // Non-identifying triage context ONLY. No user-agent, no IP — fingerprinting-
  // adjacent data on minors is out of bounds (rule #9).
  const contextJson: Record<string, number> = {}
  if (typeof input.viewportWidth === 'number' && Number.isFinite(input.viewportWidth)) {
    contextJson.viewportWidth = Math.round(input.viewportWidth)
  }

  const kind: SuggestionKind = input.kind === 'QUESTION' ? 'QUESTION' : 'COMMENT'

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.suggestion.create({
      data: {
        audience,
        kind,
        authorUserId: actorUserId,
        authorRole: user.role,
        authorStudentId: user.student?.id ?? null,
        teacherId,
        classId,
        body,
        pathname,
        routePattern: resolved.routePattern,
        pageLabel,
        contextJson: Object.keys(contextJson).length > 0 ? contextJson : undefined,
      },
      select: {
        id: true,
        audience: true,
        status: true,
        kind: true,
        pageLabel: true,
        createdAt: true,
      },
    })

    // NOTE: the body text is deliberately NOT in the audit metadata. Audit rows are
    // CSV-exportable via /api/admin/audit/export and purge on a different clock
    // (AUDIT_LOG_RETENTION_DAYS); a second export-friendly copy of student prose
    // would be a privacy liability with no triage value.
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: SUGGESTION_SUBMITTED,
        entityType: SUGGESTION_ENTITY_TYPE,
        entityId: row.id,
        metadataJson: {
          audience,
          kind,
          authorRole: user.role,
          routePattern: resolved.routePattern,
          pageLabel,
          bodyChars: body.length,
          teacherId,
          classId,
        },
      },
    })

    return row
  })

  return created
}
