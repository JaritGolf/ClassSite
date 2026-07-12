import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'

const STEPS: { key: string; label: string; icon: TrackIconName }[] = [
  { key: 'pre-check', label: 'Pre-Check', icon: 'compass' },
  { key: 'briefing', label: 'Briefing', icon: 'chat' },
  { key: 'vocab', label: 'Key Terms', icon: 'book' },
  { key: 'training', label: 'Training', icon: 'sparkle' },
  { key: 'scenario-lab', label: 'Scenario Lab', icon: 'search' },
  { key: 'practice', label: 'Practice', icon: 'bolt' },
  { key: 'readiness-check', label: 'Readiness Check', icon: 'target' },
  { key: 'mastery-challenge', label: 'Mastery Challenge', icon: 'shield' },
]

interface StepIndicatorProps {
  currentStep: string
  completedSteps: string[]
}

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    // tabIndex: the step list can overflow horizontally — keyboard users need
    // to be able to focus the scroll region to pan it (axe scrollable-region-focusable).
    <nav aria-label="Mission progress" tabIndex={0} className="flex items-start gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, index) => {
        const isComplete = completedSteps.includes(step.key)
        const isCurrent = step.key === currentStep

        return (
          <div key={step.key} className="flex items-start gap-1">
            {index > 0 && (
              <div
                className={`mt-4 h-1 w-4 flex-shrink-0 rounded-full ${
                  isComplete || completedSteps.includes(STEPS[index - 1].key)
                    ? 'bg-indigo-400'
                    : 'bg-gray-200'
                }`}
              />
            )}
            <div className="flex min-w-[68px] flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border-b-2 ${
                  isComplete
                    ? 'border-green-700 bg-green-500 text-white'
                    : isCurrent
                    ? 'border-indigo-800 bg-indigo-600 text-white ring-2 ring-indigo-200'
                    : 'border-gray-300 bg-gray-100 text-gray-500'
                }`}
              >
                {isComplete ? (
                  <TrackIcon name="check" className="h-5 w-5" strokeWidth={2.6} />
                ) : (
                  <TrackIcon name={step.icon} className="h-4 w-4" strokeWidth={2.2} />
                )}
              </div>
              <span
                className={`text-center text-xs leading-tight ${
                  isCurrent ? 'font-display font-bold text-indigo-700' : 'font-semibold text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
