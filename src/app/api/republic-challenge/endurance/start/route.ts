/**
 * POST /api/republic-challenge/endurance/start
 *
 * Creates an Endurance Trial session — length determined by the stamina
 * ladder for the current date, with optional per-Class override.
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
      mode: 'ENDURANCE_TRIAL',
      classConfig,
      actorUserId: userId,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return republicChallengeErrorResponse(err, 'republic-challenge/endurance/start')
  }
}
