/**
 * POST /api/mastery/[benchmarkId]/override
 *
 * Apply a teacher override to a student's benchmark progress.
 *
 * Access: TEACHER and ADMIN roles only.
 *
 * Request body:
 *   studentId: string (Student.id)
 *   action: TeacherOverrideAction enum value
 *   reason: string (required, 1–1000 chars)
 *
 * Response:
 *   { overrideId, auditLogId, newProgressStatus }
 *
 * Every override is written to both teacher_overrides and audit_logs tables.
 * Spec reference: Section 36.5 Audit 4 item 7.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { applyTeacherOverride, OverrideError } from '@/lib/mastery'

interface RouteParams {
  params: { benchmarkId: string }
}

const OverrideSchema = z.object({
  studentId: z.string().cuid(),
  action: z.enum([
    'UNLOCK_BENCHMARK',
    'MARK_MASTERED',
    'MARK_EXPOSURE_COMPLETE',
    'ASSIGN_REMEDIATION',
    'EXTEND_DEADLINE',
    'CUSTOM',
  ]),
  reason: z.string().min(1).max(1000),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  // Auth: teacher or admin only
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: teachers and admins only' },
      { status: 403 }
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = OverrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await applyTeacherOverride(
      session.user.userId,
      parsed.data.studentId,
      params.benchmarkId,
      parsed.data.action,
      parsed.data.reason
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof OverrideError) {
      const statusMap = { FORBIDDEN: 403, NOT_FOUND: 404 } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[mastery/override]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
