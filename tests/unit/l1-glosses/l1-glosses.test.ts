/**
 * L1 glosses — pure logic (no DB).
 * resolveL1Language priority + feature flag; buildGlossaryAnnotations carries L1.
 */

import { resolveL1Language } from '@/lib/l1-glosses'
import { buildGlossaryAnnotations, type GlossaryTerm } from '@/lib/reading-load'

describe('resolveL1Language', () => {
  // FEATURE_L1_GLOSSES is opt-in and process-global; enable it before each test
  // (the flag-off test sets it 'false' explicitly for itself).
  beforeEach(() => {
    process.env.FEATURE_L1_GLOSSES = 'true'
  })
  afterAll(() => {
    delete process.env.FEATURE_L1_GLOSSES
  })

  it('uses the student profile l1_language when supported', () => {
    expect(resolveL1Language('es', [])).toBe('es')
    expect(resolveL1Language('ht', [])).toBe('ht')
  })

  it('falls back to an L1 accommodation grant when no profile language', () => {
    expect(resolveL1Language(null, ['ACC-L1-SPANISH'])).toBe('es')
    expect(resolveL1Language(null, ['ACC-L1-CREOLE'])).toBe('ht')
  })

  it('prefers the profile field over the accommodation', () => {
    expect(resolveL1Language('es', ['ACC-L1-CREOLE'])).toBe('es')
  })

  it('returns null for an unsupported/absent language and no accommodation', () => {
    expect(resolveL1Language(null, [])).toBeNull()
    expect(resolveL1Language('fr', [])).toBeNull()
    expect(resolveL1Language(undefined, ['ACC-EXT-TIME'])).toBeNull()
  })

  it('returns null when the feature flag is disabled', () => {
    process.env.FEATURE_L1_GLOSSES = 'false'
    expect(resolveL1Language('es', ['ACC-L1-SPANISH'])).toBeNull()
  })
})

describe('buildGlossaryAnnotations — L1 passthrough', () => {
  const terms: GlossaryTerm[] = [
    { term: 'republic', definition: 'A representative government.', tier: 'TIER_3', l1Definition: 'Una república.', l1Language: 'es' },
    { term: 'analyze', definition: 'To examine in detail.', tier: 'TIER_2' },
  ]

  it('carries l1Definition + l1Language onto matched annotations', () => {
    const anns = buildGlossaryAnnotations('A republic lets citizens analyze government.', terms, 2)
    const rep = anns.find((a) => a.matchText.toLowerCase() === 'republic')
    expect(rep?.l1Definition).toBe('Una república.')
    expect(rep?.l1Language).toBe('es')
    const ana = anns.find((a) => a.matchText.toLowerCase() === 'analyze')
    expect(ana?.l1Definition).toBeUndefined()
  })

  it('returns nothing at reading-load level 3 (no scaffolding)', () => {
    expect(buildGlossaryAnnotations('A republic.', terms, 3)).toEqual([])
  })
})
