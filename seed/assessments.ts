/**
 * Mission Assessments — full learning loop for every benchmark (spec §10.4, §12.5).
 *
 * Every benchmark with APPROVED active questions gets its per-benchmark suite,
 * and every unit whose benchmarks have level-2+ approved questions gets a
 * Region Challenge (UNIT_REVIEW). Units without approved banks are skipped.
 *
 *   - MASTERY_CHALLENGE "Mastery Challenge — Form A/B/…" — rotating 5-item
 *                       level-2+ forms (80%; §16.3). Multiple forms exist so a
 *                       retry serves different questions (served round-robin by
 *                       the student's submitted-attempt count).
 *   - UNIT_REVIEW       "Region Challenge: {region} (Unit N)" — mixed review (75%)
 *   - VOCAB_CHECK       "Word Builder" — vocabulary-category items (70%)
 *   - PRE_CHECK         "Mission Scout" — 3 ungraded baseline questions (threshold 0)
 *   - READINESS_CHECK   "Training Check" — gates the Mastery Challenge (70%)
 *   - PRACTICE          "Training" — fixed-form fallback (70%; the Practice
 *                       Arena streams adaptively and doesn't use this form)
 *
 * DISJOINT ALLOCATION: all types draw from one shared `used` set (hardest
 * constraints allocate first), so a student never sees the same question on
 * the Mission Scout and the Word Builder, or on readiness and mastery. A
 * 30-question bank consumes ≤ 28 (2 mastery forms); banks large enough get 3.
 *
 * Idempotent + reconciling: existing rows are matched (by benchmarkId+type, in
 * id order for mastery forms, by title for unit reviews) and their question
 * sets are REWRITTEN in place when the computed allocation differs — assessment
 * ids are preserved so attempt history keeps its FKs (AttemptResponse references
 * Question directly, so rewriting AssessmentQuestion join rows is safe).
 *
 * Depends on: question seeders (questions must exist and be APPROVED first).
 */

import type { PrismaClient, AssessmentType } from '@prisma/client'
import { categoryByExternalKey } from './questions/registry'

const MASTERY_FORM_SIZE = 5
const MAX_MASTERY_FORMS = 3
/** unit-review 2 + vocab 3 + pre-check 3 + readiness 5 + practice 5 */
const NON_MASTERY_BUDGET = 18

interface SeedQuestion {
  id: string
  externalKey: string | null
  cognitiveComplexity: string
  readingLoadLevel: number
}

/** Create or reconcile an assessment's question set (id/attempts preserved). */
async function ensureAssessment(
  prisma: PrismaClient,
  args: {
    existingId: string | null
    title: string
    assessmentType: AssessmentType
    benchmarkId: string | null
    masteryThreshold: number
    questionIds: string[]
  }
): Promise<void> {
  if (args.questionIds.length === 0) return

  if (!args.existingId) {
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
    return
  }

  const current = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: args.existingId },
    orderBy: { sequenceOrder: 'asc' },
    select: { questionId: true },
  })
  const currentIds = current.map((q) => q.questionId)
  const same =
    currentIds.length === args.questionIds.length &&
    currentIds.every((id, i) => id === args.questionIds[i])

  const existing = await prisma.assessment.findUnique({
    where: { id: args.existingId },
    select: { title: true },
  })
  if (same && existing?.title === args.title) return

  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({
      where: { id: args.existingId! },
      data: { title: args.title },
    })
    if (!same) {
      await tx.assessmentQuestion.deleteMany({ where: { assessmentId: args.existingId! } })
      await tx.assessmentQuestion.createMany({
        data: args.questionIds.map((questionId, i) => ({
          assessmentId: args.existingId!,
          questionId,
          sequenceOrder: i + 1,
          points: 1.0,
        })),
      })
    }
  })
}

export async function seedMissionAssessments(prisma: PrismaClient): Promise<void> {
  const categories = categoryByExternalKey()
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
            select: {
              id: true,
              externalKey: true,
              cognitiveComplexity: true,
              readingLoadLevel: true,
            },
          },
        },
      },
    },
  })

  let suites = 0
  for (const unit of units) {
    // Per-benchmark level-2+ picks for the unit review, filled during the
    // benchmark pass so the review is disjoint from the mastery forms.
    const unitReviewIds: string[] = []

    for (const b of unit.benchmarks) {
      const qs: SeedQuestion[] = b.questions
      if (qs.length === 0) continue
      const level2plus = qs.filter((q) => q.readingLoadLevel >= 2)

      // Shared exclusion set — disjointness by construction.
      const used = new Set<string>()
      const take = (pool: SeedQuestion[], n: number): SeedQuestion[] => {
        const picked = pool.filter((q) => !used.has(q.id)).slice(0, n)
        for (const q of picked) used.add(q.id)
        return picked
      }

      // 1. Mastery forms (hardest constraint first): 5 level-2+ items each.
      //    Form count respects both the level-2+ pool (2 reserved for the unit
      //    review) and the whole-bank budget for the non-mastery types.
      const masteryForms: SeedQuestion[][] = []
      if (level2plus.length >= MASTERY_FORM_SIZE) {
        const masteryBudget = Math.min(level2plus.length - 2, qs.length - NON_MASTERY_BUDGET)
        const formCount = Math.max(
          1,
          Math.min(MAX_MASTERY_FORMS, Math.floor(masteryBudget / MASTERY_FORM_SIZE))
        )
        for (let f = 0; f < formCount; f++) {
          const form = take(level2plus, MASTERY_FORM_SIZE)
          if (form.length === MASTERY_FORM_SIZE) masteryForms.push(form)
        }
      }

      // Existing mastery rows adopt forms in id order (the legacy single
      // "Mastery Challenge" row becomes Form A, preserving attempt history).
      const existingMastery = await prisma.assessment.findMany({
        where: { benchmarkId: b.id, assessmentType: 'MASTERY_CHALLENGE' },
        orderBy: { id: 'asc' },
        select: { id: true },
      })
      for (let f = 0; f < masteryForms.length; f++) {
        await ensureAssessment(prisma, {
          existingId: existingMastery[f]?.id ?? null,
          title: `${b.code} — Mastery Challenge — Form ${String.fromCharCode(65 + f)}`,
          assessmentType: 'MASTERY_CHALLENGE',
          benchmarkId: b.id,
          masteryThreshold: 0.8,
          questionIds: masteryForms[f].map((q) => q.id),
        })
      }

      // 2. Unit-review slice: 2 level-2+ items, disjoint from the mastery forms.
      unitReviewIds.push(...take(level2plus, 2).map((q) => q.id))

      // Singleton types reconcile by (benchmarkId, type).
      const singleton = async (
        assessmentType: AssessmentType,
        title: string,
        masteryThreshold: number,
        picks: SeedQuestion[]
      ) => {
        const existing = await prisma.assessment.findFirst({
          where: { benchmarkId: b.id, assessmentType },
          select: { id: true },
        })
        await ensureAssessment(prisma, {
          existingId: existing?.id ?? null,
          title,
          assessmentType,
          benchmarkId: b.id,
          masteryThreshold,
          questionIds: picks.map((q) => q.id),
        })
      }

      // 3. Word Builder: genuinely vocabulary-tagged items first (authoring
      //    category via registry), topped up by LOW complexity, then anything.
      const vocabPicks = take(
        qs.filter((q) => q.externalKey !== null && categories.get(q.externalKey) === 'vocabulary'),
        3
      )
      if (vocabPicks.length < 3) {
        vocabPicks.push(...take(qs.filter((q) => q.cognitiveComplexity === 'LOW'), 3 - vocabPicks.length))
      }
      if (vocabPicks.length < 3) vocabPicks.push(...take(qs, 3 - vocabPicks.length))
      await singleton('VOCAB_CHECK', `Word Builder: ${b.code}`, 0.7, vocabPicks)

      // 4. Mission Scout (pre-check): 3 baseline items.
      await singleton('PRE_CHECK', `Mission Scout: ${b.code}`, 0, take(qs, 3))

      // 5. Training Check (readiness): level-2+ preferred (mirrors mastery
      //    difficulty where the bank allows), topped up from the full bank.
      const readinessPicks = take(level2plus, 5)
      if (readinessPicks.length < 5) readinessPicks.push(...take(qs, 5 - readinessPicks.length))
      await singleton('READINESS_CHECK', `Training Check: ${b.code}`, 0.7, readinessPicks)

      // 6. Fixed-form practice fallback.
      await singleton('PRACTICE', `${b.code} — Training`, 0.7, take(qs, 5))

      suites++
    }

    // UNIT_REVIEW — one per unit, spanning benchmarks (benchmarkId null).
    const unitReviewTitle = `Region Challenge: ${unit.gameRegionName} (Unit ${unit.sequenceOrder})`
    // Unit 1's original seed used a curly apostrophe in "Founders’ Harbor".
    const legacyTitle = unitReviewTitle.replace(/'/g, '’')
    if (unitReviewIds.length > 0) {
      const existingUnitReview = await prisma.assessment.findFirst({
        where: { assessmentType: 'UNIT_REVIEW', title: { in: [unitReviewTitle, legacyTitle] } },
        select: { id: true },
      })
      await ensureAssessment(prisma, {
        existingId: existingUnitReview?.id ?? null,
        title: unitReviewTitle,
        assessmentType: 'UNIT_REVIEW',
        benchmarkId: null,
        masteryThreshold: 0.75,
        questionIds: unitReviewIds,
      })
    }
  }

  console.log(`  ✓ Mission assessments ensured (${suites} benchmark suites + unit reviews)`)
}
