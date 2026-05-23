/**
 * Republic Challenge — Public API (Phase 11)
 *
 * Domain module backing the seven cumulative review modes described in spec
 * §30. Every public function is exported from here; route handlers should
 * not import the internal files directly.
 */

export {
  getStaminaLengthForDate,
  resolveSessionLength,
  FINAL_TRIAL_DEFAULT_LENGTH,
} from './stamina'
export type { StaminaResult, ClassConfig, Mode } from './stamina'

export { allocateByBlueprint, isWithinTolerance } from './blueprint'
export type { BlueprintAllocation } from './blueprint'

export {
  pickQuickReview,
  pickCategoryChallenge,
  pickMixedMission,
  pickMistakeReplay,
  pickSourceSprint,
  pickEnduranceTrial,
  pickFinalRepublicTrial,
} from './picker'

export {
  createRepublicChallengeSession,
  RepublicChallengeError,
  RC_AUDIT_ACTIONS,
} from './session'
export type { CreateSessionInput, CreateSessionResult } from './session'
