/**
 * Which badges the engine can ever award.
 *
 * The student badges page renders every seeded Badge row. Several carry criteria
 * with no data source behind them (per-item reading counters that no table
 * records, tag-scoped variants with no tagging), so `criteriaMet` returns false
 * for them unconditionally. Rendering those is worse than rendering nothing: a
 * locked medal reads as a goal, and that goal is a lie — no amount of work earns
 * it. It also drags down the "N of M earned" count for no reason.
 *
 * `isCriteriaWinnable` is the filter, and it lives beside `criteriaMet` so the
 * two cannot drift. These fixtures pin that pairing.
 */

import { isCriteriaWinnable } from '@/lib/badges'

describe('isCriteriaWinnable — unsupported events', () => {
  it.each([
    'source_analysis_complete',
    'claim_identified',
    'source_decoder_purpose',
    'source_decoder_compare',
  ])('rejects %s (no per-item tracking table exists)', (event) => {
    expect(isCriteriaWinnable({ event, count: 5 })).toBe(false)
  })
})

describe('isCriteriaWinnable — tag-scoped variants', () => {
  it('rejects benchmark_mastered when scoped to tags nothing writes', () => {
    expect(isCriteriaWinnable({ event: 'benchmark_mastered', count: 3, tags: ['origins'] })).toBe(
      false
    )
  })

  it('accepts benchmark_mastered with no tags — that path has real data', () => {
    expect(isCriteriaWinnable({ event: 'benchmark_mastered', count: 3 })).toBe(true)
  })

  it('accepts benchmark_mastered with an empty tag array', () => {
    // An empty array is not a scope; criteriaMet only short-circuits on length > 0.
    expect(isCriteriaWinnable({ event: 'benchmark_mastered', count: 3, tags: [] })).toBe(true)
  })

  it('rejects mastery_score_above when tag-scoped', () => {
    expect(isCriteriaWinnable({ event: 'mastery_score_above', threshold: 0.9, tag: 'x' })).toBe(
      false
    )
  })

  it('accepts mastery_score_above with no tag', () => {
    expect(isCriteriaWinnable({ event: 'mastery_score_above', threshold: 0.9 })).toBe(true)
  })
})

describe('isCriteriaWinnable — supported events', () => {
  it.each([
    ['unit_complete', { event: 'unit_complete', unitCode: 'unit-1' }],
    ['reporting_category_mastered', { event: 'reporting_category_mastered', category: 'Origins' }],
    ['streak_days', { event: 'streak_days', count: 7 }],
    ['drill_complete', { event: 'drill_complete', count: 1 }],
    ['source_decoder_level', { event: 'source_decoder_level', level: 3 }],
    ['strategy_mission', { event: 'strategy_mission', missionCode: 'two-pass' }],
    ['strategy_track_complete', { event: 'strategy_track_complete', count: 7 }],
  ])('accepts %s', (_label, criteria) => {
    expect(isCriteriaWinnable(criteria)).toBe(true)
  })

  it('accepts the retargeted READING badges now that they point at real levels', () => {
    // Purpose Finder and Source Showdown Champion were moved off the dead
    // per-item counters onto Source Decoder levels 3 and 4, which ARE tracked.
    expect(isCriteriaWinnable({ event: 'source_decoder_level', level: 3 })).toBe(true)
    expect(isCriteriaWinnable({ event: 'source_decoder_level', level: 4 })).toBe(true)
  })
})

describe('isCriteriaWinnable — malformed input', () => {
  it.each([null, undefined, {}, { count: 5 }, 'not-an-object', 42])(
    'rejects %p rather than throwing',
    (bad) => {
      // Criteria come out of a Json column. A malformed row must hide the badge,
      // never crash the badges page.
      expect(() => isCriteriaWinnable(bad)).not.toThrow()
      expect(isCriteriaWinnable(bad)).toBe(false)
    }
  )
})
