import { Mascot } from '@/components/ui/Mascot'
import { StepContextBar } from './StepContextBar'
import { MISSION_STEPS } from './mission-steps'

/**
 * The opening screen of a mission: what it is, how long it takes, and the arc.
 *
 * Students used to land straight in the ungraded Pre-Check with no framing at
 * all — no statement of what the mission covered, no sense of how much work it
 * was, and no explanation of why a quiz was the first thing they saw.
 *
 * Shared with the teacher walkthrough (`MissionWalkthrough`), same as
 * TrainingWalkthrough / VocabPanel / ScenarioLab, so the preview shows what
 * students actually see.
 */
export function MissionPlanPanel({
  target,
  summary,
  estimatedMinutes,
  onStart,
  ctaLabel = 'Start Mission',
}: {
  target: string
  summary: string | null
  estimatedMinutes: number
  onStart: () => void
  ctaLabel?: string
}) {
  // Every step except this one — the plan describes what is ahead.
  const ahead = MISSION_STEPS.filter((s) => s.key !== 'plan')

  return (
    <div className="space-y-5 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <StepContextBar stepKey="plan" />

      <div className="flex items-start gap-3">
        <Mascot pose="pointing" className="h-16 w-16 flex-shrink-0" />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-gray-900">Here&apos;s the plan</h2>
          <p className="mt-1 max-w-prose text-base leading-relaxed text-gray-800">
            By the end of this mission: <strong>{target}</strong>
          </p>
          {summary && summary !== target && (
            <p className="mt-2 max-w-prose text-base leading-relaxed text-gray-700">{summary}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-900">
          {ahead.length} steps
        </span>
        <span className="rounded-full border-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-900">
          about {estimatedMinutes} min
        </span>
        <span className="rounded-full border-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-900">
          You can stop and come back
        </span>
      </div>

      <div>
        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
          What you&apos;ll do
        </h3>
        <ol className="mt-2 space-y-1.5">
          {ahead.map((step, i) => (
            <li key={step.key} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-display text-xs font-bold text-indigo-800"
              >
                {i + 1}
              </span>
              <span className="min-w-0 text-base leading-snug text-gray-800">
                <span className="font-semibold">{step.label}</span>
                {step.gradeNote && (
                  <span className="text-gray-600"> — {step.gradeNote.toLowerCase()}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onStart}
        className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
      >
        {ctaLabel} →
      </button>
    </div>
  )
}
