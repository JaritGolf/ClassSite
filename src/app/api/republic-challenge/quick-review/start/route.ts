/**
 * POST /api/republic-challenge/quick-review/start
 *
 * Creates a Quick Review session (5-question short practice based on weak skills).
 */

import { NextResponse } from 'next/server'
import { createRepublicChallengeSession } from '@/lib/republic-challenge'
import {
  resolveAuthedStudent,
  republicChallengeErrorResponse,
} from '@/lib/republic-challenge/route-helpers'

export async function POST() {
  const auth = await resolveAuthedStudent()
  if ('error' in auth) return auth.error
  const { studentId, userId, classConfig } = auth.student

  try {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'QUICK_REVIEW',
      classConfig,
      actorUserId: userId,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return republicChallengeErrorResponse(err, 'republic-challenge/quick-review/start')
  }
}
