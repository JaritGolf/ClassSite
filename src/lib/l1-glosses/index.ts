/**
 * L1 (first-language) glosses — public API (Phase 16, §36.17).
 */

export { isL1GlossesEnabled } from './feature'
export { resolveL1Language, SUPPORTED_L1_LANGUAGES } from './language'
export type { L1Language } from './language'
export { getGlossaryTermsForBenchmark } from './glossary-terms'
