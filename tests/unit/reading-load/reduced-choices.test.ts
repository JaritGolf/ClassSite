import {
  reduceChoices,
  isReducedChoicesEligibleType,
  REDUCED_CHOICE_COUNT,
  REDUCED_CHOICES_ELIGIBLE_TYPES,
} from '@/lib/reading-load/reduced-choices'
import { SECURE_ASSESSMENT_TYPES } from '@/lib/assessment/wire'

const opts = (...ids: string[]) => ids.map((id) => ({ id, text: `opt ${id}` }))

describe('isReducedChoicesEligibleType', () => {
  it('allows the practice-style types', () => {
    expect(isReducedChoicesEligibleType('PRACTICE')).toBe(true)
    expect(isReducedChoicesEligibleType('PRE_CHECK')).toBe(true)
    expect(isReducedChoicesEligibleType('VOCAB_CHECK')).toBe(true)
    expect(isReducedChoicesEligibleType('UNIT_REVIEW')).toBe(true)
  })

  // The invariant that protects what the 80% mastery threshold means.
  it('excludes EVERY secure assessment type', () => {
    for (const type of SECURE_ASSESSMENT_TYPES) {
      expect(isReducedChoicesEligibleType(type)).toBe(false)
    }
  })

  it('names the mastery-deciding types explicitly, so a rename cannot slip through', () => {
    expect(isReducedChoicesEligibleType('MASTERY_CHALLENGE')).toBe(false)
    expect(isReducedChoicesEligibleType('READINESS_CHECK')).toBe(false)
    expect(isReducedChoicesEligibleType('REPUBLIC_CHALLENGE')).toBe(false)
    expect(isReducedChoicesEligibleType('FINAL_TRIAL')).toBe(false)
    expect(isReducedChoicesEligibleType('REASSESSMENT')).toBe(false)
    expect(isReducedChoicesEligibleType('DIAGNOSTIC')).toBe(false)
  })

  // Allowlist, not denylist: an unknown/new type must fail closed.
  it('rejects an unknown type', () => {
    expect(isReducedChoicesEligibleType('SOME_FUTURE_TYPE')).toBe(false)
    expect(REDUCED_CHOICES_ELIGIBLE_TYPES.size).toBe(4)
  })
})

describe('reduceChoices', () => {
  const correct = new Set(['b'])

  it('reduces four options to three', () => {
    const out = reduceChoices(opts('a', 'b', 'c', 'd'), correct, 'seed-1')
    expect(out).toHaveLength(REDUCED_CHOICE_COUNT)
  })

  // The one thing that must never break.
  it('ALWAYS keeps the correct option', () => {
    for (let i = 0; i < 50; i++) {
      const out = reduceChoices(opts('a', 'b', 'c', 'd'), correct, `seed-${i}`)
      expect(out.map((o) => o.id)).toContain('b')
    }
  })

  it('is deterministic for the same seed and varies across seeds', () => {
    const a = reduceChoices(opts('a', 'b', 'c', 'd'), correct, 'same')
    const b = reduceChoices(opts('a', 'b', 'c', 'd'), correct, 'same')
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))

    const seen = new Set(
      Array.from({ length: 30 }, (_, i) =>
        reduceChoices(opts('a', 'b', 'c', 'd'), correct, `s${i}`)
          .map((o) => o.id)
          .join(',')
      )
    )
    expect(seen.size).toBeGreaterThan(1)
  })

  it('preserves the incoming order (the caller shuffles)', () => {
    const out = reduceChoices(opts('a', 'b', 'c', 'd'), correct, 'seed-1')
    const ids = out.map((o) => o.id)
    expect([...ids].sort()).toEqual(ids.slice().sort())
    // order is a subsequence of the input
    const input = ['a', 'b', 'c', 'd']
    let idx = -1
    for (const id of ids) {
      const next = input.indexOf(id)
      expect(next).toBeGreaterThan(idx)
      idx = next
    }
  })

  it('returns the input untouched when already at or below the target', () => {
    const three = opts('a', 'b', 'c')
    expect(reduceChoices(three, correct, 's')).toBe(three)
    const two = opts('a', 'b')
    expect(reduceChoices(two, correct, 's')).toBe(two)
  })

  // Fail open: a four-choice item works; an item with no right answer does not.
  it('returns the input untouched when no correct option is identifiable', () => {
    const four = opts('a', 'b', 'c', 'd')
    expect(reduceChoices(four, new Set(['zzz']), 's')).toBe(four)
    expect(reduceChoices(four, new Set(), 's')).toBe(four)
  })

  it('returns the input untouched when correct options already fill the target', () => {
    const four = opts('a', 'b', 'c', 'd')
    expect(reduceChoices(four, new Set(['a', 'b', 'c']), 's')).toBe(four)
  })

  it('keeps every correct option on a multi-select item', () => {
    const out = reduceChoices(opts('a', 'b', 'c', 'd', 'e'), new Set(['a', 'e']), 's')
    expect(out).toHaveLength(REDUCED_CHOICE_COUNT)
    expect(out.map((o) => o.id)).toEqual(expect.arrayContaining(['a', 'e']))
  })

  it('honours a custom target count', () => {
    expect(reduceChoices(opts('a', 'b', 'c', 'd', 'e'), correct, 's', 2)).toHaveLength(2)
  })
})
