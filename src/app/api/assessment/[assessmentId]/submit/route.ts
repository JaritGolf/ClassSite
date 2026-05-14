/**
 * POST /api/assessment/[assessmentId]/submit
 *
 * Grades a student's assessment submission server-side.
 *
 * SECURITY:
 *   - Request body is validated + stripped by Zod (SubmitSchema)
 *   - isCorrect and pointsAwarded are NEVER read from the client payload
 *   - gradeAndSubmit() recomputes correctness from the DB answer key
 *   - Ownership verified inside gradeAndSubmit (attempt must belong to student)
 *
 * Response modes:
 *   - PRACTICE: returns score + per-item feedback
 *   - All secure types (MASTERY_CHALLENGE, etc.): returns score only, no feedback
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { gradeAndSubmit, SubmitSchema, AssessmentError } from '@/lib/assessment'

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

  // Parse and validate request body (Zod strips unknown fields)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Resolve Student record
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
    const result = await gradeAndSubmit(parsed.data, student.id)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AssessmentError) {
      const statusMap = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        ALREADY_SUBMITTED: 409,
        CONFIDENCE_REQUIRED: 422,
      } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[assessment/submit]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
