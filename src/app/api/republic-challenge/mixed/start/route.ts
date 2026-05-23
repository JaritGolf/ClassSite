/**
 * POST /api/republic-challenge/mixed/start
 *
 * Creates a Mixed Mission session — blueprint-weighted across all reporting
 * categories. Optional `length` in the request body (default: 10).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createRepublicChallengeSession } from '@/lib/republic-challenge'
import {
  resolveAuthedStudent,
  republicChallengeErrorResponse,
} from '@/lib/republic-challenge/route-helpers'

export async function POST(req: NextRequest) {
  const auth = await resolveAuthedStudent()
  if ('error' in auth) return auth.error
  const { studentId, userId, classConfig } = auth.student

  let length: number | undefined
  try {
    const body = (await req.json()) as { length?: number }
    if (typeof body.length === 'number' && body.length > 0 && body.length <= 100) {
      length = Math.floor(body.length)
    }
  } catch {
    /* empty body is fine */
  }

  try {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'MIXED_MISSION',
      length,
      classConfig,
      actorUserId: userId,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return republicChallengeErrorResponse(err, 'republic-challenge/mixed/start')
  }
}
