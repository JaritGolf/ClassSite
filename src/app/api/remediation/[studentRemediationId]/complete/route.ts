/**
 * POST /api/remediation/[studentRemediationId]/complete
 *
 * Mark a StudentRemediation activity as completed.
 *
 * Access: STUDENT role only (ownership verified inside completeRemediation).
 *
 * No request body needed — the studentRemediationId is in the URL.
 *
 * Response:
 *   { studentRemediationId, allRemediationsComplete, newProgressStatus }
 *
 * When all remediations for the benchmark are complete, StudentProgress
 * is advanced to REMEDIATION_COMPLETE.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { completeRemediation, RemediationError } from '@/lib/remediation'
import { recordLastActivity } from '@/lib/student-activity'

interface RouteParams {
  params: { studentRemediationId: string }
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  // Auth: students only
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  // Resolve Student.id from session
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
    const result = await completeRemediation(params.studentRemediationId, student.id)

    // Dashboard "pick up where you left off" — non-fatal, display-only.
    try {
      await recordLastActivity(student.id, 'REMEDIATION', params.studentRemediationId)
    } catch (e) {
      console.error('[student-activity]', e instanceof Error ? e.message : e)
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof RemediationError) {
      const statusMap = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        ALREADY_COMPLETED: 409,
      } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[remediation/complete]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
