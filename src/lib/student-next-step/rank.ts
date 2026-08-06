/**
 * The ranking rule: given everything a student could do, what should they do next?
 *
 * ── Why this module exists ───────────────────────────────────────────────────
 * The dashboard used to render four calls-to-action of near-identical visual
 * weight ("Pick up where you left off", "Continue Mission", "Start Drill", and
 * the remediation card) with nothing ranking them, and every terminal screen —
 * mastery pass, mastery fail, drill complete, remediation complete — dead-ended
 * into the Mission Map. The app knew what came next and declined to say so. The
 * worst case: a failed Mastery Challenge assigned a specific remediation and
 * then offered a link to the map instead of to the work it had just assigned.
 *
 * This is the single place that decides. Every surface reads it, for the same
 * reason `mastery/availability.ts` is the single place that decides what is
 * openable: the bug class being fixed came from several surfaces each answering
 * the same question slightly differently.
 *
 * ── The order, and why ───────────────────────────────────────────────────────
 *   1. REMEDIATION       — the engine assigned it after a failure, and it gates
 *                          the off-ramp (rule #4). Targeted work outranks
 *                          self-directed work.
 *   2. MISSION_RESUME    — work already begun. Resuming beats starting something
 *                          new; that is what "frictionless" means here.
 *   3. DRILL             — short and time-sensitive (SM-2 due dates). A good
 *                          warm-up, and it decays if deferred.
 *   4. MISSION_START     — the new mission. Where a brand-new student lands.
 *   5. STRATEGY          — only when a teacher set a requirement and it is owed.
 *   6. REPUBLIC_CHALLENGE— optional review, once there is something to review.
 *   7. ALL_CAUGHT_UP     — genuinely nothing left.
 *
 * Pure by design: no Prisma, so every branch is reachable from fixtures.
 */

import {
  ESTIMATED_MINUTES,
  MAX_THEN_STEPS,
  estimateDrillMinutes,
  type NextStep,
  type NextStepIcon,
  type StudentPlan,
} from './types'
import type { MissionNodeState } from '@/lib/mastery/availability'

/** The current mission, as the ranker needs to see it. */
export interface RankMissionInput {
  benchmarkCode: string
  title: string
  /** From `computeAvailability` — decides resume-vs-start and the phrasing. */
  state: MissionNodeState
  /**
   * Whether a READINESS_CHECK has been passed for this benchmark, i.e. the
   * Mastery Challenge is unlocked. Same signal the mission page derives at
   * `src/app/student/mission/[benchmarkCode]/page.tsx`.
   */
  readinessPassed: boolean
}

export interface RankInputs {
  /** The oldest ASSIGNED remediation, if any. */
  remediation: {
    studentRemediationId: string
    title: string
    /** Benchmark title for context; StudentRemediation has no Benchmark relation. */
    benchmarkTitle: string | null
  } | null
  /** The mission the student can act on now, per `pickCurrentMissionId`. */
  mission: RankMissionInput | null
  /** SpacedReviewState rows due at or before now. */
  drillDueCount: number
  /** `getStrategyProgress().totalOwed`. Zero when the teacher set no requirement. */
  strategyOwed: number
  /** Terminal-status benchmark count — gates offering cumulative review. */
  masteredCount: number
  /** Genuinely last-touched activity, from `getLastActivityForStudent`. */
  lastActivity: {
    label: string
    subLabel: string
    href: string
    icon: NextStepIcon
  } | null
}

/**
 * Compose "Mission 1.5: The Bill of Rights" from a benchmark code and title.
 *
 * Falls back to the bare title when the code is not in the expected
 * `SS.7.CG.x.y` shape, so an unexpected code can never produce a label like
 * "Mission SS.7.CG.1.5: …" or an empty prefix.
 */
export function missionLabel(benchmarkCode: string, title: string): string {
  const match = /^SS\.7\.CG\.(\d+\.\d+)$/.exec(benchmarkCode)
  return match ? `Mission ${match[1]}: ${title}` : title
}

/**
 * How to describe a mission the student can act on.
 *
 * Every branch names the ACTUAL next step rather than saying "continue", which
 * is the difference between a signpost and a shrug. `readinessPassed` is checked
 * before the status because a student can pass the readiness check without the
 * status having moved to READY_FOR_MASTERY yet.
 */
function describeMission(mission: RankMissionInput): {
  kind: 'MISSION_RESUME' | 'MISSION_START'
  subLabel: string
  ctaLabel: string
} {
  if (mission.readinessPassed || mission.state === 'READY_FOR_MASTERY') {
    return {
      kind: 'MISSION_RESUME',
      subLabel: "You've unlocked the Mastery Challenge",
      ctaLabel: 'Take the Mastery Challenge',
    }
  }
  switch (mission.state) {
    case 'REMEDIATION_COMPLETE':
      return {
        kind: 'MISSION_RESUME',
        subLabel: 'Your Second Chance Challenge is ready',
        ctaLabel: 'Take the Second Chance Challenge',
      }
    case 'NEEDS_REMEDIATION':
      // Reached only when the status says remediation is needed but no ASSIGNED
      // row exists (already completed, or content was pulled). Sending them back
      // through the mission is the honest move.
      return {
        kind: 'MISSION_RESUME',
        subLabel: 'Review this mission, then try again',
        ctaLabel: 'Review the Mission',
      }
    case 'INTERVENTION_REQUIRED':
      return {
        kind: 'MISSION_RESUME',
        subLabel: 'Keep going — your teacher is helping with this one',
        ctaLabel: 'Continue Mission',
      }
    case 'IN_PROGRESS':
      return {
        kind: 'MISSION_RESUME',
        subLabel: 'Pick up where you left off',
        ctaLabel: 'Continue Mission',
      }
    default:
      // AVAILABLE, and anything future that reaches here: a fresh mission.
      return {
        kind: 'MISSION_START',
        subLabel: 'Start with the mission plan',
        ctaLabel: 'Start Mission',
      }
  }
}

function remediationStep(r: NonNullable<RankInputs['remediation']>): NextStep {
  return {
    kind: 'REMEDIATION',
    label: r.title,
    subLabel: r.benchmarkTitle
      ? `Training Mission · ${r.benchmarkTitle}`
      : 'Training Mission assigned for you',
    href: `/student/remediation/${r.studentRemediationId}`,
    icon: 'target',
    ctaLabel: 'Start Training Mission',
    estimatedMinutes: ESTIMATED_MINUTES.REMEDIATION,
  }
}

function missionStep(mission: RankMissionInput): NextStep {
  const { kind, subLabel, ctaLabel } = describeMission(mission)
  return {
    kind,
    label: missionLabel(mission.benchmarkCode, mission.title),
    subLabel,
    href: `/student/mission/${mission.benchmarkCode}`,
    icon: kind === 'MISSION_START' ? 'map' : 'sparkle',
    ctaLabel,
    estimatedMinutes:
      kind === 'MISSION_START' ? ESTIMATED_MINUTES.MISSION_START : ESTIMATED_MINUTES.MISSION_RESUME,
  }
}

function drillStep(dueCount: number): NextStep {
  return {
    kind: 'DRILL',
    label: 'Daily Republic Drill',
    subLabel: `${dueCount} ${dueCount === 1 ? 'question' : 'questions'} ready for review`,
    href: '/student/daily-drill',
    icon: 'bolt',
    ctaLabel: 'Start the Drill',
    estimatedMinutes: estimateDrillMinutes(dueCount),
    count: dueCount,
  }
}

function strategyStep(owed: number): NextStep {
  return {
    kind: 'STRATEGY',
    label: 'Strategist Track',
    subLabel: `${owed} strategy ${owed === 1 ? 'use' : 'uses'} to go`,
    href: '/student/strategy',
    icon: 'compass',
    ctaLabel: 'Practice a Strategy',
    estimatedMinutes: ESTIMATED_MINUTES.STRATEGY,
    count: owed,
  }
}

function republicChallengeStep(): NextStep {
  return {
    kind: 'REPUBLIC_CHALLENGE',
    label: 'Republic Challenge',
    subLabel: 'Mixed review across the missions you have mastered',
    href: '/student/republic-challenge',
    icon: 'shield',
    ctaLabel: 'Start a Review',
    estimatedMinutes: ESTIMATED_MINUTES.REPUBLIC_CHALLENGE,
  }
}

function allCaughtUpStep(): NextStep {
  return {
    kind: 'ALL_CAUGHT_UP',
    label: "You're all caught up",
    subLabel: 'Nothing is due right now — check back after your next lesson',
    href: '/student/map',
    icon: 'check',
    ctaLabel: 'See the Mission Map',
    estimatedMinutes: null,
  }
}

/**
 * Rank everything the student could do, best first.
 *
 * Returns at least one step, always: an empty ranking collapses to
 * ALL_CAUGHT_UP rather than to nothing, so no caller has to handle a null.
 */
export function rankNextSteps(inputs: RankInputs): NextStep[] {
  const steps: NextStep[] = []

  if (inputs.remediation) steps.push(remediationStep(inputs.remediation))

  const mission = inputs.mission ? missionStep(inputs.mission) : null

  // Resume outranks the drill; a fresh mission does not. Starting a 20-minute
  // mission ahead of a 3-minute review that is already decaying would be the
  // wrong nudge, but interrupting work in flight to do the drill is worse.
  if (mission?.kind === 'MISSION_RESUME') steps.push(mission)
  if (inputs.drillDueCount > 0) steps.push(drillStep(inputs.drillDueCount))
  if (mission?.kind === 'MISSION_START') steps.push(mission)

  if (inputs.strategyOwed > 0) steps.push(strategyStep(inputs.strategyOwed))
  if (inputs.masteredCount > 0) steps.push(republicChallengeStep())

  // The last-touched activity, but only when nothing above already covers it.
  //
  // This is what preserves the dashboard's old "pick up where you left off"
  // card after removing it: the ranker models missions, drills, remediation and
  // strategy, but NOT the parallel tracks (Source Decoder levels, a specific
  // Republic Challenge mode), and those are exactly what that card could
  // surface. Deduping on href keeps it from restating the primary step.
  if (inputs.lastActivity && !steps.some((s) => s.href === inputs.lastActivity!.href)) {
    steps.push({
      kind: 'LAST_ACTIVITY',
      label: inputs.lastActivity.label,
      subLabel: inputs.lastActivity.subLabel,
      href: inputs.lastActivity.href,
      icon: inputs.lastActivity.icon,
      ctaLabel: 'Go back to this',
      estimatedMinutes: null,
    })
  }

  return steps.length > 0 ? steps : [allCaughtUpStep()]
}

/** Split the ranking into the one thing to do now and the shortlist after it. */
export function buildStudentPlan(inputs: RankInputs): StudentPlan {
  const steps = rankNextSteps(inputs)
  return { primary: steps[0], then: steps.slice(1, 1 + MAX_THEN_STEPS) }
}
