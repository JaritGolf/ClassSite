/**
 * Reading-Load Question Filter & Stimulus Attachment
 *
 * Provides DB-backed helpers to:
 *   - Fetch stimulus content (with variant selection) for a question
 *   - Apply reading-load filters to question sets
 *
 * Spec reference: Section 16
 */

import { prisma } from '@/lib/db'
import {
  selectVariantContent,
  buildGlossaryAnnotations,
  type GlossaryTerm,
  type GlossaryAnnotation,
} from './variant-selector'

// ── Types ──────────────────────────────────────────────────────────────────

export interface StimulusAttachment {
  stimulusId: string
  stimulusTitle: string
  resolvedContent: string
  resolvedLevel: number
  fromVariant: boolean
  glossaryAnnotations: GlossaryAnnotation[]
}

// ── fetchStimulusForQuestion ───────────────────────────────────────────────

/**
 * Load and select the correct stimulus content variant for a question.
 *
 * Returns null if the question has no stimulus.
 *
 * @param questionId     - The Question.id to look up
 * @param effectiveLevel - The student's effective reading-load level
 * @param glossaryTerms  - Terms for annotation (benchmark-scoped)
 */
export async function fetchStimulusForQuestion(
  questionId: string,
  effectiveLevel: number,
  glossaryTerms: GlossaryTerm[]
): Promise<StimulusAttachment | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { stimulusId: true },
  })

  if (!question?.stimulusId) return null

  const stimulus = await prisma.stimulus.findUnique({
    where: { id: question.stimulusId },
    select: {
      id: true,
      title: true,
      content: true,
      readingLoadLevel: true,
      variants: {
        select: {
          readingLoadLevel: true,
          content: true,
          approvalStatus: true,
        },
      },
    },
  })

  if (!stimulus) return null

  const selection = selectVariantContent(stimulus, effectiveLevel)
  const annotations = buildGlossaryAnnotations(
    selection.content,
    glossaryTerms,
    selection.resolvedLevel
  )

  return {
    stimulusId: stimulus.id,
    stimulusTitle: stimulus.title,
    resolvedContent: selection.content,
    resolvedLevel: selection.resolvedLevel,
    fromVariant: selection.fromVariant,
    glossaryAnnotations: annotations,
  }
}

// Re-export pure filter function so consumers import from one place
export { filterQuestionsForMastery } from './variant-selector'
export type { QuestionWithLevel } from './variant-selector'
