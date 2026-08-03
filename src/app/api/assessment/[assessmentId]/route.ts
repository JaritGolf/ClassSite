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
import { prisma } from '@/lib/db'
import { fetchAssessmentForStudent } from '@/lib/assessment'
import { resolveSecureMode } from '@/lib/assessment-integrity'

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

  // Resolve the Student so stimulus content is delivered at the student's
  // accommodation-aware effective reading level (spec §16, Appendix G).
  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  const result = await fetchAssessmentForStudent(params.assessmentId, student?.id)
  if (!result) {
    return NextResponse.json(
      { error: `Assessment ${params.assessmentId} not found` },
      { status: 404 }
    )
  }

  // Focus Mode is a SERVER decision (env flag × per-class opt-in × assessment
  // type). The client is told whether it is under integrity enforcement; it
  // never decides for itself.
  const secureMode = await resolveSecureMode(student?.id, result.meta.assessmentType)

  // Map the lib shape to the player's wire contract: the client keys answers
  // by `questionId` (and the submit schema validates those ids), so the field
  // name here is load-bearing — passing the lib's `id` through silently broke
  // every UI submission with a 400 ("questionId must be a valid cuid").
  return NextResponse.json({
    assessmentId: result.meta.id,
    title: result.meta.title,
    assessmentType: result.meta.assessmentType,
    masteryThreshold: result.meta.masteryThreshold,
    secureMode,
    questions: result.questions.map((q) => ({
      questionId: q.id,
      prompt: q.prompt,
      itemType: q.itemType,
      stimulus: q.stimulus,
      options: q.options.map((o, i) => ({
        id: o.id,
        optionText: o.optionText,
        position: i + 1,
      })),
    })),
  })
}
