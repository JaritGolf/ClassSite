/**
 * Integration — Teacher assessment previews (ADR 0015 lesson walkthrough).
 *
 * getAssessmentPreviewsForBenchmark is the read-only feed for the teacher
 * "walk it like a student" page: every APPROVED mission assessment with its
 * questions and the correct option marked. Teachers legitimately see answer
 * keys (same posture as the Question Bank); the function must be read-only
 * (zero attempt rows) and complete (all forms, ordered questions).
 *
 * Runs against the seeded dev DB (media-rich lessons live on SS.7.CG.1.3+
 * after the ADR 0017 realignment).
 */

import { PrismaClient } from '@prisma/client'
import { getAssessmentPreviewsForBenchmark, PREVIEW_ASSESSMENT_TYPES } from '@/lib/lesson-media'

const prisma = new PrismaClient()

let benchmarkId: string

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findFirstOrThrow({
    where: { code: 'SS.7.CG.1.3' },
    select: { id: true },
  })
  benchmarkId = benchmark.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('getAssessmentPreviewsForBenchmark', () => {
  it('returns every mission assessment type with questions and exactly one correct option each', async () => {
    const previews = await getAssessmentPreviewsForBenchmark(benchmarkId)

    for (const type of PREVIEW_ASSESSMENT_TYPES) {
      expect(Array.isArray(previews[type])).toBe(true)
    }

    // The seeded benchmark suite guarantees these types exist.
    for (const type of ['PRE_CHECK', 'VOCAB_CHECK', 'READINESS_CHECK', 'MASTERY_CHALLENGE'] as const) {
      expect(`${type}:${previews[type].length > 0}`).toBe(`${type}:true`)
    }

    for (const type of PREVIEW_ASSESSMENT_TYPES) {
      for (const preview of previews[type]) {
        expect(preview.questions.length).toBeGreaterThan(0)
        // Ungraded warm-ups (pre-check/vocab) can carry a 0 threshold.
        expect(preview.masteryThreshold).toBeGreaterThanOrEqual(0)
        for (const q of preview.questions) {
          expect(q.prompt.trim()).not.toBe('')
          expect(q.options.length).toBeGreaterThanOrEqual(3)
          expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1)
        }
      }
    }
  })

  it('returns ALL mastery forms (students see them round-robin; teachers see every form)', async () => {
    const dbForms = await prisma.assessment.count({
      where: { benchmarkId, assessmentType: 'MASTERY_CHALLENGE', approvalStatus: 'APPROVED' },
    })
    const previews = await getAssessmentPreviewsForBenchmark(benchmarkId)
    expect(previews.MASTERY_CHALLENGE.length).toBe(dbForms)
    expect(dbForms).toBeGreaterThanOrEqual(2) // Form A/B rotation exists for 30-question banks
  })

  it('is strictly read-only — creates no attempts and mutates nothing', async () => {
    const before = await prisma.assessmentAttempt.count()
    await getAssessmentPreviewsForBenchmark(benchmarkId)
    const after = await prisma.assessmentAttempt.count()
    expect(after).toBe(before)
  })

  it('excludes non-APPROVED assessments', async () => {
    const previews = await getAssessmentPreviewsForBenchmark(benchmarkId)
    const allIds = PREVIEW_ASSESSMENT_TYPES.flatMap((t) => previews[t].map((p) => p.id))
    if (allIds.length > 0) {
      const nonApproved = await prisma.assessment.count({
        where: { id: { in: allIds }, approvalStatus: { not: 'APPROVED' } },
      })
      expect(nonApproved).toBe(0)
    }
  })
})
