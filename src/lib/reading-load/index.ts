/**
 * Reading-Load Domain Module — Public Exports
 *
 * Import from this module rather than from individual files.
 */

// ── Pure functions ─────────────────────────────────────────────────────────
export {
  selectVariantContent,
  buildGlossaryAnnotations,
  filterQuestionsForMastery,
} from './variant-selector'
export type {
  VariantLike,
  StimulusLike,
  GlossaryTerm,
  GlossaryAnnotation,
  VariantSelection,
  QuestionWithLevel,
} from './variant-selector'

export {
  fetchStimulusForQuestion,
} from './question-filter'
export type { StimulusAttachment } from './question-filter'

// ── Source Decoder ─────────────────────────────────────────────────────────
export {
  getSourceDecoderMissions,
  getSourceDecoderMission,
} from './source-decoder'
export type {
  SourceDecoderMission,
  SourceDecoderActivityType,
} from './source-decoder'
