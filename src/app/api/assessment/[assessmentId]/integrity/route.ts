/**
 * POST /api/assessment/[assessmentId]/integrity
 *
 * Records that a student left a secure assessment, or attempted a blocked
 * input, while an attempt was in progress. Called by the Focus Mode client
 * (useSecureMode) on a debounce and once more just before submit.
 *
 * SECURITY:
 *   - Zod (IntegrityReportSchema) validates + strips the body; the wire
 *     contract has no timestamp field, so recordedAt is always the server clock
 *   - recordIntegrityEvents verifies the attempt belongs to this student,
 *     refuses already-submitted attempts, and caps rows per attempt
 *
 * This endpoint never affects grading. A failure here is invisible to the
 * student by design — losing an integrity event must not block someone from
 * finishing a test.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { IntegrityReportSchema } from '@/lib/assessment/wire'
import { recordIntegrityEvents, IntegrityError } from '@/lib/assessment-integrity'

interface RouteParams {
  params: { assessmentId: string }
}

export async function POST(req: NextRequest, { params: _params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = IntegrityReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json(
      { error: 'Student profile not found for this user' },
      { status: 404 }
    )
  }

  try {
    const result = await recordIntegrityEvents(
      parsed.data.attemptId,
      student.id,
      parsed.data.events
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof IntegrityError) {
      const statusMap = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        ALREADY_SUBMITTED: 409,
      } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[assessment/integrity]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
