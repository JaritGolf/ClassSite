import { TrackIcon } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface StreakWidgetProps {
  currentLength: number
  longestLength: number
  freezeTokens: number
}

export function StreakWidget({ currentLength, longestLength, freezeTokens }: StreakWidgetProps) {
  const active = currentLength > 0

  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-amber-100 bg-white p-5 shadow-card">
      <span
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
          active ? 'bg-amber-400 text-amber-950' : 'bg-gray-100 text-gray-500'
        }`}
      >
        <TrackIcon name="flame" className="h-6 w-6" />
      </span>
      <div>
        <ExplainerHover
          title="Streak"
          text="How many days in a row you've done at least one mission, drill, or practice item. Keep it going by doing a little Civics Quest every day."
        >
          <p className="font-display text-3xl font-bold leading-none text-gray-900">
            {currentLength}
            <span className="ml-1.5 text-base font-semibold text-gray-500">
              day{currentLength !== 1 ? 's' : ''}
            </span>
          </p>
        </ExplainerHover>
        <p className="mt-1 text-sm text-gray-500">Streak · Best: {longestLength} day{longestLength !== 1 ? 's' : ''}</p>
      </div>
      {freezeTokens > 0 && (
        <ExplainerHover
          title="Freeze Tokens"
          text="Freeze tokens protect your streak if you miss a day. You earn one automatically every so often, up to 3 at a time — no penalty for having none."
          variant="plain"
          wrapperClassName="ml-auto"
        >
          <div className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-700">
            🧊 ×{freezeTokens}
          </div>
        </ExplainerHover>
      )}
    </div>
  )
}
