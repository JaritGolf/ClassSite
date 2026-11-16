/**
 * Next-step ranking — pure. The inputs are gathered on the student's device
 * from device-local progress (see src/lib/local-progress/plan.ts).
 */

export { rankNextSteps, buildStudentPlan, missionLabel } from './rank'
export type { RankInputs, RankMissionInput } from './rank'
export { ESTIMATED_MINUTES, MAX_THEN_STEPS, estimateDrillMinutes } from './types'
export type { NextStep, NextStepKind, NextStepIcon, StudentPlan } from './types'
