/**
 * POST /api/assessment/[assessmentId]/submit
 *
 * Grades a submission against the server-side answer key and returns the
 * score and feedback.
 *
 * Stateless and anonymous: this handler reads no session and writes nothing.
 * The request holds question ids, chosen options and confidence ratings; the
 * response holds the result. Neither says who the student is, and nothing is
 * kept afterwards.
 *
 * SECURITY:
 *   - The body is validated and stripped by zod; `isCorrect`, a score, or any
 *     other field a tampered client adds is dropped before grading.
 *   - Correctness, score and pass/fail are computed from the database key.
 *   - Secure assessment types return right/wrong only — no key, no feedback.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  gradeSubmission,
  AssessmentError,
  ASSESSMENT_ERROR_STATUS,
  AssessmentSubmitSchema,
  type AssessmentSubmitResult,
} from '@/lib/assessment'

interface RouteParams {
  params: { assessmentId: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = AssessmentSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const outcome = await gradeSubmission(params.assessmentId, {
      responses: parsed.data.responses,
      readinessToken: parsed.data.readinessToken ?? null,
    })

    const result: AssessmentSubmitResult = {
      assessmentType: outcome.assessmentType,
      benchmarkCode: outcome.benchmarkCode,
      score: outcome.score,
      passed: outcome.passed,
      totalQuestions: outcome.totalQuestions,
      correctCount: outcome.correctCount,
      results: outcome.results,
      calibration: outcome.calibration,
      reviewTopics: outcome.reviewTopics,
      readinessToken: outcome.readinessToken,
      remediation: outcome.remediation,
      completionCode: outcome.completionCode,
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: ASSESSMENT_ERROR_STATUS[err.code] }
      )
    }
    console.error('[assessment/submit]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
