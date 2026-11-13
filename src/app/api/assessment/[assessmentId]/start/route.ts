/**
 * POST /api/assessment/[assessmentId]/start
 *
 * Returns the questions for an approved assessment, WITHOUT the answer key.
 *
 * Stateless and anonymous: this handler reads no session and writes nothing.
 * There is no attempt to create — the browser simply holds the questions it
 * was given until it submits them. The only thing the request may carry is the
 * signed readiness token that opens a Mastery Challenge.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  deliverAssessment,
  AssessmentError,
  ASSESSMENT_ERROR_STATUS,
  AssessmentStartSchema,
} from '@/lib/assessment'

interface RouteParams {
  params: { assessmentId: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  // An empty body is fine — most assessments need nothing to start.
  const body = await req.json().catch(() => ({}))
  const parsed = AssessmentStartSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const assessment = await deliverAssessment(params.assessmentId, {
      readinessToken: parsed.data.readinessToken ?? null,
    })
    return NextResponse.json(assessment, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: ASSESSMENT_ERROR_STATUS[err.code] }
      )
    }
    console.error('[assessment/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
