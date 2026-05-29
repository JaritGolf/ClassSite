/**
 * Unit Tests: Question tag validation + blueprint coverage (spec §11, §13.2/3).
 */

import { validateQuestionTags, isFullyTagged, type ValidatableQuestion } from '@/lib/eoc-alignment/validate-tags'
import { computeBlueprintCoverage } from '@/lib/eoc-alignment/blueprint-coverage'

function fullyTagged(): ValidatableQuestion {
  return {
    benchmarkId: 'b1',
    reportingCategoryId: 'rc1',
    cognitiveComplexity: 'MODERATE',
    stimulusType: null,
    stimulusId: null,
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'reteach-concept',
    misconceptionId: null,
    sourceTier: 'B',
    approvalStatus: 'APPROVED',
  }
}

describe('validateQuestionTags', () => {
  it('returns [] for a fully tagged question', () => {
    expect(validateQuestionTags(fullyTagged())).toEqual([])
    expect(isFullyTagged(fullyTagged())).toBe(true)
  })

  it('flags each missing required string tag', () => {
    const q = { ...fullyTagged(), skillTag: '', remediationTag: null as unknown as string }
    const missing = validateQuestionTags(q)
    expect(missing).toContain('skillTag')
    expect(missing).toContain('remediationTag')
  })

  it('flags an out-of-range reading-load level', () => {
    expect(validateQuestionTags({ ...fullyTagged(), readingLoadLevel: 0 })).toContain('readingLoadLevel')
    expect(validateQuestionTags({ ...fullyTagged(), readingLoadLevel: 4 })).toContain('readingLoadLevel')
  })

  it('requires stimulusType when a stimulus is referenced', () => {
    const q = { ...fullyTagged(), stimulusId: 'stim1', stimulusType: null }
    expect(validateQuestionTags(q)).toContain('stimulusType')
    const ok = { ...fullyTagged(), stimulusId: 'stim1', stimulusType: 'EXCERPT' }
    expect(validateQuestionTags(ok)).toEqual([])
  })
})

describe('computeBlueprintCoverage', () => {
  it('computes distribution and within-tolerance flags vs spec targets', () => {
    // 10 questions: reading-load 3×L1, 5×L2, 2×L3 → exactly on target (30/50/20)
    const questions = [
      ...Array(3).fill({ readingLoadLevel: 1, cognitiveComplexity: 'LOW' }),
      ...Array(5).fill({ readingLoadLevel: 2, cognitiveComplexity: 'MODERATE' }),
      ...Array(2).fill({ readingLoadLevel: 3, cognitiveComplexity: 'HIGH' }),
    ]
    const cov = computeBlueprintCoverage('b1', questions)
    expect(cov.total).toBe(10)
    const l2 = cov.readingLoad.find((r) => r.key === '2')!
    expect(l2.actual).toBe(0.5)
    expect(l2.withinTolerance).toBe(true)
  })

  it('flags a bucket outside tolerance', () => {
    const questions = Array(10).fill({ readingLoadLevel: 1, cognitiveComplexity: 'LOW' })
    const cov = computeBlueprintCoverage('b1', questions)
    const l1 = cov.readingLoad.find((r) => r.key === '1')!
    expect(l1.actual).toBe(1)
    expect(l1.withinTolerance).toBe(false) // target 0.3, actual 1.0
  })
})
