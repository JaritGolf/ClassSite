/**
 * Unit 2 question-bank shape (pure, no DB) — Audit §36.16 / §13.2 / §7.4.
 *
 * Validates the §13.2 category mix on the source-of-truth definitions (category is
 * an authoring construct, not a DB column), plus reading-load and cognitive-
 * complexity distributions and basic option integrity. Every benchmark listed in
 * UNIT2_COMPLETE_BENCHMARKS must satisfy all targets.
 */

import {
  UNIT2_QUESTIONS_BY_BENCHMARK,
  UNIT2_COMPLETE_BENCHMARKS,
} from '../../../seed/questions/unit2'
import type { QuestionSeedDef, QuestionCategory } from '../../../seed/questions/_seeder'

const CATEGORY_TARGET: Record<QuestionCategory, number> = {
  vocabulary: 4,
  basic_concept: 4,
  scenario: 8,
  source_analysis: 4,
  chart_visual: 3,
  misconception_check: 3,
  eoc_mixed: 4,
}
const READING_TARGET: Record<1 | 2 | 3, number> = { 1: 9, 2: 15, 3: 6 }
const COMPLEXITY_TARGET = { LOW: 6, MODERATE: 17, HIGH: 7 }

function countBy<T extends string | number>(defs: QuestionSeedDef[], key: (q: QuestionSeedDef) => T) {
  const m = new Map<T, number>()
  for (const q of defs) m.set(key(q), (m.get(key(q)) ?? 0) + 1)
  return m
}

describe('Unit 2 question bank — §13.2 / §7.4 distributions', () => {
  it('declares at least one completed benchmark', () => {
    expect(UNIT2_COMPLETE_BENCHMARKS.length).toBeGreaterThanOrEqual(1)
  })

  for (const code of UNIT2_COMPLETE_BENCHMARKS) {
    describe(code, () => {
      const defs = UNIT2_QUESTIONS_BY_BENCHMARK[code]

      it('is defined and has exactly 30 questions', () => {
        expect(defs).toBeDefined()
        expect(defs).toHaveLength(30)
      })

      it('matches the §13.2 category mix', () => {
        const byCat = countBy(defs, (q) => q.category)
        for (const [cat, target] of Object.entries(CATEGORY_TARGET)) {
          expect(byCat.get(cat as QuestionCategory) ?? 0).toBe(target)
        }
      })

      it('matches the §13.2 reading-load distribution (9/15/6)', () => {
        const byReading = countBy(defs, (q) => q.readingLoadLevel)
        expect(byReading.get(1) ?? 0).toBe(READING_TARGET[1])
        expect(byReading.get(2) ?? 0).toBe(READING_TARGET[2])
        expect(byReading.get(3) ?? 0).toBe(READING_TARGET[3])
      })

      it('matches the §7.4 cognitive-complexity distribution', () => {
        const byCx = countBy(defs, (q) => q.cognitiveComplexity)
        expect(byCx.get('LOW') ?? 0).toBe(COMPLEXITY_TARGET.LOW)
        expect(byCx.get('MODERATE') ?? 0).toBe(COMPLEXITY_TARGET.MODERATE)
        expect(byCx.get('HIGH') ?? 0).toBe(COMPLEXITY_TARGET.HIGH)
      })

      it('every question has exactly 4 options with exactly 1 correct', () => {
        for (const q of defs) {
          expect(q.options).toHaveLength(4)
          expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1)
        }
      })

      it('every question carries the required authoring tags', () => {
        for (const q of defs) {
          expect(q.skillTag.trim()).not.toBe('')
          expect(q.remediationTag.trim()).not.toBe('')
          expect(q.benchmarkCode).toBe(code)
        }
      })
    })
  }

  it('all completed externalKeys are unique', () => {
    const all = UNIT2_COMPLETE_BENCHMARKS.flatMap((c) => UNIT2_QUESTIONS_BY_BENCHMARK[c] ?? [])
    const keys = all.map((q) => q.externalKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
