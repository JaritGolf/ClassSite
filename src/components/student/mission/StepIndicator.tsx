import type { ReactNode } from 'react'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const STEPS: { key: string; label: string; icon: TrackIconName; explainer: string }[] = [
  { key: 'pre-check', label: 'Pre-Check', icon: 'compass', explainer: "A quick, ungraded warm-up so you (and the app) can see what you already know before training starts." },
  { key: 'briefing', label: 'Briefing', icon: 'chat', explainer: 'The big picture for this mission — what it covers and why it matters.' },
  { key: 'vocab', label: 'Key Terms', icon: 'book', explainer: "The mission's key vocabulary words, with definitions you can look up any time." },
  { key: 'training', label: 'Training', icon: 'sparkle', explainer: 'The main lesson — notes, examples, and short ungraded checks as you go.' },
  { key: 'scenario-lab', label: 'Scenario Lab', icon: 'search', explainer: 'Practice applying what you learned to a real-world-style scenario.' },
  { key: 'practice', label: 'Practice', icon: 'bolt', explainer: 'Optional extra practice questions that adjust to how you’re doing — skip this if you feel ready.' },
  { key: 'readiness-check', label: 'Readiness Check', icon: 'target', explainer: 'A graded check to confirm you’re ready for the Mastery Challenge. You can retry it.' },
  { key: 'mastery-challenge', label: 'Mastery Challenge', icon: 'shield', explainer: 'The final graded assessment for this mission — score 80%+ to master it and unlock the next mission.' },
]

interface StepIndicatorProps {
  currentStep: string
  completedSteps: string[]
  /**
   * Teacher preview (ADR 0015): makes each step a jump button. Absent on
   * student surfaces, where the indicator stays display-only.
   */
  onStepClick?: (stepKey: string) => void
}

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
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
            <Tile
              onStepClick={onStepClick ? () => onStepClick(step.key) : undefined}
              isCurrent={isCurrent}
              label={step.label}
            >
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
              <ExplainerHover title={step.label} text={step.explainer} variant="plain">
                <span
                  className={`text-center text-xs leading-tight ${
                    isCurrent ? 'font-display font-bold text-indigo-700' : 'font-semibold text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
              </ExplainerHover>
            </Tile>
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Step tile: a plain div for students; a jump button in teacher preview.
 * Shared classes keep the two renderings visually identical.
 */
function Tile({
  onStepClick,
  isCurrent,
  label,
  children,
}: {
  onStepClick?: () => void
  isCurrent: boolean
  label: string
  children: ReactNode
}) {
  const layout = 'flex min-w-[68px] flex-col items-center gap-1'
  if (!onStepClick) return <div className={layout}>{children}</div>
  return (
    <button
      type="button"
      onClick={onStepClick}
      aria-label={`Jump to ${label}`}
      aria-current={isCurrent ? 'step' : undefined}
      className={`${layout} rounded-xl p-0.5 transition-colors hover:bg-indigo-50`}
    >
      {children}
    </button>
  )
}
