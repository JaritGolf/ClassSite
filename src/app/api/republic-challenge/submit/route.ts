/**
 * POST /api/republic-challenge/submit
 *
 * Grades a Republic Challenge session. Only a question set the server itself
 * issued (proved by the signed session token) can be graded, and the response
 * is right/wrong + score — never the key.
 * Stateless and anonymous: no session is read and nothing is written.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  gradeRcSession,
  RcSubmitSchema,
  RC_ERROR_STATUS,
  RepublicChallengeError,
} from '@/lib/republic-challenge/stateless'

export async function POST(req: NextRequest) {
  const parsed = RcSubmitSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const grade = await gradeRcSession(parsed.data)
    return NextResponse.json(grade, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof RepublicChallengeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: RC_ERROR_STATUS[err.code] })
    }
    console.error('[republic-challenge/submit]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
