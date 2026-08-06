import { MISSION_STEP_META, MISSION_STEP_ORDER, type MissionStepKey } from './mission-steps'

/**
 * Orientation for the step a student is on: where they are in the arc, what the
 * step is for, and — the part the app never used to answer consistently —
 * whether it counts toward their score.
 *
 * The explainer text is the SAME string the StepIndicator shows on hover, from
 * one shared constant. Making it visible here is also a small accessibility win:
 * that copy is hover-only today, which is the acknowledged ADR 0016 WCAG
 * deviation, so keyboard and touch users could not reach it at all.
 */
export function StepContextBar({ stepKey }: { stepKey: MissionStepKey }) {
  const meta = MISSION_STEP_META[stepKey]
  const index = MISSION_STEP_ORDER.indexOf(stepKey)
  const position = index >= 0 ? index + 1 : null

  return (
    <div className="border-b-2 border-dashed border-indigo-100 pb-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {position !== null && (
          <span className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
            Step {position} of {MISSION_STEP_ORDER.length} · {meta.label}
          </span>
        )}
        {meta.gradeNote && (
          <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {meta.gradeNote}
          </span>
        )}
      </div>
      <p className="mt-1 max-w-prose text-sm leading-snug text-gray-600">{meta.explainer}</p>
    </div>
  )
}
