const STEPS = [
  { key: 'pre-check', label: 'Pre-Check' },
  { key: 'briefing', label: 'Briefing' },
  { key: 'vocab', label: 'Key Terms' },
  { key: 'training', label: 'Training' },
  { key: 'scenario-lab', label: 'Scenario Lab' },
  { key: 'readiness-check', label: 'Readiness Check' },
  { key: 'mastery-challenge', label: 'Mastery Challenge' },
]

interface StepIndicatorProps {
  currentStep: string
  completedSteps: string[]
}

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <nav aria-label="Mission progress" className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, index) => {
        const isComplete = completedSteps.includes(step.key)
        const isCurrent = step.key === currentStep

        return (
          <div key={step.key} className="flex items-center gap-1">
            {index > 0 && (
              <div className={`h-0.5 w-4 flex-shrink-0 ${isComplete || completedSteps.includes(STEPS[index - 1].key) ? 'bg-indigo-300' : 'bg-gray-200'}`} />
            )}
            <div
              className={`flex flex-col items-center gap-0.5 min-w-[64px] ${isCurrent ? '' : 'opacity-70'}`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isComplete
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              <span className={`text-xs text-center leading-tight ${isCurrent ? 'text-indigo-700 font-semibold' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
