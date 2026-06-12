/**
 * Reusable question-seed engine (Phase 15).
 *
 * Generalizes the Unit 1 seeding logic (seed/sample_questions_unit_1.ts) so every
 * unit's bank loads the same way. The question inherits its reporting category
 * from its benchmark (set by seedBenchmarks), so callers don't pass a category.
 *
 * Tagging (rule #3) is carried on each QuestionSeedDef; sourceTier / approvalStatus
 * are passed per call (AI-drafted Unit-2+ content = Tier C / NEEDS_REVIEW).
 *
 * Idempotent: questions upserted by externalKey; options recreated (no stable key).
 */

import type {
  PrismaClient,
  ItemType,
  CognitiveComplexity,
  SourceTier,
  ApprovalStatus,
} from '@prisma/client'

/** The 7 §13.2 question categories. Carried for distribution validation; NOT persisted. */
export type QuestionCategory =
  | 'vocabulary'
  | 'basic_concept'
  | 'scenario'
  | 'source_analysis'
  | 'chart_visual'
  | 'misconception_check'
  | 'eoc_mixed'

export interface OptionSeedDef {
  text: string
  isCorrect: boolean
  feedback: string
  misconceptionCode?: string
}

export interface QuestionSeedDef {
  externalKey: string
  benchmarkCode: string
  prompt: string
  itemType: ItemType
  cognitiveComplexity: CognitiveComplexity
  readingLoadLevel: 1 | 2 | 3
  skillTag: string
  remediationTag: string
  misconceptionCode?: string
  /** §13.2 authoring category — used by validation tests only, not stored. */
  category: QuestionCategory
  options: OptionSeedDef[] // exactly 4; exactly 1 correct
}

export interface SeedQuestionOptions {
  sourceTier: SourceTier
  approvalStatus: ApprovalStatus
}

export async function seedQuestionDefs(
  prisma: PrismaClient,
  defs: QuestionSeedDef[],
  opts: SeedQuestionOptions
): Promise<number> {
  // Benchmarks → { id, reportingCategoryId } (question inherits its benchmark's category)
  const benchmarks = await prisma.benchmark.findMany({
    select: { id: true, code: true, reportingCategoryId: true },
  })
  const bmMap = new Map(benchmarks.map((b) => [b.code, b]))

  // Misconceptions → id
  const misconceptions = await prisma.misconception.findMany({ select: { id: true, code: true } })
  const mcMap = new Map(misconceptions.map((m) => [m.code, m.id]))

  let count = 0
  for (const q of defs) {
    const bm = bmMap.get(q.benchmarkCode)
    if (!bm) {
      throw new Error(`Benchmark not found: "${q.benchmarkCode}" (question ${q.externalKey}) — run seedBenchmarks first.`)
    }
    const misconceptionId = q.misconceptionCode ? (mcMap.get(q.misconceptionCode) ?? null) : null

    const question = await prisma.question.upsert({
      where: { externalKey: q.externalKey },
      create: {
        externalKey: q.externalKey,
        benchmarkId: bm.id,
        reportingCategoryId: bm.reportingCategoryId,
        prompt: q.prompt,
        itemType: q.itemType,
        cognitiveComplexity: q.cognitiveComplexity,
        readingLoadLevel: q.readingLoadLevel,
        skillTag: q.skillTag,
        remediationTag: q.remediationTag,
        misconceptionId,
        approvalStatus: opts.approvalStatus,
        sourceTier: opts.sourceTier,
        active: true,
      },
      update: {
        benchmarkId: bm.id,
        reportingCategoryId: bm.reportingCategoryId,
        prompt: q.prompt,
        itemType: q.itemType,
        cognitiveComplexity: q.cognitiveComplexity,
        readingLoadLevel: q.readingLoadLevel,
        skillTag: q.skillTag,
        remediationTag: q.remediationTag,
        misconceptionId,
        approvalStatus: opts.approvalStatus,
        sourceTier: opts.sourceTier,
      },
    })

    await prisma.questionOption.deleteMany({ where: { questionId: question.id } })
    for (const opt of q.options) {
      const optMiscId = opt.misconceptionCode ? (mcMap.get(opt.misconceptionCode) ?? null) : null
      await prisma.questionOption.create({
        data: {
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.isCorrect,
          feedback: opt.feedback,
          misconceptionId: optMiscId,
        },
      })
    }
    count++
  }
  return count
}
