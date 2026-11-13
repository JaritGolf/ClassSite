import { getPublishedClass } from '@/lib/student-content'
import { getStaminaLengthForDate, FINAL_TRIAL_DEFAULT_LENGTH, isFinalTrialWindowOpen } from '@/lib/republic-challenge'
import { getBlueprintCoverage } from '@/lib/republic-challenge/stateless'
import { Hub } from '@/components/student/republic-challenge/Hub'

export const metadata = { title: 'Republic Challenge' }

/** Hub configuration is curriculum + calendar only — the same for every visitor. */
export default async function RepublicChallengeHubPage() {
  const [publishedClass, blueprintCoverage] = await Promise.all([
    getPublishedClass(),
    getBlueprintCoverage(2),
  ])
  const now = new Date()
  const ladder = getStaminaLengthForDate(now)
  const enabled = publishedClass?.featureEocReviewEnabled ?? true

  return (
    <Hub
      config={{
        featureEocReviewEnabled: enabled,
        stamina: {
          label: ladder.label,
          length:
            publishedClass?.rcStaminaOverride ??
            publishedClass?.rcSessionLengthOverride ??
            ladder.length ??
            FINAL_TRIAL_DEFAULT_LENGTH,
          isLadderPeak: ladder.length === null,
        },
        finalTrial: {
          open: enabled && isFinalTrialWindowOpen(publishedClass?.schoolYear, now),
          length: FINAL_TRIAL_DEFAULT_LENGTH,
          blueprintCoverage,
        },
      }}
    />
  )
}
