/**
 * Suggestion Box — triage (ADR 0021).
 *
 * Authorization branches on the row's `audience` and, for the TEACHER audience,
 * reuses the SAME predicate `list.ts` reads with (see `scope.ts`) so a teacher can
 * only triage what they can see.
 */

import type { SuggestionStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  SUGGESTION_ENTITY_TYPE,
  SUGGESTION_MAX_REVIEWER_NOTE_CHARS,
  SUGGESTION_STATUS_CHANGED,
} from './constants'
import { SuggestionError } from './errors'
import { isVisibleToTeacherScope, resolveTeacherScope } from './scope'
import { canTransition } from './status'

export interface UpdateSuggestionStatusInput {
  status: SuggestionStatus
  /** Private note from the reviewer; never shown to the author. */
  reviewerNote?: string
}

export interface UpdatedSuggestion {
  id: string
  status: SuggestionStatus
  reviewedAt: Date
}

export async function updateSuggestionStatus(
  actorUserId: string,
  suggestionId: string,
  input: UpdateSuggestionStatusInput
): Promise<UpdatedSuggestion> {
  const row = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    select: {
      id: true,
      audience: true,
      status: true,
      teacherId: true,
      authorStudentId: true,
    },
  })
  if (!row) {
    throw new SuggestionError('NOT_FOUND', `Suggestion ${suggestionId} not found`)
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true, status: true },
  })
  if (!actor || actor.status !== 'ACTIVE') {
    throw new SuggestionError('FORBIDDEN', 'No active user for this session')
  }

  const isAdmin = actor.role === 'ADMIN'

  if (row.audience === 'ADMIN') {
    // Admin-addressed suggestions are the admin's to triage, full stop.
    if (!isAdmin) {
      throw new SuggestionError('FORBIDDEN', 'Admin role required for this suggestion')
    }
  } else if (!isAdmin) {
    if (actor.role !== 'TEACHER') {
      throw new SuggestionError('FORBIDDEN', 'Teacher or admin role required')
    }
    let scope
    try {
      scope = await resolveTeacherScope(actorUserId)
    } catch {
      throw new SuggestionError('FORBIDDEN', 'Not a teacher user')
    }
    if (!isVisibleToTeacherScope(scope, row)) {
      throw new SuggestionError('FORBIDDEN', 'Suggestion is not in this teacher’s scope')
    }
  }

  if (!canTransition(row.status, input.status)) {
    throw new SuggestionError(
      'INVALID_STATUS_TRANSITION',
      `Cannot move a suggestion from ${row.status} to ${input.status}`
    )
  }

  const note = input.reviewerNote?.trim().slice(0, SUGGESTION_MAX_REVIEWER_NOTE_CHARS) || null
  const reviewedAt = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.suggestion.update({
      where: { id: row.id },
      data: {
        status: input.status,
        reviewedByUserId: actorUserId,
        reviewedAt,
        // Only overwrite the stored note when this call carries one, so a plain
        // status change doesn't silently erase an earlier reviewer's note.
        ...(note !== null ? { reviewerNote: note } : {}),
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: SUGGESTION_STATUS_CHANGED,
        entityType: SUGGESTION_ENTITY_TYPE,
        entityId: row.id,
        metadataJson: {
          from: row.status,
          to: input.status,
          audience: row.audience,
          hasReviewerNote: note !== null,
        },
      },
    })
  })

  return { id: row.id, status: input.status, reviewedAt }
}
