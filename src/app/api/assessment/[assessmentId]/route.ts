/**
 * GET /api/assessment/[assessmentId]
 *
 * Delivers an assessment's metadata and questions to an authenticated student.
 *
 * SECURITY: Response NEVER includes isCorrect or feedback on options.
 * Uses fetchAssessmentForStudent() which selects only safe fields via explicit
 * Prisma select (isCorrect is deliberately omitted).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchAssessmentForStudent } from '@/lib/assessment'

interface RouteParams {
  params: { assessmentId: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  // Auth: use getSession() — API routes return JSON errors, not redirects
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  const result = await fetchAssessmentForStudent(params.assessmentId)
  if (!result) {
    return NextResponse.json(
      { error: `Assessment ${params.assessmentId} not found` },
      { status: 404 }
    )
  }

  return NextResponse.json({
    assessmentId: result.meta.id,
    title: result.meta.title,
    assessmentType: result.meta.assessmentType,
    masteryThreshold: result.meta.masteryThreshold,
    questions: result.questions,
  })
}
