/**
 * POST /api/practice/answer
 *
 * Grades one practice answer and returns the explanation. Used by the
 * Practice Arena and the Daily Drill.
 * Stateless and anonymous: no session is read and nothing is written.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { QuestionAnswerSchema } from '@/lib/assessment/wire'
import { gradeSingleAnswer, SingleAnswerError } from '@/lib/assessment/single-answer'

const BodySchema = QuestionAnswerSchema.extend({
  /** Ask for a remediation suggestion if this answer is wrong (near-transfer miss). */
  suggestRemediation: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const outcome = await gradeSingleAnswer(parsed.data.questionId, parsed.data.selectedOptionId, {
      withRemediation: parsed.data.suggestRemediation === true,
    })
    return NextResponse.json(outcome, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof SingleAnswerError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'NOT_FOUND' ? 404 : 403 }
      )
    }
    console.error('[practice/answer]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
