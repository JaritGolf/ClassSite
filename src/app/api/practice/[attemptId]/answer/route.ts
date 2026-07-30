/**
 * POST /api/practice/[attemptId]/answer
 *
 * Submit one answer in an adaptive practice session.
 * Grades server-side, updates AdaptiveSessionState, and returns
 * the next action the client should take.
 *
 * Access: STUDENT only.
 *
 * Request body:
 *   questionId:       string (Question.id)
 *   selectedOptionId: string (QuestionOption.id)
 *   confidence?:      0 | 1 | 2
 *   timeSeconds?:     number
 *
 * Response:
 *   { isCorrect, nextAction, newComplexity, remediationAssigned }
 *
 * nextAction values:
 *   NEXT_QUESTION        — continue normally
 *   WORKED_EXAMPLE       — call GET next-item to receive worked example
 *   NEAR_TRANSFER        — (handled via next-item after worked example)
 *   REMEDIATION_ESCALATED — near-transfer was wrong; remediation assigned
 *   SESSION_COMPLETE     — no more questions available
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { submitPracticeAnswer, AdaptiveError } from '@/lib/adaptive-difficulty'
import { recordActivity } from '@/lib/streak'
import { evaluateAndAwardBadges } from '@/lib/badges'
import { touchActivitySafe } from '@/lib/activity-sessions'

interface RouteParams {
  params: { attemptId: string }
}

const AnswerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOptionId: z.string().cuid(),
  confidence: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  timeSeconds: z.number().int().min(0).max(7200).optional(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
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

  const parsed = AnswerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Resolve Student.id
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
    const result = await submitPracticeAnswer(
      params.attemptId,
      parsed.data.questionId,
      parsed.data.selectedOptionId,
      student.id,
      parsed.data.confidence,
      parsed.data.timeSeconds
    )

    // Streak credit + badge evaluation — non-fatal, both idempotent.
    try {
      await recordActivity(student.id, new Date())
      await evaluateAndAwardBadges(student.id)
    } catch (hookErr) {
      console.error('[streak+badges]', hookErr instanceof Error ? hookErr.message : hookErr)
    }

    await touchActivitySafe(student.id, { area: 'practice' })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AdaptiveError) {
      const statusMap = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        QUESTION_NOT_IN_BENCHMARK: 422,
        ALREADY_SUBMITTED: 409,
      } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[practice/answer]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
