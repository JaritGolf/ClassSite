/**
 * GET /api/republic-challenge/config
 *
 * Returns the Republic Challenge configuration for the authenticated student:
 *   - the Class config (session length, attempts allowed, review window)
 *   - the computed stamina-ladder length for today (label + length)
 *   - the four reporting categories (id, name) for the Category Challenge picker
 *   - whether the Final Trial is currently within window (date gate + feature flag)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getStaminaLengthForDate,
  FINAL_TRIAL_DEFAULT_LENGTH,
} from '@/lib/republic-challenge'
import { resolveAuthedStudent } from '@/lib/republic-challenge/route-helpers'

export async function GET() {
  const auth = await resolveAuthedStudent()
  if ('error' in auth) return auth.error
  const { classConfig } = auth.student

  const now = new Date()
  const ladder = getStaminaLengthForDate(now)
  const enduranceLength =
    classConfig?.rcStaminaOverride ??
    classConfig?.rcSessionLengthOverride ??
    ladder.length ??
    FINAL_TRIAL_DEFAULT_LENGTH

  // Final Trial gating: default opens April 1; teacher can flip the feature flag.
  const aprilFirstThisYear = new Date(Date.UTC(now.getUTCFullYear(), 3, 1))
  const finalTrialOpen =
    (classConfig?.featureEocReviewEnabled ?? true) && now >= aprilFirstThisYear

  const categories = await prisma.reportingCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    featureEocReviewEnabled: classConfig?.featureEocReviewEnabled ?? true,
    stamina: {
      label: ladder.label,
      length: enduranceLength,
      isLadderPeak: ladder.length === null,
    },
    finalTrial: {
      open: finalTrialOpen,
      length: FINAL_TRIAL_DEFAULT_LENGTH,
      attemptsAllowed: classConfig?.rcAttemptsAllowed ?? 1,
      reviewWindow: classConfig?.rcReviewWindow ?? 'after_submit',
    },
    categories,
  })
}
