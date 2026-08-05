import { ModeCard } from './ModeCard'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

/** Exported so the page cannot keep its own drifting copy of this shape. */
export interface HubConfig {
  featureEocReviewEnabled: boolean
  stamina: { label: string; length: number; isLadderPeak: boolean }
  finalTrial: {
    open: boolean
    length: number
    attemptsAllowed: number
    reviewWindow: string
    /** How many of the four EOC categories currently have questions behind them. */
    blueprintCoverage: { covered: number; total: number }
  }
}

export function Hub({ config }: { config: HubConfig }) {
  if (!config.featureEocReviewEnabled) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="mb-2 font-display text-3xl font-bold text-indigo-900">Republic Challenge</h1>
        <p className="text-base text-gray-600">
          Republic Challenge is disabled for your class. Check back when your teacher
          turns it on.
        </p>
      </div>
    )
  }

  const { covered, total } = config.finalTrial.blueprintCoverage
  const partialBlueprint = covered < total

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <ExplainerHover
          title="Republic Challenge"
          text="Optional review sessions that mix questions across missions — great for staying sharp between Mastery Challenges and building up to the real EOC."
          variant="plain"
        >
          <h1 className="font-display text-3xl font-bold text-indigo-900">Republic Challenge</h1>
        </ExplainerHover>
        <p className="mt-1 text-base text-gray-600">
          Cumulative review to consolidate everything you&apos;ve mastered.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          title="Quick Review"
          description="A short practice based on the skills slipping fastest."
          startUrl="/api/republic-challenge/quick-review/start"
          meta="5 questions"
          icon="sparkle"
        />

        <ModeCard
          title="Category Challenge"
          description="Practice within one EOC reporting category."
          href="/student/republic-challenge/category"
          startUrl=""
          meta="Pick a category"
          icon="target"
        />

        <ModeCard
          title="Mixed Mission"
          description="A blueprint-weighted mix of all four EOC reporting categories."
          startUrl="/api/republic-challenge/mixed/start"
          length={10}
          meta="10 questions"
          icon="map"
        />

        <ModeCard
          title="Mistake Replay"
          description="Re-attempt the questions you've missed before."
          startUrl="/api/republic-challenge/mistake-replay/start"
          length={10}
          meta="10 questions"
          icon="search"
        />

        <ModeCard
          title="Source Sprint"
          description="Practice stimulus-heavy items (excerpts, charts, maps)."
          href="/student/republic-challenge/source-sprint"
          startUrl=""
          meta="Pick a source type"
          icon="book"
        />

        <ModeCard
          title="Endurance Trial"
          description="Build stamina. Today's length is based on the time of year."
          startUrl="/api/republic-challenge/endurance/start"
          meta={`${config.stamina.length} questions · ${config.stamina.label}`}
          metaExplainer="Endurance sessions get longer as the school year goes on, so your test-taking stamina builds up gradually toward the real EOC."
          icon="flame"
        />

        {/* The coverage line is not decoration. When categories have no content
            the picker backfills from whatever is approved, so the "full EOC
            simulation" can quietly be one category deep. Saying so is the
            difference between a practice test and a misleading score. */}
        <ModeCard
          title="Final Republic Trial"
          description={
            partialBlueprint
              ? `Full-length EOC simulation. Right now it covers ${config.finalTrial.blueprintCoverage.covered} of the ${config.finalTrial.blueprintCoverage.total} EOC topic areas — the rest aren't built yet.`
              : 'Full-length EOC simulation. Only level-2 and level-3 stimuli.'
          }
          startUrl="/api/republic-challenge/final-trial/start"
          meta={`${config.finalTrial.length} questions`}
          metaExplainer={
            partialBlueprint
              ? "The real EOC draws evenly from four topic areas. Until every area has missions, this simulation pulls extra questions from the areas that do — so treat the score as practice, not a prediction."
              : undefined
          }
          disabled={!config.finalTrial.open}
          disabledReason="Final Trial opens in April."
          icon="shield"
        />
      </div>
    </div>
  )
}
