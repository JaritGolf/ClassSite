/**
 * Adaptive Difficulty Engine — Public API
 *
 * All consumers should import from here, not from internal module files.
 */

export {
  complexityUp,
  complexityDown,
  applyCorrectAnswer,
  applyIncorrectAnswer,
  acknowledgeWorkedExample,
  applyNearTransferCorrect,
  applyNearTransferIncorrect,
  initialState,
  CONSECUTIVE_THRESHOLD,
} from './transitions'
export type { AdaptiveState, NearTransferResult } from './transitions'

export { initSession, getSessionState, saveSessionState } from './session'

export { getNextItem } from './next-item'
export type { NextItemPayload, WorkedExamplePayload, SafeQuestion } from './next-item'

export { submitPracticeAnswer, AdaptiveError } from './answer'
export type { AnswerResult, NextAction } from './answer'
