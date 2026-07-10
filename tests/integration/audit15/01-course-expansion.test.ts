/**
 * Audit 15 — Full Course Expansion (§36.16).
 *
 * Item 1 (all benchmarks loaded) is verified course-wide. Items 2–6 are verified
 * for Unit 1 plus every completed benchmark in the question-bank registry (the
 * harness extends automatically as unit banks land). The "30 *approved*"
 * qualifier on item 2: Unit 1 content is APPROVED at seed under the owner's
 * directive (ADR 0013); later units are approved per-unit the same way.
 *
 * Self-seeds (idempotent) so it is robust to run order.
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../../seed/reporting_categories'
import { seedBenchmarks } from '../../../seed/benchmarks'
import { seedMisconceptions } from '../../../seed/misconception_inventory'
import { seedSampleQuestions } from '../../../seed/sample_questions_unit_1'
import { seedUnit1Backfill, UNIT1_COMPLETE_BENCHMARKS } from '../../../seed/questions/unit1_backfill'
import { ALL_QUESTION_BANKS } from '../../../seed/questions/registry'
import { seedRemediationItems } from '../../../seed/remediation_items'
import { validateQuestionTags } from '@/lib/eoc-alignment'

const prisma = new PrismaClient()

// Benchmarks validated at the DB level (count, reading, complexity, tagging,
// remediation). Unit 1 = original 15 (Tier B) + backfill 15 (Tier D, ADR 0013)
// = 30; other units come from the question-bank registry, so this harness
// extends automatically as unit banks land.
const DB_VALIDATED_BENCHMARKS = [
  ...UNIT1_COMPLETE_BENCHMARKS,
  ...ALL_QUESTION_BANKS.flatMap((b) => b.completeBenchmarks),
]

beforeAll(async () => {
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)
  await seedMisconceptions(prisma)
  await seedSampleQuestions(prisma)
  await seedUnit1Backfill(prisma)
  for (const bank of ALL_QUESTION_BANKS) {
    await bank.seed(prisma)
  }
  await seedRemediationItems(prisma)
}, 60000)

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Audit 15 — Item 1: all SS.7.CG benchmarks loaded', () => {
  it('all 36 course benchmarks exist, each with a reporting category + sequence', async () => {
    const benchmarks = await prisma.benchmark.findMany({
      where: { code: { startsWith: 'SS.7.CG.' } },
      select: { code: true, reportingCategoryId: true, sequenceOrder: true, unitId: true },
    })
    expect(benchmarks.length).toBeGreaterThanOrEqual(36)
    for (const b of benchmarks) {
      expect(b.reportingCategoryId).toBeTruthy()
      expect(b.unitId).toBeTruthy()
      expect(typeof b.sequenceOrder).toBe('number')
    }
  })

  it('all 7 units exist', async () => {
    const units = await prisma.unit.count()
    expect(units).toBeGreaterThanOrEqual(7)
  })
})

describe('Audit 15 — Items 2–6 for completed benchmarks (Unit 1 + Unit 2)', () => {
  it('has at least one completed benchmark to validate', () => {
    expect(DB_VALIDATED_BENCHMARKS.length).toBeGreaterThanOrEqual(1)
  })

  for (const code of DB_VALIDATED_BENCHMARKS) {
    describe(code, () => {
      // Item 2 — count
      it('has ≥30 questions', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({ where: { code }, select: { id: true } })
        const n = await prisma.question.count({ where: { benchmarkId: benchmark.id } })
        expect(n).toBeGreaterThanOrEqual(30)
      })

      // Item 3 — reading-load distribution (target 30/50/20)
      it('reading-load distribution matches §13.2 (≈30/50/20)', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({ where: { code }, select: { id: true } })
        const qs = await prisma.question.findMany({
          where: { benchmarkId: benchmark.id },
          select: { readingLoadLevel: true },
        })
        const total = qs.length
        const l1 = qs.filter((q) => q.readingLoadLevel === 1).length / total
        const l2 = qs.filter((q) => q.readingLoadLevel === 2).length / total
        const l3 = qs.filter((q) => q.readingLoadLevel === 3).length / total
        expect(l1).toBeGreaterThanOrEqual(0.25)
        expect(l1).toBeLessThanOrEqual(0.35)
        expect(l2).toBeGreaterThanOrEqual(0.45)
        expect(l2).toBeLessThanOrEqual(0.55)
        expect(l3).toBeGreaterThanOrEqual(0.15)
        expect(l3).toBeLessThanOrEqual(0.25)
      })

      // Item 4 — cognitive-complexity distribution (§7.4 bands)
      it('cognitive-complexity distribution is within §7.4 bands', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({ where: { code }, select: { id: true } })
        const qs = await prisma.question.findMany({
          where: { benchmarkId: benchmark.id },
          select: { cognitiveComplexity: true },
        })
        const total = qs.length
        const low = qs.filter((q) => q.cognitiveComplexity === 'LOW').length / total
        const mod = qs.filter((q) => q.cognitiveComplexity === 'MODERATE').length / total
        const high = qs.filter((q) => q.cognitiveComplexity === 'HIGH').length / total
        expect(low).toBeGreaterThanOrEqual(0.15)
        expect(low).toBeLessThanOrEqual(0.25)
        expect(mod).toBeGreaterThanOrEqual(0.45)
        expect(mod).toBeLessThanOrEqual(0.65)
        expect(high).toBeGreaterThanOrEqual(0.15)
        expect(high).toBeLessThanOrEqual(0.25)
      })

      // Item 5 — full tagging (rule #3)
      it('every question is fully tagged', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({ where: { code }, select: { id: true } })
        const qs = await prisma.question.findMany({
          where: { benchmarkId: benchmark.id },
          select: {
            benchmarkId: true,
            reportingCategoryId: true,
            cognitiveComplexity: true,
            readingLoadLevel: true,
            skillTag: true,
            remediationTag: true,
            misconceptionId: true,
            sourceTier: true,
            approvalStatus: true,
            stimulusId: true,
            stimulus: { select: { stimulusType: true } },
          },
        })
        for (const q of qs) {
          const missing = validateQuestionTags({
            benchmarkId: q.benchmarkId,
            reportingCategoryId: q.reportingCategoryId,
            cognitiveComplexity: q.cognitiveComplexity,
            readingLoadLevel: q.readingLoadLevel,
            skillTag: q.skillTag,
            remediationTag: q.remediationTag,
            misconceptionId: q.misconceptionId,
            sourceTier: q.sourceTier,
            approvalStatus: q.approvalStatus,
            stimulusId: q.stimulusId,
            stimulusType: q.stimulus?.stimulusType ?? null,
          })
          expect(missing).toEqual([])
        }
      })

      // Item 6 — ≥1 remediation activity per skill_tag
      it('has ≥1 remediation item per skill_tag', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({ where: { code }, select: { id: true } })
        const qs = await prisma.question.findMany({
          where: { benchmarkId: benchmark.id },
          select: { skillTag: true },
        })
        const skillTags = [...new Set(qs.map((q) => q.skillTag))]
        const remItems = await prisma.remediationItem.findMany({
          where: { benchmarkId: benchmark.id },
          select: { skillTag: true },
        })
        const coveredTags = new Set(remItems.map((r) => r.skillTag))
        for (const tag of skillTags) {
          expect(coveredTags.has(tag)).toBe(true)
        }
      })
    })
  }
})
