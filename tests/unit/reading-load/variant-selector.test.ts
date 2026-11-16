/**
 * Unit Tests — Reading-Load Variant Selector + Pure Helpers
 *
 * No DB, no Prisma. Tests pure functions only.
 * Covers Audit 7 items 2, 4, and 7 through pure logic verification.
 */

import {
  selectVariantContent,
  buildGlossaryAnnotations,
  filterQuestionsForMastery,
  type StimulusLike,
  type GlossaryTerm,
} from '@/lib/reading-load'

// ── Fixtures ───────────────────────────────────────────────────────────────

const BASE_STIMULUS: StimulusLike = {
  content: 'Raw founding document passage. No scaffolding.',
  readingLoadLevel: 3,
  variants: [
    { readingLoadLevel: 1, content: 'Simple paraphrase.', approvalStatus: 'APPROVED' },
    { readingLoadLevel: 2, content: 'Chunked excerpt.', approvalStatus: 'APPROVED' },
  ],
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  { term: 'natural rights', definition: 'Rights every person is born with.', tier: 'TIER_3' },
  { term: 'consent', definition: 'Agreement or permission.', tier: 'TIER_2' },
]

// ── selectVariantContent ───────────────────────────────────────────────────

describe('selectVariantContent', () => {
  it('returns level-1 variant when requested level = 1', () => {
    const result = selectVariantContent(BASE_STIMULUS, 1)
    expect(result.content).toBe('Simple paraphrase.')
    expect(result.resolvedLevel).toBe(1)
    expect(result.fromVariant).toBe(true)
  })

  it('returns level-2 variant when requested level = 2', () => {
    const result = selectVariantContent(BASE_STIMULUS, 2)
    expect(result.content).toBe('Chunked excerpt.')
    expect(result.resolvedLevel).toBe(2)
    expect(result.fromVariant).toBe(true)
  })

  it('returns base content when requested level = 3 (no level-3 variant)', () => {
    const result = selectVariantContent(BASE_STIMULUS, 3)
    expect(result.content).toBe(BASE_STIMULUS.content)
    expect(result.resolvedLevel).toBe(3)
    expect(result.fromVariant).toBe(false)
  })

  it('falls back to base content when no variant exists at requested level', () => {
    const stimulus: StimulusLike = {
      content: 'Base only.',
      readingLoadLevel: 2,
      variants: [], // no variants
    }
    const result = selectVariantContent(stimulus, 1)
    expect(result.content).toBe('Base only.')
    expect(result.fromVariant).toBe(false)
  })

  it('skips DRAFT variants — returns base content when only DRAFT variant at level', () => {
    const stimulus: StimulusLike = {
      content: 'Base.',
      readingLoadLevel: 3,
      variants: [{ readingLoadLevel: 1, content: 'Draft variant.', approvalStatus: 'DRAFT' }],
    }
    const result = selectVariantContent(stimulus, 1)
    expect(result.content).toBe('Base.')
    expect(result.fromVariant).toBe(false)
  })

  it('skips NEEDS_REVIEW variants', () => {
    const stimulus: StimulusLike = {
      content: 'Base.',
      readingLoadLevel: 3,
      variants: [
        { readingLoadLevel: 2, content: 'Needs review.', approvalStatus: 'NEEDS_REVIEW' },
      ],
    }
    const result = selectVariantContent(stimulus, 2)
    expect(result.fromVariant).toBe(false)
  })

  it('returns base content when variants array is empty', () => {
    const stimulus: StimulusLike = { content: 'Base.', readingLoadLevel: 2, variants: [] }
    const result = selectVariantContent(stimulus, 1)
    expect(result.content).toBe('Base.')
    expect(result.fromVariant).toBe(false)
  })

  it('resolvedLevel reflects actual level served when falling back to base', () => {
    const stimulus: StimulusLike = { content: 'Base.', readingLoadLevel: 2, variants: [] }
    const result = selectVariantContent(stimulus, 1)
    expect(result.resolvedLevel).toBe(2) // base stimulus level, not requested level
  })
})

// ── buildGlossaryAnnotations ───────────────────────────────────────────────

describe('buildGlossaryAnnotations', () => {
  it('finds tier-3 term in content (case-insensitive)', () => {
    const annotations = buildGlossaryAnnotations(
      'The colonists believed in Natural Rights.',
      GLOSSARY_TERMS,
      2
    )
    expect(annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ matchText: 'Natural Rights', tier: 'TIER_3' }),
      ])
    )
  })

  it('finds tier-2 term in content', () => {
    const annotations = buildGlossaryAnnotations(
      'Government requires the consent of the people.',
      GLOSSARY_TERMS,
      1
    )
    expect(annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ matchText: 'consent', tier: 'TIER_2' }),
      ])
    )
  })

  it('returns empty array when content has no matching terms', () => {
    const annotations = buildGlossaryAnnotations(
      'Some unrelated text with no glossary words.',
      GLOSSARY_TERMS,
      2
    )
    expect(annotations).toHaveLength(0)
  })

  it('returns empty array for level 3 content (no scaffolding)', () => {
    const annotations = buildGlossaryAnnotations(
      'The colonists believed in natural rights.',
      GLOSSARY_TERMS,
      3 // level 3 = no glossary
    )
    expect(annotations).toHaveLength(0)
  })

  it('returns empty array when glossaryTerms is empty', () => {
    const annotations = buildGlossaryAnnotations('Some text.', [], 1)
    expect(annotations).toHaveLength(0)
  })

  it('includes correct definition in annotation', () => {
    const annotations = buildGlossaryAnnotations(
      'People have natural rights.',
      GLOSSARY_TERMS,
      1
    )
    const match = annotations.find((a) => a.tier === 'TIER_3')
    expect(match?.definition).toBe('Rights every person is born with.')
  })
})

// ── filterQuestionsForMastery ─────────────────────────────────────────────

describe('filterQuestionsForMastery', () => {
  const questions = [
    { id: 'q1', readingLoadLevel: 1, prompt: 'Level 1 question' },
    { id: 'q2', readingLoadLevel: 2, prompt: 'Level 2 question' },
    { id: 'q3', readingLoadLevel: 3, prompt: 'Level 3 question' },
  ]

  it('filters out level-1 questions', () => {
    const result = filterQuestionsForMastery(questions)
    expect(result.find((q) => q.id === 'q1')).toBeUndefined()
  })

  it('keeps level-2 questions', () => {
    const result = filterQuestionsForMastery(questions)
    expect(result.find((q) => q.id === 'q2')).toBeDefined()
  })

  it('keeps level-3 questions', () => {
    const result = filterQuestionsForMastery(questions)
    expect(result.find((q) => q.id === 'q3')).toBeDefined()
  })

  it('returns empty array when all questions are level 1', () => {
    const level1Only = [
      { id: 'a', readingLoadLevel: 1 },
      { id: 'b', readingLoadLevel: 1 },
    ]
    expect(filterQuestionsForMastery(level1Only)).toHaveLength(0)
  })

  it('preserves all fields on kept questions', () => {
    const result = filterQuestionsForMastery(questions)
    const q2 = result.find((q) => q.id === 'q2')
    expect(q2).toEqual({ id: 'q2', readingLoadLevel: 2, prompt: 'Level 2 question' })
  })
})
