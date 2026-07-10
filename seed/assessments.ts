/**
 * Mission Assessments — full learning loop for every benchmark (spec §10.4, §12.5).
 *
 * Generalizes the Phase-15 Unit 1 seeder to the whole course: every benchmark
 * that has APPROVED active questions gets its per-benchmark suite, and every
 * unit whose benchmarks have level-2+ approved questions gets a Region
 * Challenge (UNIT_REVIEW). Units without approved banks are skipped, so this
 * is a no-op for Units 2–7 until their content lands and is approved.
 *
 *   - PRACTICE          "Training" — formative practice (70%)
 *   - PRE_CHECK         "Mission Scout" — 3 ungraded baseline questions (threshold 0)
 *   - READINESS_CHECK   "Training Check" — gates the Mastery Challenge (70%)
 *   - VOCAB_CHECK       "Word Builder" — low-complexity term check (70%)
 *   - MASTERY_CHALLENGE "Mastery Challenge" — 5 level-2+ items (80%; only built
 *                       when a full 5-item level-2+ form exists, per §16.3)
 *   - UNIT_REVIEW       "Region Challenge: {region} (Unit N)" — mixed review (75%)
 *
 * Idempotent: benchmark-scoped assessments are keyed by (benchmarkId, type) —
 * existing rows are left untouched. UNIT_REVIEW is keyed by title (the Unit 1
 * legacy title used a curly apostrophe; both variants are matched).
 *
 * Depends on: question seeders (questions must exist and be APPROVED first).
 */

import type { PrismaClient, AssessmentType } from '@prisma/client'

async function ensureBenchmarkAssessment(
  prisma: PrismaClient,
  args: {
    title: string
    assessmentType: AssessmentType
    benchmarkId: string
    masteryThreshold: number
    questionIds: string[]
  }
): Promise<void> {
  if (args.questionIds.length === 0) return

  const existing = await prisma.assessment.findFirst({
    where: { benchmarkId: args.benchmarkId, assessmentType: args.assessmentType },
    select: { id: true },
  })
  if (existing) return

  await prisma.assessment.create({
    data: {
      title: args.title,
      assessmentType: args.assessmentType,
      benchmarkId: args.benchmarkId,
      masteryThreshold: args.masteryThreshold,
      approvalStatus: 'APPROVED',
      questions: {
        create: args.questionIds.map((questionId, i) => ({
          questionId,
          sequenceOrder: i + 1,
          points: 1.0,
        })),
      },
    },
  })
}

export async function seedMissionAssessments(prisma: PrismaClient): Promise<void> {
  const units = await prisma.unit.findMany({
    orderBy: { sequenceOrder: 'asc' },
    select: {
      id: true,
      sequenceOrder: true,
      gameRegionName: true,
      benchmarks: {
        where: { code: { startsWith: 'SS.7.CG.' } },
        orderBy: { sequenceOrder: 'asc' },
        select: {
          id: true,
          code: true,
          questions: {
            where: { active: true, approvalStatus: 'APPROVED' },
            orderBy: { externalKey: 'asc' },
            select: { id: true, cognitiveComplexity: true, readingLoadLevel: true },
          },
        },
      },
    },
  })

  let suites = 0
  for (const unit of units) {
    for (const b of unit.benchmarks) {
      const qs = b.questions
      if (qs.length === 0) continue
      const level2plus = qs.filter((q) => q.readingLoadLevel >= 2)

      await ensureBenchmarkAssessment(prisma, {
        title: `${b.code} — Training`,
        assessmentType: 'PRACTICE',
        benchmarkId: b.id,
        masteryThreshold: 0.7,
        questionIds: qs.slice(0, 5).map((q) => q.id),
      })

      // Mastery Challenge requires reading-load level 2 minimum (spec §16.3);
      // only build it when a full 5-item level-2+ form exists.
      if (level2plus.length >= 5) {
        await ensureBenchmarkAssessment(prisma, {
          title: `${b.code} — Mastery Challenge`,
          assessmentType: 'MASTERY_CHALLENGE',
          benchmarkId: b.id,
          masteryThreshold: 0.8,
          questionIds: level2plus.slice(0, 5).map((q) => q.id),
        })
      }

      await ensureBenchmarkAssessment(prisma, {
        title: `Mission Scout: ${b.code}`,
        assessmentType: 'PRE_CHECK',
        benchmarkId: b.id,
        masteryThreshold: 0,
        questionIds: qs.slice(0, 3).map((q) => q.id),
      })

      await ensureBenchmarkAssessment(prisma, {
        title: `Training Check: ${b.code}`,
        assessmentType: 'READINESS_CHECK',
        benchmarkId: b.id,
        masteryThreshold: 0.7,
        questionIds: qs.slice(0, 5).map((q) => q.id),
      })

      const lowComplexity = qs.filter((q) => q.cognitiveComplexity === 'LOW')
      const vocabPool = lowComplexity.length >= 3 ? lowComplexity : qs
      await ensureBenchmarkAssessment(prisma, {
        title: `Word Builder: ${b.code}`,
        assessmentType: 'VOCAB_CHECK',
        benchmarkId: b.id,
        masteryThreshold: 0.7,
        questionIds: vocabPool.slice(0, 3).map((q) => q.id),
      })
      suites++
    }

    // UNIT_REVIEW — one per unit: ~2 level-2+ questions per benchmark, spanning
    // benchmarks (benchmarkId null, like Republic Challenge).
    const unitReviewTitle = `Region Challenge: ${unit.gameRegionName} (Unit ${unit.sequenceOrder})`
    // Unit 1's original seed used a curly apostrophe in "Founders’ Harbor".
    const legacyTitle = unitReviewTitle.replace(/'/g, '’')
    const existingUnitReview = await prisma.assessment.findFirst({
      where: { assessmentType: 'UNIT_REVIEW', title: { in: [unitReviewTitle, legacyTitle] } },
      select: { id: true },
    })
    if (!existingUnitReview) {
      const unitReviewQuestionIds = unit.benchmarks.flatMap((b) =>
        b.questions
          .filter((q) => q.readingLoadLevel >= 2)
          .slice(0, 2)
          .map((q) => q.id)
      )
      if (unitReviewQuestionIds.length > 0) {
        await prisma.assessment.create({
          data: {
            title: unitReviewTitle,
            assessmentType: 'UNIT_REVIEW',
            benchmarkId: null,
            masteryThreshold: 0.75,
            approvalStatus: 'APPROVED',
            questions: {
              create: unitReviewQuestionIds.map((questionId, i) => ({
                questionId,
                sequenceOrder: i + 1,
                points: 1.0,
              })),
            },
          },
        })
      }
    }
  }

  console.log(`  ✓ Mission assessments ensured (${suites} benchmark suites + unit reviews)`)
}
