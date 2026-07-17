/**
 * Mission content integration — the "turnkey Unit 1" guarantee (ADR 0013).
 *
 * For every Unit 1 benchmark, a student must find a complete learning loop in
 * the database: an APPROVED guided lesson (full §10.4 template), approved
 * tier-3 key terms (with Spanish glosses), a 30-question approved bank, the
 * five per-benchmark assessments, and APPROVED authored remediation that
 * parses as real reteach content. Self-seeds (idempotent) so it is robust to
 * run order.
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../seed/reporting_categories'
import { seedBenchmarks } from '../../seed/benchmarks'
import { seedMisconceptions } from '../../seed/misconception_inventory'
import { seedVocabulary } from '../../seed/vocabulary'
import { seedTermTranslations } from '../../seed/term_translations'
import { seedLessons } from '../../seed/lessons'
import { seedSampleQuestions } from '../../seed/sample_questions_unit_1'
import { seedUnit1Backfill, UNIT1_COMPLETE_BENCHMARKS } from '../../seed/questions/unit1_backfill'
import { seedUnit1Interim, UNIT1_INTERIM_BENCHMARKS } from '../../seed/questions/unit1_interim'
import { seedRemediationItems } from '../../seed/remediation_items'
import { seedMissionAssessments } from '../../seed/assessments'
import { UNIT1_REMEDIATION } from '../../seed/remediation/unit1'
import { parseStepContent, parseRemediationContent } from '@/lib/lesson-content'

const prisma = new PrismaClient()

beforeAll(async () => {
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)
  await seedMisconceptions(prisma)
  await seedVocabulary(prisma)
  await seedTermTranslations(prisma)
  await seedLessons(prisma)
  await seedSampleQuestions(prisma)
  await seedUnit1Backfill(prisma)
  await seedUnit1Interim(prisma)
  await seedRemediationItems(prisma)
  await seedMissionAssessments(prisma)
}, 120000)

// ADR 0017: Unit 1 = official 1.1–1.6. The interim 1.1/1.2 blocks must deliver
// the same turnkey guarantee as the carried-over banks.
const UNIT1_TURNKEY_BENCHMARKS = [...UNIT1_INTERIM_BENCHMARKS, ...UNIT1_COMPLETE_BENCHMARKS]

afterAll(async () => {
  await prisma.$disconnect()
})

const REQUIRED_ASSESSMENT_TYPES = [
  'PRACTICE',
  'PRE_CHECK',
  'READINESS_CHECK',
  'VOCAB_CHECK',
  'MASTERY_CHALLENGE',
] as const

describe('Turnkey Unit 1 — complete learning loop per benchmark', () => {
  for (const code of UNIT1_TURNKEY_BENCHMARKS) {
    describe(code, () => {
      it('has an APPROVED guided lesson implementing the §10.4 template', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({
          where: { code },
          select: { id: true },
        })
        const lesson = await prisma.lesson.findFirst({
          where: { benchmarkId: benchmark.id, approvalStatus: 'APPROVED' },
          include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
        })
        expect(lesson).not.toBeNull()
        expect(lesson!.body.trim().length).toBeGreaterThan(100)
        expect(lesson!.steps.length).toBeGreaterThanOrEqual(10)

        const types = new Set(lesson!.steps.map((s) => s.stepType))
        expect(types.has('NOTE')).toBe(true)
        expect(types.has('VOCABULARY')).toBe(true)
        expect(types.has('WORKED_EXAMPLE')).toBe(true)
        expect(types.has('INTERACTIVE_CHECK')).toBe(true)
        expect(types.has('SOURCE_ANALYSIS')).toBe(true)

        // Structured steps must parse — a text fallback here means a student
        // would see raw JSON or a degraded panel.
        for (const step of lesson!.steps) {
          const parsed = parseStepContent(step.stepType, step.content)
          if (step.stepType === 'WORKED_EXAMPLE') expect(parsed.kind).toBe('worked-example')
          if (step.stepType === 'INTERACTIVE_CHECK') expect(parsed.kind).toBe('interactive-check')
          if (step.stepType === 'SOURCE_ANALYSIS') expect(parsed.kind).toBe('source-analysis')
        }
      })

      it('has ≥3 APPROVED tier-3 key terms, each with an APPROVED Spanish gloss', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({
          where: { code },
          select: { id: true },
        })
        const terms = await prisma.term.findMany({
          where: { benchmarkId: benchmark.id, tier: 'TIER_3', approvalStatus: 'APPROVED' },
          select: {
            term: true,
            translations: {
              where: { languageCode: 'es', approvalStatus: 'APPROVED' },
              select: { id: true },
            },
          },
        })
        expect(terms.length).toBeGreaterThanOrEqual(3)
        for (const t of terms) {
          expect(`${t.term}:${t.translations.length > 0}`).toBe(`${t.term}:true`)
        }
      })

      it('has 30 APPROVED active questions (ADR 0013)', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({
          where: { code },
          select: { id: true },
        })
        const approved = await prisma.question.count({
          where: { benchmarkId: benchmark.id, active: true, approvalStatus: 'APPROVED' },
        })
        expect(approved).toBeGreaterThanOrEqual(30)
      })

      it('has all five per-benchmark assessments', async () => {
        const benchmark = await prisma.benchmark.findUniqueOrThrow({
          where: { code },
          select: { id: true },
        })
        for (const assessmentType of REQUIRED_ASSESSMENT_TYPES) {
          const found = await prisma.assessment.findFirst({
            where: { benchmarkId: benchmark.id, assessmentType, approvalStatus: 'APPROVED' },
            select: { id: true },
          })
          expect(`${assessmentType}:${found !== null}`).toBe(`${assessmentType}:true`)
        }
      })
    })
  }

  it('every authored Unit 1 remediation item is APPROVED and parses as real reteach content', async () => {
    for (const def of UNIT1_REMEDIATION) {
      // ADR 0017: look up by (benchmark, skillTag) — the reconciling seeder
      // preserves pre-realignment row ids, so ids no longer derive from the
      // def's (current) benchmarkCode.
      const benchmark = await prisma.benchmark.findUniqueOrThrow({
        where: { code: def.benchmarkCode },
        select: { id: true },
      })
      const item = await prisma.remediationItem.findFirst({
        where: { benchmarkId: benchmark.id, skillTag: def.skillTag },
        select: { approvalStatus: true, content: true, title: true },
      })
      expect(item).not.toBeNull()
      expect(item!.approvalStatus).toBe('APPROVED')
      const parsed = parseRemediationContent(item!.content)
      expect(parsed).not.toBeNull()
      expect(parsed!.examples.filter((e) => e.isExample).length).toBeGreaterThanOrEqual(2)
      expect(parsed!.examples.filter((e) => !e.isExample).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('a Unit 1 Region Challenge (UNIT_REVIEW) exists', async () => {
    const review = await prisma.assessment.findFirst({
      where: { assessmentType: 'UNIT_REVIEW', title: { contains: 'Unit 1' } },
      select: { id: true },
    })
    expect(review).not.toBeNull()
  })
})
