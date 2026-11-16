import { RepublicChallengePlayer } from '@/components/student/republic-challenge/RepublicChallengePlayer'

export const metadata = { title: 'Republic Challenge' }

const MODES = new Set([
  'QUICK_REVIEW',
  'CATEGORY_CHALLENGE',
  'MIXED_MISSION',
  'MISTAKE_REPLAY',
  'SOURCE_SPRINT',
  'ENDURANCE_TRIAL',
  'FINAL_REPUBLIC_TRIAL',
])

interface PageProps {
  searchParams: { mode?: string; category?: string; source?: string }
}

/**
 * The URL names a game mode and, for two modes, a curriculum category or
 * source type. Nothing in it describes a person (rule: no PII in URLs).
 */
export default function RepublicChallengePlayPage({ searchParams }: PageProps) {
  const mode = searchParams.mode && MODES.has(searchParams.mode) ? searchParams.mode : 'QUICK_REVIEW'
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <RepublicChallengePlayer
        mode={mode}
        reportingCategoryId={searchParams.category ?? null}
        stimulusType={searchParams.source ?? null}
      />
    </div>
  )
}
