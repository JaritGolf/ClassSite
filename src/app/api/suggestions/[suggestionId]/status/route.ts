/**
 * PATCH /api/suggestions/[suggestionId]/status — triage a suggestion (ADR 0021).
 *
 * SUB MODE IS GUARDED HERE (unlike POST /api/suggestions — see that file's header).
 * Working through the feedback queue is the owning teacher's bookkeeping, not a
 * substitute's. The line: anyone may submit, only the owner may triage.
 *
 * The TEACHER/ADMIN check below is a coarse gate. The real per-row ACL lives in
 * `updateSuggestionStatus`, which reuses the same visibility predicate the read
 * path uses, so a teacher can only triage what they can actually see.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import {
  updateSuggestionStatus,
  SuggestionError,
  SUGGESTION_MAX_REVIEWER_NOTE_CHARS,
} from '@/lib/suggestions'

const StatusSchema = z.object({
  status: z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']),
  reviewerNote: z.string().trim().max(SUGGESTION_MAX_REVIEWER_NOTE_CHARS).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { suggestionId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  const parsed = StatusSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  try {
    await assertNotSubMode()
    const result = await updateSuggestionStatus(
      session.user.userId,
      params.suggestionId,
      parsed.data
    )
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof SuggestionError) {
      switch (e.code) {
        case 'NOT_FOUND':
          return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
        case 'FORBIDDEN':
        case 'ROLE_NOT_ALLOWED':
          return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        // 409, not 422: the body is well-formed and it's the current server state
        // that rejects it, so the client's fix is "reload", not "retype".
        case 'INVALID_STATUS_TRANSITION':
          return NextResponse.json({ error: 'INVALID_STATUS_TRANSITION' }, { status: 409 })
        default:
          return NextResponse.json({ error: e.code }, { status: 422 })
      }
    }
    throw e
  }
}
