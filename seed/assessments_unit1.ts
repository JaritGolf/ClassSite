/**
 * Unit 1 Assessments — full mission learning loop (spec §10.4, §12.5).
 *
 * Seeds one of each assessment type per Unit 1 benchmark so a fresh database
 * produces a working mission flow:
 *   - PRACTICE        "Training" — formative practice (70%)
 *   - PRE_CHECK       "Mission Scout" — 3 ungraded baseline questions (threshold 0)
 *   - READINESS_CHECK "Training Check" — gates the Mastery Challenge (70%)
 *   - VOCAB_CHECK     "Word Builder" — low-complexity term check (70%)
 *   - MASTERY_CHALLENGE "Mastery Challenge" — 5 level-2+ items (80%)
 * Plus one Unit-1-wide:
 *   - UNIT_REVIEW     "Region Challenge" — mixed review spanning benchmarks (75%)
 *
 * Idempotent: benchmark-scoped assessments are keyed by (benchmarkId, type) —
 * if one already exists for a benchmark it is left untouched (so this reuses the
 * dev DB's existing rows and only fills gaps). UNIT_REVIEW is keyed by title.
 *
 * Depends on: sample_questions_unit_1 (questions must exist first).
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

export async function seedUnit1Assessments(prisma: PrismaClient): Promise<void> {
  const benchmarks = await prisma.benchmark.findMany({
    where: { code: { startsWith: 'SS.7.CG.1.' } },
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
  })

  for (const b of benchmarks) {
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

    // Mastery Challenge requires reading-load level 2 minimum (spec §16.3).
    await ensureBenchmarkAssessment(prisma, {
      title: `${b.code} — Mastery Challenge`,
      assessmentType: 'MASTERY_CHALLENGE',
      benchmarkId: b.id,
      masteryThreshold: 0.8,
      questionIds: level2plus.slice(0, 5).map((q) => q.id),
    })

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
  }

  // UNIT_REVIEW — one Unit-1-wide "Region Challenge": ~2 level-2+ questions per
  // benchmark, spanning benchmarks (benchmarkId null, like Republic Challenge).
  const unitReviewTitle = 'Region Challenge: Founders’ Harbor (Unit 1)'
  const existingUnitReview = await prisma.assessment.findFirst({
    where: { title: unitReviewTitle },
    select: { id: true },
  })
  if (!existingUnitReview) {
    const unitReviewQuestionIds = benchmarks.flatMap((b) =>
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
