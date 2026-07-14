/**
 * POST /api/assessment/[assessmentId]/start
 *
 * Creates a new AssessmentAttempt for the authenticated student.
 * Returns the attemptId to be used in the subsequent submit request.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { startAttempt, AssessmentError } from '@/lib/assessment'

interface RouteParams {
  params: { assessmentId: string }
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  // Resolve Student record from the authenticated user
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
    const result = await startAttempt(params.assessmentId, student.id)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof AssessmentError && err.code === 'NOT_FOUND') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof AssessmentError && err.code === 'READINESS_REQUIRED') {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 })
    }
    console.error('[assessment/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
