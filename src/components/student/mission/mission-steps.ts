import { parseStepContent } from '@/lib/lesson-content'
import type { TrackIconName } from '@/components/ui/TrackIcon'

/**
 * The mission arc, in one place.
 *
 * This used to be two parallel lists that could drift: `STEP_ORDER` in
 * MissionFlow (the state machine) and `STEPS` in StepIndicator (labels, icons,
 * hover explainers). Adding a step meant remembering to edit both, and nothing
 * failed if you didn't — the indicator would simply stop matching the flow.
 *
 * `gradeNote` is new, and it answers the question 7th graders actually ask about
 * every screen: does this count? Previously the app only implied it, and only on
 * some steps.
 */

export type MissionStepKey =
  | 'plan'
  | 'pre-check'
  | 'briefing'
  | 'vocab'
  | 'training'
  | 'scenario-lab'
  | 'practice'
  | 'readiness-check'
  | 'mastery-challenge'

export interface MissionStepMeta {
  key: MissionStepKey
  label: string
  icon: TrackIconName
  /** What the step is for. Shown visibly in the step panel AND on hover. */
  explainer: string
  /** Whether this counts toward the student's score. null = nothing to say. */
  gradeNote: string | null
}

export const MISSION_STEPS: readonly MissionStepMeta[] = [
  {
    key: 'plan',
    label: 'Mission Plan',
    icon: 'map',
    explainer:
      'What this mission covers and the steps you will work through. Read it, then start whenever you are ready.',
    gradeNote: null,
  },
  {
    key: 'pre-check',
    label: 'Pre-Check',
    icon: 'compass',
    explainer:
      'A quick warm-up so you and the app can see what you already know before training starts.',
    gradeNote: 'Does not count toward your score',
  },
  {
    key: 'briefing',
    label: 'Briefing',
    icon: 'chat',
    explainer: 'The big picture for this mission — what it covers and why it matters.',
    gradeNote: 'Nothing to answer here',
  },
  {
    key: 'vocab',
    label: 'Key Terms',
    icon: 'book',
    explainer:
      "The mission's key vocabulary words, with definitions you can look up any time.",
    gradeNote: 'Practice only — not part of your grade',
  },
  {
    key: 'training',
    label: 'Training',
    icon: 'sparkle',
    explainer: 'The main lesson — notes, examples, and short checks as you go.',
    gradeNote: 'Checks here are practice, not graded',
  },
  {
    key: 'scenario-lab',
    label: 'Scenario Lab',
    icon: 'search',
    explainer: 'Practice applying what you learned to a real-world-style scenario.',
    gradeNote: 'Practice only — not part of your grade',
  },
  {
    key: 'practice',
    label: 'Practice',
    icon: 'bolt',
    explainer:
      'Extra practice questions that adjust to how you are doing. Optional — skip it if you feel ready.',
    gradeNote: 'Practice only — not part of your grade',
  },
  {
    key: 'readiness-check',
    label: 'Readiness Check',
    icon: 'target',
    explainer: 'A short check to confirm you are ready for the Mastery Challenge. You can retry it.',
    gradeNote: 'Unlocks the Mastery Challenge — retry as often as you need',
  },
  {
    key: 'mastery-challenge',
    label: 'Mastery Challenge',
    icon: 'shield',
    explainer:
      'The final assessment for this mission — score 80% or higher to master it and open the next mission.',
    gradeNote: 'This one counts — 80% to master this mission',
  },
]

/** Flow order. Derived from the list above so the two can never disagree. */
export const MISSION_STEP_ORDER: readonly MissionStepKey[] = MISSION_STEPS.map((s) => s.key)

/**
 * Lookup by key. The explicit `Record<MissionStepKey, …>` annotation means a step
 * added to the union but forgotten in `MISSION_STEPS` is a compile error rather
 * than a runtime `undefined`.
 */
export const MISSION_STEP_META: Record<MissionStepKey, MissionStepMeta> = Object.fromEntries(
  MISSION_STEPS.map((s) => [s.key, s])
) as Record<MissionStepKey, MissionStepMeta>

/**
 * Roughly how long this particular mission will take, scaled to the content that
 * is actually present.
 *
 * A content-scaled estimate, NOT a measurement: a fixed "about 20 min" would be
 * wrong for a 4-step mission and wrong for a 14-step one. Rounded to 5 minutes
 * so it never looks more precise than it is.
 */
export function estimateMissionMinutes(counts: {
  trainingSteps: number
  vocabSteps: number
  scenarioSteps: number
  assessmentCount: number
  /**
   * Content pieces BEYOND one per module, across all training modules.
   *
   * A composite module holds an ordered stack of pieces, so counting modules
   * alone would advertise a six-piece module as 90 seconds. Only the extras
   * are counted here — the first piece is already covered by the module's own
   * 1.5 minutes.
   */
  extraTrainingBlocks?: number
}): number {
  const raw =
    3 + // briefing
    counts.vocabSteps * 1 +
    counts.trainingSteps * 1.5 +
    (counts.extraTrainingBlocks ?? 0) * 1.5 +
    counts.scenarioSteps * 2 +
    counts.assessmentCount * 4
  return Math.max(5, Math.round(raw / 5) * 5)
}

/**
 * How many EXTRA content pieces a set of modules holds beyond one each.
 * Feeds `extraTrainingBlocks` above.
 */
export function countExtraBlocks(
  steps: readonly { stepType: string; content: string }[]
): number {
  let extra = 0
  for (const step of steps) {
    const parsed = parseStepContent(step.stepType, step.content)
    if (parsed.kind === 'composite') extra += Math.max(0, parsed.blocks.length - 1)
  }
  return extra
}
