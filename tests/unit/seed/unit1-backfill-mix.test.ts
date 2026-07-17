/**
 * Unit 1 backfill shape (pure, no DB).
 *
 * The backfill adds 15 questions per benchmark designed to COMPLEMENT the original
 * 15 so the combined 30 hit §13.2 / §7.4. This test pins the backfill's own
 * distribution (reading 4/8/3, complexity 3/8/4, category 1/1/4/3/2/2/2) and basic
 * option integrity. The combined-30 targets are verified at the DB level by the
 * audit15 driver.
 */

import {
  UNIT1_BACKFILL_BY_BENCHMARK,
  UNIT1_COMPLETE_BENCHMARKS,
} from '../../../seed/questions/unit1_backfill'
import type { QuestionSeedDef, QuestionCategory } from '../../../seed/questions/_seeder'

const CATEGORY_TARGET: Record<QuestionCategory, number> = {
  vocabulary: 1,
  basic_concept: 1,
  scenario: 4,
  source_analysis: 3,
  chart_visual: 2,
  misconception_check: 2,
  eoc_mixed: 2,
}
const READING_TARGET = { 1: 4, 2: 8, 3: 3 }
const COMPLEXITY_TARGET = { LOW: 3, MODERATE: 8, HIGH: 4 }

function countBy<T extends string | number>(defs: QuestionSeedDef[], key: (q: QuestionSeedDef) => T) {
  const m = new Map<T, number>()
  for (const q of defs) m.set(key(q), (m.get(key(q)) ?? 0) + 1)
  return m
}

describe('Unit 1 backfill — complementary distribution', () => {
  // ADR 0017: after the realignment, four benchmarks carry a whole renamed
  // 15-question backfill set (1.3, 1.4, 1.5, 1.6). The old-1.5 set moved to
  // 1.7 and the old-1.6 set split item-level across 1.7/1.10 — asserted below.
  it('lists the 4 carried complete benchmarks', () => {
    expect(UNIT1_COMPLETE_BENCHMARKS).toEqual([
      'SS.7.CG.1.3',
      'SS.7.CG.1.4',
      'SS.7.CG.1.5',
      'SS.7.CG.1.6',
    ])
  })

  it('the realigned split lands the expected backfill counts on 1.7 and 1.10', () => {
    // 1.7 = old-1.5's 15 + 10 convention items from the old-1.6 split
    expect(UNIT1_BACKFILL_BY_BENCHMARK['SS.7.CG.1.7']).toHaveLength(25)
    // 1.10 = 5 ratification items from the old-1.6 split
    expect(UNIT1_BACKFILL_BY_BENCHMARK['SS.7.CG.1.10']).toHaveLength(5)
    // nothing is lost: 6 original sets × 15
    expect(Object.values(UNIT1_BACKFILL_BY_BENCHMARK).flat()).toHaveLength(90)
  })

  for (const code of UNIT1_COMPLETE_BENCHMARKS) {
    describe(code, () => {
      const defs = UNIT1_BACKFILL_BY_BENCHMARK[code]

      it('adds exactly 15 questions', () => {
        expect(defs).toBeDefined()
        expect(defs).toHaveLength(15)
      })

      it('matches the backfill category mix', () => {
        const byCat = countBy(defs, (q) => q.category)
        for (const [cat, target] of Object.entries(CATEGORY_TARGET)) {
          expect(byCat.get(cat as QuestionCategory) ?? 0).toBe(target)
        }
      })

      it('matches the backfill reading-load mix (4/8/3)', () => {
        const r = countBy(defs, (q) => q.readingLoadLevel)
        expect(r.get(1) ?? 0).toBe(READING_TARGET[1])
        expect(r.get(2) ?? 0).toBe(READING_TARGET[2])
        expect(r.get(3) ?? 0).toBe(READING_TARGET[3])
      })

      it('matches the backfill complexity mix (3/8/4)', () => {
        const c = countBy(defs, (q) => q.cognitiveComplexity)
        expect(c.get('LOW') ?? 0).toBe(COMPLEXITY_TARGET.LOW)
        expect(c.get('MODERATE') ?? 0).toBe(COMPLEXITY_TARGET.MODERATE)
        expect(c.get('HIGH') ?? 0).toBe(COMPLEXITY_TARGET.HIGH)
      })

      it('every question has 4 options with exactly 1 correct', () => {
        for (const q of defs) {
          expect(q.options).toHaveLength(4)
          expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1)
        }
      })
    })
  }

  it('all backfill externalKeys are unique and in the 016–030 range', () => {
    const all = Object.values(UNIT1_BACKFILL_BY_BENCHMARK).flat()
    const keys = all.map((q) => q.externalKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k).toMatch(/^q-SS7CG1[1-6]-0(1[6-9]|2\d|30)$/)
  })
})
