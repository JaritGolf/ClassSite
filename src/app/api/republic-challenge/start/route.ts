/**
 * POST /api/republic-challenge/start
 *
 * Picks questions for a Republic Challenge session and returns them without
 * the answer key, plus a signed token naming exactly that question set.
 * Stateless and anonymous: no session is read and nothing is written.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPublishedClass } from '@/lib/student-content'
import {
  RcStartSchema,
  RC_ERROR_STATUS,
  RepublicChallengeError,
  startRcSession,
} from '@/lib/republic-challenge/stateless'

export async function POST(req: NextRequest) {
  const parsed = RcStartSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const session = await startRcSession(parsed.data, await getPublishedClass())
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof RepublicChallengeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: RC_ERROR_STATUS[err.code] })
    }
    console.error('[republic-challenge/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
