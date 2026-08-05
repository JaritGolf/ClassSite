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
  getBlueprintCoverage,
  FINAL_TRIAL_DEFAULT_LENGTH,
} from '@/lib/republic-challenge'
import { isFinalTrialWindowOpen } from '@/lib/republic-challenge/final-trial-window'
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

  // Final Trial gating: opens in the April belonging to the student's OWN school
  // year (see final-trial-window.ts — the old calendar-year gate read OPEN in
  // August), and the teacher can still close it with the feature flag.
  const finalTrialOpen =
    (classConfig?.featureEocReviewEnabled ?? true) &&
    isFinalTrialWindowOpen(classConfig?.schoolYear, now)

  const [categories, blueprintCoverage] = await Promise.all([
    prisma.reportingCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    // Level 2+ is what the Final Trial draws from (see pickFinalRepublicTrial).
    getBlueprintCoverage(2),
  ])

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
      /**
       * How much of the EOC blueprint the simulation can actually draw from.
       * Surfaced because the picker BACKFILLS empty categories silently, so
       * without this the card would promise a full four-category exam while
       * quietly serving one category's questions.
       */
      blueprintCoverage,
    },
    categories,
  })
}
