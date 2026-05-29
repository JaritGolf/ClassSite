/**
 * Integration Test: every seeded Unit 1 question is fully tagged.
 *
 * Locks in non-negotiable rule #3 ("Every question must be fully tagged.
 * Untagged content does not ship.") against the live seed data.
 */

import { PrismaClient } from '@prisma/client'
import { validateQuestionTags } from '@/lib/eoc-alignment'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('seed tagging guard (rule #3)', () => {
  it('every active Unit 1 question passes validateQuestionTags', async () => {
    const questions = await prisma.question.findMany({
      where: { active: true, benchmark: { code: { startsWith: 'SS.7.CG.1.' } } },
      select: {
        benchmarkId: true,
        reportingCategoryId: true,
        cognitiveComplexity: true,
        stimulusId: true,
        stimulus: { select: { stimulusType: true } },
        readingLoadLevel: true,
        skillTag: true,
        remediationTag: true,
        misconceptionId: true,
        sourceTier: true,
        approvalStatus: true,
      },
    })

    expect(questions.length).toBeGreaterThan(0)

    const offenders: Array<{ benchmarkId: string; missing: string[] }> = []
    for (const q of questions) {
      const missing = validateQuestionTags({
        benchmarkId: q.benchmarkId,
        reportingCategoryId: q.reportingCategoryId,
        cognitiveComplexity: q.cognitiveComplexity,
        stimulusType: q.stimulus?.stimulusType ?? null,
        stimulusId: q.stimulusId,
        readingLoadLevel: q.readingLoadLevel,
        skillTag: q.skillTag,
        remediationTag: q.remediationTag,
        misconceptionId: q.misconceptionId,
        sourceTier: q.sourceTier,
        approvalStatus: q.approvalStatus,
      })
      if (missing.length > 0) offenders.push({ benchmarkId: q.benchmarkId, missing })
    }

    expect(offenders).toEqual([])
  })
})
