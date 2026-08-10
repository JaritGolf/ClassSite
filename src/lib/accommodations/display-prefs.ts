/**
 * Display accommodations — pure resolution from a student's active codes.
 *
 * These are the accommodations that change how a passage is *presented* rather
 * than what is served, so unlike reading level or reduced choices they cannot be
 * applied server-side in a query. The student layout resolves them once and
 * passes them to a client provider; `StimulusDisplay` reads them from there.
 *
 * Kept pure and separate from the DB so the whole mapping is unit-testable and
 * so the teacher walkthrough — which mounts student components outside the
 * student layout — can fall back to "no accommodations" without a database call.
 */

export const ACC_CHUNK_CODE = 'ACC-CHUNK'
export const ACC_T2_VOCAB_CODE = 'ACC-T2-VOCAB'

export interface DisplayPrefs {
  /**
   * Sentence chunking starts ON.
   *
   * A default rather than a lock, deliberately: unlike high contrast and large
   * text — which are changed in a settings page — chunking has a toggle sitting
   * directly on the passage. A button that visibly refused to work would be a
   * worse experience than the accommodation setting the starting position. A
   * student who turns it off has that remembered.
   */
  chunkByDefault: boolean
  /**
   * Keep tier-2 (academic vocabulary) glossary popovers even on level-3
   * original-source passages, which otherwise carry no glossary scaffolding at
   * all (spec 16.2). Tier-3 civics terms stay hidden at level 3 either way —
   * this accommodation is scoped to academic vocabulary, matching its name.
   */
  tier2GlossesAlways: boolean
}

export const NO_DISPLAY_PREFS: DisplayPrefs = {
  chunkByDefault: false,
  tier2GlossesAlways: false,
}

/** Resolve display accommodations from a student's ACTIVE accommodation codes. */
export function resolveDisplayPrefs(activeCodes: Iterable<string>): DisplayPrefs {
  const codes = new Set(activeCodes)
  return {
    chunkByDefault: codes.has(ACC_CHUNK_CODE),
    tier2GlossesAlways: codes.has(ACC_T2_VOCAB_CODE),
  }
}
