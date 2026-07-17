/**
 * Assessment allocation — disjoint, category-aware forms (student-workflow fix).
 *
 * Regression guards for the "pre-check ≡ vocab check ≡ readiness" overlap bug:
 * every benchmark suite must draw DISJOINT question sets across its assessment
 * types (and the unit review must be disjoint from the mastery forms), mastery
 * forms must be full 5-item level-2+ forms with rotation (≥2 forms on a
 * 30-question bank), the Word Builder must use genuinely vocabulary-tagged
 * items where the bank has them, and re-running the seeder must be a no-op.
 *
 * Self-seeds (idempotent) so it is robust to run order.
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../seed/reporting_categories'
import { seedBenchmarks } from '../../seed/benchmarks'
import { seedMisconceptions } from '../../seed/misconception_inventory'
import { seedSampleQuestions } from '../../seed/sample_questions_unit_1'
import { seedUnit1Backfill, UNIT1_COMPLETE_BENCHMARKS } from '../../seed/questions/unit1_backfill'
import { seedUnit1Interim, UNIT1_INTERIM_BENCHMARKS } from '../../seed/questions/unit1_interim'
import { seedMissionAssessments } from '../../seed/assessments'
import { categoryByExternalKey } from '../../seed/questions/registry'

const prisma = new PrismaClient()

const SUITE_TYPES = ['PRACTICE', 'PRE_CHECK', 'READINESS_CHECK', 'VOCAB_CHECK'] as const

interface AssessmentWithQuestions {
  id: string
  title: string
  assessmentType: string
  questions: {
    questionId: string
    question: { readingLoadLevel: number; externalKey: string | null }
  }[]
}

async function fetchSuite(benchmarkId: string): Promise<AssessmentWithQuestions[]> {
  return prisma.assessment.findMany({
    where: { benchmarkId },
    select: {
      id: true,
      title: true,
      assessmentType: true,
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        select: {
          questionId: true,
          question: { select: { readingLoadLevel: true, externalKey: true } },
        },
      },
    },
  })
}

beforeAll(async () => {
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)
  await seedMisconceptions(prisma)
  await seedSampleQuestions(prisma)
  await seedUnit1Backfill(prisma)
  await seedUnit1Interim(prisma)
  await seedMissionAssessments(prisma)
}, 120000)

afterAll(async () => {
  await prisma.$disconnect()
})

describe('assessment allocation (Unit 1 benchmarks)', () => {
  // ADR 0017: interim 1.1/1.2 banks get the same full-suite guarantee.
  for (const code of [...UNIT1_INTERIM_BENCHMARKS, ...UNIT1_COMPLETE_BENCHMARKS]) {
    describe(code, () => {
      let suite: AssessmentWithQuestions[]
      let benchmarkId: string

      beforeAll(async () => {
        const benchmark = await prisma.benchmark.findUnique({
          where: { code },
          select: { id: true },
        })
        expect(benchmark).not.toBeNull()
        benchmarkId = benchmark!.id
        suite = await fetchSuite(benchmarkId)
      })

      it('question sets are pairwise DISJOINT across all suite assessments', () => {
        // Includes every mastery form + the four singleton types.
        const sets = suite.map((a) => ({
          label: `${a.assessmentType}:${a.title}`,
          ids: a.questions.map((q) => q.questionId),
        }))
        for (let i = 0; i < sets.length; i++) {
          for (let j = i + 1; j < sets.length; j++) {
            const overlap = sets[i].ids.filter((id) => sets[j].ids.includes(id))
            expect(`${sets[i].label} ∩ ${sets[j].label} = ${overlap.length}`).toBe(
              `${sets[i].label} ∩ ${sets[j].label} = 0`
            )
          }
        }
      })

      it('PRE_CHECK and VOCAB_CHECK are non-empty and share no questions (the reported bug)', () => {
        const preCheck = suite.find((a) => a.assessmentType === 'PRE_CHECK')
        const vocab = suite.find((a) => a.assessmentType === 'VOCAB_CHECK')
        expect(preCheck!.questions.length).toBeGreaterThan(0)
        expect(vocab!.questions.length).toBeGreaterThan(0)
        const preIds = new Set(preCheck!.questions.map((q) => q.questionId))
        expect(vocab!.questions.some((q) => preIds.has(q.questionId))).toBe(false)
      })

      it('has ≥2 rotating mastery forms, each a full 5-item level-2+ form', () => {
        const forms = suite.filter((a) => a.assessmentType === 'MASTERY_CHALLENGE')
        expect(forms.length).toBeGreaterThanOrEqual(2)
        for (const form of forms) {
          expect(form.questions).toHaveLength(5)
          for (const q of form.questions) {
            expect(q.question.readingLoadLevel).toBeGreaterThanOrEqual(2)
          }
          expect(form.title).toMatch(/Mastery Challenge — Form [A-C]$/)
        }
      })

      it('every suite type exists with its expected size', () => {
        const byType = new Map(suite.map((a) => [a.assessmentType, a]))
        for (const t of SUITE_TYPES) expect(byType.has(t)).toBe(true)
        expect(byType.get('PRACTICE')!.questions).toHaveLength(5)
        expect(byType.get('READINESS_CHECK')!.questions).toHaveLength(5)
        expect(byType.get('PRE_CHECK')!.questions).toHaveLength(3)
        expect(byType.get('VOCAB_CHECK')!.questions).toHaveLength(3)
      })

      it('Word Builder leads with vocabulary-category items where the bank has them', () => {
        const categories = categoryByExternalKey()
        const authoredVocabCount = [...categories.entries()].filter(
          ([key, cat]) => cat === 'vocabulary' && key.includes(code.replace(/\./g, ''))
        ).length
        if (authoredVocabCount === 0) return // bank has no tagged vocabulary items
        const vocab = suite.find((a) => a.assessmentType === 'VOCAB_CHECK')!
        const vocabTagged = vocab.questions.filter(
          (q) =>
            q.question.externalKey !== null &&
            categories.get(q.question.externalKey) === 'vocabulary'
        ).length
        expect(vocabTagged).toBeGreaterThanOrEqual(Math.min(authoredVocabCount, 3))
      })

      it('unit review slice is disjoint from this benchmark’s mastery forms', async () => {
        const unitReview = await prisma.assessment.findFirst({
          where: { assessmentType: 'UNIT_REVIEW', title: { contains: 'Unit 1' } },
          select: { questions: { select: { questionId: true } } },
        })
        expect(unitReview).not.toBeNull()
        const masteryIds = new Set(
          suite
            .filter((a) => a.assessmentType === 'MASTERY_CHALLENGE')
            .flatMap((a) => a.questions.map((q) => q.questionId))
        )
        const overlap = unitReview!.questions.filter((q) => masteryIds.has(q.questionId))
        expect(overlap).toHaveLength(0)
      })
    })
  }

  it('re-running the seeder is a no-op (idempotent reconciliation)', async () => {
    const snapshot = await prisma.assessmentQuestion.findMany({
      orderBy: [{ assessmentId: 'asc' }, { sequenceOrder: 'asc' }],
      select: { assessmentId: true, questionId: true, sequenceOrder: true },
    })
    await seedMissionAssessments(prisma)
    const after = await prisma.assessmentQuestion.findMany({
      orderBy: [{ assessmentId: 'asc' }, { sequenceOrder: 'asc' }],
      select: { assessmentId: true, questionId: true, sequenceOrder: true },
    })
    expect(after).toEqual(snapshot)
  })
})
