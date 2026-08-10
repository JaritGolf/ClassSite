/**
 * Display accommodation resolution (ACC-CHUNK, ACC-T2-VOCAB).
 *
 * Pure mapping, but worth pinning: these two codes sat in the catalog for months
 * with nothing reading them, and the failure mode of a regression here is silent
 * — a granted accommodation simply stops applying, with no error anywhere.
 */

import {
  resolveDisplayPrefs,
  NO_DISPLAY_PREFS,
  ACC_CHUNK_CODE,
  ACC_T2_VOCAB_CODE,
} from '@/lib/accommodations'

describe('resolveDisplayPrefs', () => {
  it('turns everything off for a student with no accommodations', () => {
    expect(resolveDisplayPrefs([])).toEqual(NO_DISPLAY_PREFS)
  })

  it('turns chunking on by default for ACC-CHUNK', () => {
    expect(resolveDisplayPrefs([ACC_CHUNK_CODE])).toEqual({
      chunkByDefault: true,
      tier2GlossesAlways: false,
    })
  })

  it('keeps tier-2 glosses for ACC-T2-VOCAB', () => {
    expect(resolveDisplayPrefs([ACC_T2_VOCAB_CODE])).toEqual({
      chunkByDefault: false,
      tier2GlossesAlways: true,
    })
  })

  it('applies both when both are granted', () => {
    expect(resolveDisplayPrefs([ACC_CHUNK_CODE, ACC_T2_VOCAB_CODE])).toEqual({
      chunkByDefault: true,
      tier2GlossesAlways: true,
    })
  })

  it('ignores unrelated codes', () => {
    expect(
      resolveDisplayPrefs(['ACC-HIGH-CONTRAST', 'ACC-BREAKS', 'ELL'])
    ).toEqual(NO_DISPLAY_PREFS)
  })

  it('accepts a Set as well as an array', () => {
    expect(resolveDisplayPrefs(new Set([ACC_CHUNK_CODE]))).toEqual({
      chunkByDefault: true,
      tier2GlossesAlways: false,
    })
  })
})
