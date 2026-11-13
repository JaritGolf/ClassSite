/**
 * Adaptive difficulty (spec §18). The state machine is pure (./transitions) and
 * the session state lives on the student's device; ./stateless serves the next
 * practice item for a state the device sends.
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
