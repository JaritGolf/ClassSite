/**
 * Resolve the L1 (first-language) gloss language for a student.
 *
 * Priority (spec §36.17 / Appendix G):
 *   1. The student's `l1_language` profile field, if set to a supported language.
 *   2. Otherwise an L1 accommodation grant (ACC-L1-SPANISH → 'es', ACC-L1-CREOLE → 'ht').
 * Returns null when the feature is disabled or nothing resolves.
 */

import { isL1GlossesEnabled } from './feature'

/** Supported L1 gloss languages. Spanish first, Haitian Creole second. */
export const SUPPORTED_L1_LANGUAGES = ['es', 'ht'] as const
export type L1Language = (typeof SUPPORTED_L1_LANGUAGES)[number]

const ACCOMMODATION_LANGUAGE: Record<string, L1Language> = {
  'ACC-L1-SPANISH': 'es',
  'ACC-L1-CREOLE': 'ht',
}

function isSupported(code: string): code is L1Language {
  return (SUPPORTED_L1_LANGUAGES as readonly string[]).includes(code)
}

export function resolveL1Language(
  studentL1Language: string | null | undefined,
  accommodationCodes: string[] = []
): L1Language | null {
  if (!isL1GlossesEnabled()) return null

  if (studentL1Language && isSupported(studentL1Language)) {
    return studentL1Language
  }

  for (const code of accommodationCodes) {
    const lang = ACCOMMODATION_LANGUAGE[code]
    if (lang) return lang
  }

  return null
}
