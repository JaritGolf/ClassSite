import { ModeCard } from './ModeCard'

interface HubConfig {
  featureEocReviewEnabled: boolean
  stamina: { label: string; length: number; isLadderPeak: boolean }
  finalTrial: { open: boolean; length: number; attemptsAllowed: number; reviewWindow: string }
}

export function Hub({ config }: { config: HubConfig }) {
  if (!config.featureEocReviewEnabled) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Republic Challenge</h1>
        <p className="text-gray-600">
          Republic Challenge is disabled for your class. Check back when your teacher
          turns it on.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Republic Challenge</h1>
        <p className="text-sm text-gray-600 mt-1">
          Cumulative review to consolidate everything you've mastered.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        <ModeCard
          title="Quick Review"
          description="A short practice based on the skills slipping fastest."
          startUrl="/api/republic-challenge/quick-review/start"
          meta="5 questions"
        />

        <ModeCard
          title="Category Challenge"
          description="Practice within one EOC reporting category."
          href="/student/republic-challenge/category"
          startUrl=""
          meta="Pick a category"
        />

        <ModeCard
          title="Mixed Mission"
          description="A blueprint-weighted mix of all four EOC reporting categories."
          startUrl="/api/republic-challenge/mixed/start"
          length={10}
          meta="10 questions"
        />

        <ModeCard
          title="Mistake Replay"
          description="Re-attempt the questions you've missed before."
          startUrl="/api/republic-challenge/mistake-replay/start"
          length={10}
          meta="10 questions"
        />

        <ModeCard
          title="Source Sprint"
          description="Practice stimulus-heavy items (excerpts, charts, maps)."
          href="/student/republic-challenge/source-sprint"
          startUrl=""
          meta="Pick a source type"
        />

        <ModeCard
          title="Endurance Trial"
          description="Build stamina. Today's length is based on the time of year."
          startUrl="/api/republic-challenge/endurance/start"
          meta={`${config.stamina.length} questions · ${config.stamina.label}`}
        />

        <ModeCard
          title="Final Republic Trial"
          description="Full-length EOC simulation. Only level-2 and level-3 stimuli."
          startUrl="/api/republic-challenge/final-trial/start"
          meta={`${config.finalTrial.length} questions`}
          disabled={!config.finalTrial.open}
          disabledReason="Final Trial opens in April."
        />
      </div>
    </div>
  )
}
