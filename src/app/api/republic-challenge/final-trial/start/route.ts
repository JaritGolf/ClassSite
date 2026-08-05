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
import { isFinalTrialWindowOpen } from '@/lib/republic-challenge/final-trial-window'
import {
  resolveAuthedStudent,
  republicChallengeErrorResponse,
} from '@/lib/republic-challenge/route-helpers'

export async function POST() {
  const auth = await resolveAuthedStudent()
  if ('error' in auth) return auth.error
  const { studentId, userId, classConfig } = auth.student

  // Date gate, enforced HERE and not only in the hub UI.
  //
  // The hub greys the card out when the window is shut, but that is a rendering,
  // not a control — this endpoint previously accepted a POST on any day of the
  // year. Combined with `rcAttemptsAllowed` defaulting to 1, one direct request
  // in September permanently spends the year-end simulation. The same feature
  // flag that closes it in the UI closes it here.
  if (!(classConfig?.featureEocReviewEnabled ?? true)) {
    return NextResponse.json(
      { error: 'The Final Republic Trial is turned off for your class.', code: 'TRIAL_CLOSED' },
      { status: 403 }
    )
  }
  if (!isFinalTrialWindowOpen(classConfig?.schoolYear, new Date())) {
    return NextResponse.json(
      {
        error: 'The Final Republic Trial opens in April. Keep building until then.',
        code: 'TRIAL_NOT_OPEN',
      },
      { status: 403 }
    )
  }

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
