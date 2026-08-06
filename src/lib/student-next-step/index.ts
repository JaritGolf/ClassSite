/**
 * Student Next Step — Public API
 *
 * "What should this student do next?" answered in one place, for every surface
 * that used to answer it differently (or not at all).
 *
 * Server components and routes use `getStudentPlan`. Client components import
 * only the types — they receive a `StudentPlan` as props or from
 * `GET /api/student/next-step`.
 *
 * Import from here, not from the internal files.
 */

export { getStudentPlan, loadRankInputs } from './load'

export { rankNextSteps, buildStudentPlan, missionLabel } from './rank'
export type { RankInputs, RankMissionInput } from './rank'

export {
  ESTIMATED_MINUTES,
  MAX_THEN_STEPS,
  estimateDrillMinutes,
} from './types'
export type { NextStep, NextStepKind, NextStepIcon, StudentPlan } from './types'
