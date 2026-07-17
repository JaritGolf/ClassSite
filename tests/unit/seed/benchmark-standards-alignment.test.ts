/**
 * Standards-alignment guardrail (pure, no DB) — ADR 0017.
 *
 * Pins every seeded benchmark def to the official Florida SS.7.CG statements
 * snapshotted in seed/official_standards.ts (source: CASE knowledge graph,
 * retrieved 2026-07-16). The pre-2026-07 drift shipped strand-1 content under
 * codes whose official meaning differed — this suite makes that class of drift
 * a test failure instead of a discovery:
 *
 *   1. The seeded code set is exactly the official 36-code set.
 *   2. Each def's officialStatement is the verbatim snapshot statement.
 *   3. Each code's topical anchors appear in the def's own prose
 *      (title + lessonSummary + clarifications) — catches content drifting
 *      away from the official meaning without pinning exact wording.
 *   4. sequenceOrder follows numeric code order (owner decision: interim
 *      content was authored for 1.1/1.2 so numeric mission order works).
 *   5. Strand → reporting-category mapping holds.
 *
 * MCP is not callable from jest, so the snapshot is checked in; refresh it
 * only from the authoritative source and never edit statements by hand.
 */

import { UNITS, type BenchmarkDef } from '../../../seed/benchmarks'
import {
  OFFICIAL_SS7CG_STANDARDS,
  OFFICIAL_SS7CG_CODES,
} from '../../../seed/official_standards'

const ALL_DEFS: BenchmarkDef[] = UNITS.flatMap((u) => u.benchmarks)

/** Numeric sort key for SS.7.CG.<strand>.<num>. */
function codeKey(code: string): number {
  const m = code.match(/^SS\.7\.CG\.(\d+)\.(\d+)$/)
  if (!m) throw new Error(`Unexpected code format: ${code}`)
  return Number(m[1]) * 100 + Number(m[2])
}

const CATEGORY_BY_STRAND: Array<{ test: (code: string) => boolean; categoryKey: string }> = [
  { test: (c) => c.startsWith('SS.7.CG.1.'), categoryKey: 'ORIGINS' },
  {
    test: (c) => /^SS\.7\.CG\.2\.([1-5])$/.test(c),
    categoryKey: 'CITIZENS',
  },
  {
    test: (c) => /^SS\.7\.CG\.2\.(6|7|8|9|10)$/.test(c),
    categoryKey: 'POLICIES',
  },
  { test: (c) => c.startsWith('SS.7.CG.3.'), categoryKey: 'ORGANIZATION' },
]

describe('Benchmark defs align to the official SS.7.CG standards (ADR 0017)', () => {
  it('seeded code set === official 36-code set (no extras, none missing)', () => {
    const seeded = ALL_DEFS.map((d) => d.code).sort()
    const official = [...OFFICIAL_SS7CG_CODES].sort()
    expect(seeded).toEqual(official)
    expect(seeded.length).toBe(36)
  })

  it('codes are unique across units', () => {
    const codes = ALL_DEFS.map((d) => d.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  for (const def of ALL_DEFS) {
    describe(def.code, () => {
      const official = OFFICIAL_SS7CG_STANDARDS[def.code]

      it('carries the verbatim official statement', () => {
        expect(official).toBeDefined()
        expect(def.officialStatement).toBe(official.statement)
      })

      it('def prose covers the official topical anchors', () => {
        const haystack = [
          def.title,
          def.lessonSummary,
          ...def.clarifications.map((c) => c.text),
        ]
          .join('\n')
          .toLowerCase()
        for (const anchor of official.anchors) {
          expect(`${anchor}:${haystack.includes(anchor.toLowerCase())}`).toBe(`${anchor}:true`)
        }
      })
    })
  }

  it('sequenceOrder strictly follows numeric code order across the course', () => {
    const bySequence = [...ALL_DEFS].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    const byCode = [...ALL_DEFS].sort((a, b) => codeKey(a.code) - codeKey(b.code))
    expect(bySequence.map((d) => d.code)).toEqual(byCode.map((d) => d.code))
    // and sequenceOrder is 1..36 with no gaps
    expect(bySequence.map((d) => d.sequenceOrder)).toEqual(
      Array.from({ length: ALL_DEFS.length }, (_, i) => i + 1)
    )
  })

  it('strand → reporting-category mapping holds for every unit', () => {
    for (const unit of UNITS) {
      for (const bm of unit.benchmarks) {
        const expected = CATEGORY_BY_STRAND.find((r) => r.test(bm.code))
        expect(expected).toBeDefined()
        expect(`${bm.code}:${unit.categoryKey}`).toBe(`${bm.code}:${expected!.categoryKey}`)
      }
    }
  })

  it('units partition the course as documented (1.1–1.6 / 1.7–1.11 / 2.1–2.5 / 2.6–2.10 / 3.1–3.5 / 3.6–3.12 / 3.13–3.15)', () => {
    const expectByUnit: Record<string, string[]> = {
      'unit-1': ['SS.7.CG.1.1', 'SS.7.CG.1.2', 'SS.7.CG.1.3', 'SS.7.CG.1.4', 'SS.7.CG.1.5', 'SS.7.CG.1.6'],
      'unit-2': ['SS.7.CG.1.7', 'SS.7.CG.1.8', 'SS.7.CG.1.9', 'SS.7.CG.1.10', 'SS.7.CG.1.11'],
      'unit-3': ['SS.7.CG.2.1', 'SS.7.CG.2.2', 'SS.7.CG.2.3', 'SS.7.CG.2.4', 'SS.7.CG.2.5'],
      'unit-4': ['SS.7.CG.2.6', 'SS.7.CG.2.7', 'SS.7.CG.2.8', 'SS.7.CG.2.9', 'SS.7.CG.2.10'],
      'unit-5': ['SS.7.CG.3.1', 'SS.7.CG.3.2', 'SS.7.CG.3.3', 'SS.7.CG.3.4', 'SS.7.CG.3.5'],
      'unit-6': ['SS.7.CG.3.6', 'SS.7.CG.3.7', 'SS.7.CG.3.8', 'SS.7.CG.3.9', 'SS.7.CG.3.10', 'SS.7.CG.3.11', 'SS.7.CG.3.12'],
      'unit-7': ['SS.7.CG.3.13', 'SS.7.CG.3.14', 'SS.7.CG.3.15'],
    }
    for (const unit of UNITS) {
      expect(unit.benchmarks.map((b) => b.code)).toEqual(expectByUnit[unit.id])
    }
  })
})
