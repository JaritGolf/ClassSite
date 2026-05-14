/**
 * POST /api/drill/[benchmarkId]/review
 *
 * Submit an answer for one Daily Republic Drill item.
 *
 * Request body:
 *   { questionId: string, selectedOptionId: string, confidence: 0 | 1 | 2 }
 *
 * The server grades the answer (never trusts client isCorrect),
 * then runs the SM-2 update and records a SpacedReviewEvent.
 *
 * Auth: student role required.
 * Spec reference: Section 15.2, 15.3, 15.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { gradeReviewAnswer, submitReview, ReviewError } from '@/lib/spaced-retrieval'
import { prisma } from '@/lib/db'

const ReviewSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1),
  confidence: z.union([z.literal(0), z.literal(1), z.literal(2)]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { benchmarkId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  // Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { questionId, selectedOptionId, confidence } = parsed.data
  const { benchmarkId } = params

  // Resolve Student.id from session User.id
  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  }

  // Server-side grading — never trust client
  const isCorrect = await gradeReviewAnswer(questionId, selectedOptionId)

  try {
    const result = await submitReview(
      student.id,
      benchmarkId,
      questionId,
      isCorrect,
      confidence
    )

    return NextResponse.json({
      isCorrect,
      quality: result.quality,
      newIntervalDays: result.newIntervalDays,
      dueAt: result.dueAt,
      offRampRecovered: result.offRampRecovered,
    })
  } catch (err) {
    if (err instanceof ReviewError && err.code === 'NO_STATE') {
      return NextResponse.json(
        { error: 'No spaced review state found for this benchmark' },
        { status: 404 }
      )
    }
    throw err
  }
}
