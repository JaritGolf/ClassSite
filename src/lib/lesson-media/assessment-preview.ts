/**
 * Teacher assessment previews (ADR 0015 — lesson walkthrough).
 *
 * Read-only summaries of a benchmark's mission assessments — questions with
 * the correct option marked and authored feedback — so a teacher can skim
 * what students will face WITHOUT playing the assessment (no
 * AssessmentAttempt rows are ever created; nothing here writes).
 *
 * SECURITY (rule #2): answer keys are for TEACHERS. This module must only be
 * called from requireAuth(['TEACHER','ADMIN'])-gated pages/routes — same
 * posture as the teacher Question Bank, which already exposes isCorrect.
 */

import { prisma } from '@/lib/db'

/** Mission assessment types shown in the walkthrough, in flow order. */
export const PREVIEW_ASSESSMENT_TYPES = [
  'PRE_CHECK',
  'VOCAB_CHECK',
  'PRACTICE',
  'READINESS_CHECK',
  'MASTERY_CHALLENGE',
] as const

export type PreviewAssessmentType = (typeof PREVIEW_ASSESSMENT_TYPES)[number]

export interface AssessmentPreviewQuestion {
  prompt: string
  cognitiveComplexity: 'LOW' | 'MODERATE' | 'HIGH'
  options: {
    text: string
    isCorrect: boolean
    feedback: string | null
  }[]
}

export interface AssessmentPreview {
  id: string
  assessmentType: PreviewAssessmentType
  title: string
  /** e.g. 0.8 → students need 80% to pass. */
  masteryThreshold: number
  questions: AssessmentPreviewQuestion[]
}

/**
 * All APPROVED mission assessments for a benchmark, keyed by type. Mastery
 * returns EVERY form (students see them round-robin; teachers see all).
 */
export async function getAssessmentPreviewsForBenchmark(
  benchmarkId: string
): Promise<Record<PreviewAssessmentType, AssessmentPreview[]>> {
  const rows = await prisma.assessment.findMany({
    where: {
      benchmarkId,
      approvalStatus: 'APPROVED',
      assessmentType: { in: [...PREVIEW_ASSESSMENT_TYPES] },
    },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      assessmentType: true,
      title: true,
      masteryThreshold: true,
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        select: {
          question: {
            select: {
              prompt: true,
              cognitiveComplexity: true,
              options: {
                orderBy: { id: 'asc' },
                select: { optionText: true, isCorrect: true, feedback: true },
              },
            },
          },
        },
      },
    },
  })

  const byType = Object.fromEntries(
    PREVIEW_ASSESSMENT_TYPES.map((t) => [t, [] as AssessmentPreview[]])
  ) as Record<PreviewAssessmentType, AssessmentPreview[]>

  for (const row of rows) {
    byType[row.assessmentType as PreviewAssessmentType].push({
      id: row.id,
      assessmentType: row.assessmentType as PreviewAssessmentType,
      title: row.title,
      masteryThreshold: row.masteryThreshold,
      questions: row.questions.map((aq) => ({
        prompt: aq.question.prompt,
        cognitiveComplexity: aq.question.cognitiveComplexity,
        options: aq.question.options.map((o) => ({
          text: o.optionText,
          isCorrect: o.isCorrect,
          feedback: o.feedback,
        })),
      })),
    })
  }

  return byType
}
