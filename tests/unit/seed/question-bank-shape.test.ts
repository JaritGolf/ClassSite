/**
 * Question-bank shape (pure, no DB) — Audit §36.16 / §13.2 / §7.4.
 *
 * Generalizes the former unit2-category-mix test: iterates every bank in
 * seed/questions/registry.ts, so new units are validated with zero test edits.
 * Validates the §13.2 category mix on the source-of-truth definitions (category
 * is an authoring construct, not a DB column), reading-load and cognitive-
 * complexity distributions, option integrity, tag presence, misconception-code
 * references against the Appendix E inventory, and global externalKey
 * uniqueness across banks.
 */

import { ALL_QUESTION_BANKS } from '../../../seed/questions/registry'
import { MISCONCEPTION_CODES } from '../../../seed/misconception_inventory'
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

const KNOWN_CODES = new Set(MISCONCEPTION_CODES)

function countBy<T extends string | number>(defs: QuestionSeedDef[], key: (q: QuestionSeedDef) => T) {
  const m = new Map<T, number>()
  for (const q of defs) m.set(key(q), (m.get(key(q)) ?? 0) + 1)
  return m
}

describe('Question banks — §13.2 / §7.4 distributions (registry-driven)', () => {
  it('registry declares at least one bank with a completed benchmark', () => {
    expect(ALL_QUESTION_BANKS.length).toBeGreaterThanOrEqual(1)
    expect(ALL_QUESTION_BANKS.flatMap((b) => b.completeBenchmarks).length).toBeGreaterThanOrEqual(1)
  })

  for (const bank of ALL_QUESTION_BANKS) {
    describe(bank.unitId, () => {
      for (const code of bank.completeBenchmarks) {
        describe(code, () => {
          const defs = bank.questionsByBenchmark[code]

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

          it('at least one misconception_check question links to the Appendix E inventory', () => {
            // Some misconception items target errors the 50-entry starter
            // inventory doesn't enumerate (e.g. Preamble/Bill of Rights
            // confusion) — those legitimately carry no code. But a benchmark's
            // misconception set must connect to the inventory somewhere, or
            // misconception-driven remediation can never trigger for it.
            const checks = defs.filter((d) => d.category === 'misconception_check')
            const linked = checks.some(
              (q) => Boolean(q.misconceptionCode) || q.options.some((o) => o.misconceptionCode)
            )
            expect(linked).toBe(true)
          })

          it('every referenced misconception code exists in the Appendix E inventory', () => {
            for (const q of defs) {
              if (q.misconceptionCode) expect(KNOWN_CODES.has(q.misconceptionCode)).toBe(true)
              for (const o of q.options) {
                if (o.misconceptionCode) expect(KNOWN_CODES.has(o.misconceptionCode)).toBe(true)
              }
            }
          })
        })
      }
    })
  }

  it('externalKeys are unique globally across all banks', () => {
    const all = ALL_QUESTION_BANKS.flatMap((b) =>
      Object.values(b.questionsByBenchmark).flat()
    )
    const keys = all.map((q) => q.externalKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
