/**
 * Authored remediation content shape (pure, no DB) — ADR 0013 / spec §14.
 *
 * Every authored def must parse against RemediationContentSchema (which
 * enforces ≥2 examples + ≥2 non-examples) and must target a (benchmark,
 * skill_tag) pair that a question bank actually uses — otherwise the def would
 * never be assigned to a student.
 */

import { ALL_AUTHORED_REMEDIATION } from '../../../seed/remediation/_content'
import { UNIT1_BACKFILL_BY_BENCHMARK } from '../../../seed/questions/unit1_backfill'
import { ALL_QUESTION_BANKS } from '../../../seed/questions/registry'
import { RemediationContentSchema } from '@/lib/lesson-content'

// Known (benchmarkCode, skillTag) pairs from the QuestionSeedDef-style banks.
const KNOWN_PAIRS = new Set<string>()
for (const [code, defs] of Object.entries(UNIT1_BACKFILL_BY_BENCHMARK)) {
  for (const q of defs) KNOWN_PAIRS.add(`${code}::${q.skillTag}`)
}
for (const bank of ALL_QUESTION_BANKS) {
  for (const [code, defs] of Object.entries(bank.questionsByBenchmark)) {
    for (const q of defs) KNOWN_PAIRS.add(`${code}::${q.skillTag}`)
  }
}

describe('Authored remediation content', () => {
  it('has at least one authored def', () => {
    expect(ALL_AUTHORED_REMEDIATION.length).toBeGreaterThanOrEqual(1)
  })

  it('covers every Unit 1 (benchmark, skill_tag) pair', () => {
    const authoredKeys = new Set(
      ALL_AUTHORED_REMEDIATION.map((d) => `${d.benchmarkCode}::${d.skillTag}`)
    )
    for (const [code, defs] of Object.entries(UNIT1_BACKFILL_BY_BENCHMARK)) {
      for (const q of defs) {
        expect(authoredKeys.has(`${code}::${q.skillTag}`)).toBe(true)
      }
    }
  })

  for (const def of ALL_AUTHORED_REMEDIATION) {
    describe(`${def.benchmarkCode} / ${def.skillTag}`, () => {
      it('parses against RemediationContentSchema (≥2 examples + ≥2 non-examples)', () => {
        const result = RemediationContentSchema.safeParse(def.content)
        expect(result.success).toBe(true)
      })

      it('targets a (benchmark, skill_tag) pair a question bank actually uses', () => {
        expect(KNOWN_PAIRS.has(`${def.benchmarkCode}::${def.skillTag}`)).toBe(true)
      })

      it('has a non-empty title and concept', () => {
        expect(def.title.trim()).not.toBe('')
        expect(def.content.concept.trim().length).toBeGreaterThan(80)
      })
    })
  }
})
