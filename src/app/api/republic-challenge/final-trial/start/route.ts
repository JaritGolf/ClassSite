/**
 * POST /api/republic-challenge/final-trial/start
 *
 * Creates a Final Republic Trial session — full blueprint-weighted simulation
 * using level-2 and level-3 stimuli only (spec §19.3).
 *
 * Attempts allowed are governed by the Class' `rcAttemptsAllowed` setting.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createRepublicChallengeSession } from '@/lib/republic-challenge'
import {
  resolveAuthedStudent,
  republicChallengeErrorResponse,
} from '@/lib/republic-challenge/route-helpers'

export async function POST() {
  const auth = await resolveAuthedStudent()
  if ('error' in auth) return auth.error
  const { studentId, userId, classConfig } = auth.student

  // Enforce attempts-allowed: count prior FINAL_TRIAL attempts for this student.
  const allowed = classConfig?.rcAttemptsAllowed ?? 1
  const priorAttempts = await prisma.assessmentAttempt.count({
    where: {
      studentId,
      voided: false,
      assessment: { assessmentType: 'FINAL_TRIAL' },
      submittedAt: { not: null },
    },
  })
  if (priorAttempts >= allowed) {
    return NextResponse.json(
      {
        error: `Final Trial attempts allowed (${allowed}) already used.`,
        code: 'ATTEMPTS_EXHAUSTED',
      },
      { status: 403 }
    )
  }

  try {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'FINAL_REPUBLIC_TRIAL',
      classConfig,
      actorUserId: userId,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return republicChallengeErrorResponse(err, 'republic-challenge/final-trial/start')
  }
}
