/**
 * Accommodations Domain Module — Public Exports
 *
 * Import from this module rather than from individual files.
 *
 * Scope note: this module owns the *catalog-level* question "what does granting
 * this code do?", plus the display accommodations that must be resolved for the
 * client. The reading-load and reduced-choices behaviours themselves live in
 * `src/lib/reading-load/`, next to the serving code that applies them.
 */

export {
  ACCOMMODATION_ENFORCEMENT,
  REGISTERED_ACCOMMODATION_CODES,
  getAccommodationEnforcement,
  getUnimplementedAccommodationCodes,
} from './registry'
export type {
  AccommodationEnforcement,
  AccommodationEnforcementStatus,
} from './registry'

export {
  resolveDisplayPrefs,
  NO_DISPLAY_PREFS,
  ACC_CHUNK_CODE,
  ACC_T2_VOCAB_CODE,
} from './display-prefs'
export type { DisplayPrefs } from './display-prefs'
