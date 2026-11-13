/**
 * Stateless assessment delivery and grading.
 *
 * The server's whole job here: hand out questions without their answers, and
 * grade a set of answers against the answer key. It does not know who is
 * asking, it reads no session, and it WRITES NOTHING — there is no attempt
 * row, no response row, no progress row. Every function in this file performs
 * read-only queries against curriculum tables.
 *
 * Rules that still hold:
 *   #1  Grading is server-side. `isCorrect`, the score and the pass/fail
 *       decision are computed here from the database answer key; nothing of
 *       the kind is accepted from the client.
 *   #2  Answer keys never reach the browser before submission. Delivery
 *       selects option id + text only.
 *   #4  80% mastery threshold (Assessment.masteryThreshold).
 *   #6  Confidence is required on Mastery / Republic Challenge / Final Trial.
 *
 * What statelessness honestly costs: the server cannot count attempts, so it
 * cannot stop someone from submitting the same form twice. Rotating forms and
 * the off-ramp rule are applied on the device.
 */

import { prisma } from '@/lib/db'
import { fetchStimulusForQuestion, type StimulusAttachment, type GlossaryTerm } from '@/lib/reading-load'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { computeCalibrationBreakdown, type CalibrationBreakdown } from '@/lib/metacognition/breakdown'
import { issueReadinessToken, verifyReadinessToken } from '@/lib/completion-codes/readiness-token'
import { issueCompletionCode } from '@/lib/completion-codes/code'
import { gradeResponses, computeScore, type ResponseInput } from './grader'
import { SECURE_ASSESSMENT_TYPES } from './wire'
import { suggestRemediation, type RemediationSuggestion } from '@/lib/remediation/suggest'

export class AssessmentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'CONFIDENCE_REQUIRED'
      | 'INVALID_CONTENT'
      | 'READINESS_REQUIRED'
      | 'INVALID_SUBMISSION'
  ) {
    super(message)
    this.name = 'AssessmentError'
  }
}

export const ASSESSMENT_ERROR_STATUS: Record<AssessmentError['code'], number> = {
  NOT_FOUND: 404,
  CONFIDENCE_REQUIRED: 422,
  INVALID_CONTENT: 422,
  READINESS_REQUIRED: 409,
  INVALID_SUBMISSION: 400,
}

const CONFIDENCE_REQUIRED_TYPES = new Set(['MASTERY_CHALLENGE', 'REPUBLIC_CHALLENGE', 'FINAL_TRIAL'])

/** Reading-load level every student is served. Nobody is profiled into another. */
const STANDARD_READING_LEVEL = 2

// ── Delivery ────────────────────────────────────────────────────────────────

export interface DeliveredOption {
  id: string
  optionText: string
  position: number
}

export interface DeliveredQuestion {
  questionId: string
  prompt: string
  itemType: string
  stimulus: StimulusAttachment | null
  options: DeliveredOption[]
}

export interface DeliveredAssessment {
  assessmentId: string
  title: string
  assessmentType: string
  masteryThreshold: number
  benchmarkCode: string | null
  questions: DeliveredQuestion[]
}

/** Fisher–Yates with Math.random — order carries no meaning; grading is by option id. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * A Mastery Challenge may only be opened with proof that the benchmark's
 * Readiness Check was passed. Benchmarks with no Readiness Check are exempt.
 */
async function assertReadiness(
  assessment: { assessmentType: string; benchmarkId: string | null; benchmark: { code: string } | null },
  readinessToken: string | null | undefined
): Promise<void> {
  if (assessment.assessmentType !== 'MASTERY_CHALLENGE') return
  if (!assessment.benchmarkId || !assessment.benchmark) return
  const readiness = await prisma.assessment.findFirst({
    where: {
      benchmarkId: assessment.benchmarkId,
      assessmentType: 'READINESS_CHECK',
      approvalStatus: 'APPROVED',
    },
    select: { id: true },
  })
  if (!readiness) return
  if (!verifyReadinessToken(readinessToken, assessment.benchmark.code)) {
    throw new AssessmentError(
      'Pass the Readiness Check for this mission before starting the Mastery Challenge',
      'READINESS_REQUIRED'
    )
  }
}

/**
 * Questions for one approved assessment, with NO answer key.
 *
 * The Prisma select below names `id` and `optionText` for options and nothing
 * else — `isCorrect` and `feedback` are never loaded on this path, so they
 * cannot be serialized by accident.
 */
export async function deliverAssessment(
  assessmentId: string,
  opts: { readinessToken?: string | null } = {}
): Promise<DeliveredAssessment> {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, approvalStatus: 'APPROVED' },
    select: {
      id: true,
      title: true,
      assessmentType: true,
      masteryThreshold: true,
      benchmarkId: true,
      benchmark: { select: { code: true } },
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        select: {
          question: {
            select: {
              id: true,
              prompt: true,
              itemType: true,
              benchmarkId: true,
              options: {
                select: { id: true, optionText: true },
                orderBy: { id: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!assessment) {
    throw new AssessmentError(`Assessment ${assessmentId} not found`, 'NOT_FOUND')
  }

  await assertReadiness(assessment, opts.readinessToken)

  const questions = await deliverQuestions(assessment.questions.map((aq) => aq.question))

  return {
    assessmentId: assessment.id,
    title: assessment.title,
    assessmentType: assessment.assessmentType,
    masteryThreshold: assessment.masteryThreshold,
    benchmarkCode: assessment.benchmark?.code ?? null,
    questions,
  }
}

/**
 * Turn loaded questions into the delivered shape: stimulus attached at the
 * standard reading level, options shuffled. The input type has NO `isCorrect`
 * or `feedback` field, so a caller cannot pass the key through by mistake.
 */
export async function deliverQuestions(
  questions: {
    id: string
    prompt: string
    itemType: string
    benchmarkId: string
    options: { id: string; optionText: string }[]
  }[]
): Promise<DeliveredQuestion[]> {
  // Glossary terms once per distinct benchmark, every approved translation attached.
  const benchmarkIds = [...new Set(questions.map((q) => q.benchmarkId))]
  const glossaryByBenchmark = new Map<string, GlossaryTerm[]>(
    await Promise.all(
      benchmarkIds.map(
        async (bid) => [bid, await getGlossaryTermsForBenchmark(bid)] as [string, GlossaryTerm[]]
      )
    )
  )

  return Promise.all(
    questions.map(async (q) => ({
      questionId: q.id,
      prompt: q.prompt,
      itemType: q.itemType,
      stimulus: await fetchStimulusForQuestion(
        q.id,
        STANDARD_READING_LEVEL,
        glossaryByBenchmark.get(q.benchmarkId) ?? []
      ),
      // Authored banks list the correct option first — shuffle at serve time.
      options: shuffled(
        // Rebuilt field by field so nothing beyond id + text can ride along.
        q.options.map((o) => ({ id: o.id, optionText: o.optionText }))
      ).map((o, i) => ({ id: o.id, optionText: o.optionText, position: i + 1 })),
    }))
  )
}

// ── Grading ─────────────────────────────────────────────────────────────────

export interface GradedItem {
  questionId: string
  isCorrect: boolean
  /** Authored explanation for the chosen option — practice-style types only. */
  feedback: string | null
  /** The right answer's text — practice-style types only, never secure ones. */
  correctOptionText: string | null
}

export interface GradeOutcome {
  assessmentId: string
  assessmentType: string
  benchmarkCode: string | null
  score: number
  passed: boolean
  totalQuestions: number
  correctCount: number
  /** Right/wrong per question. Carries no key for secure assessment types. */
  results: GradedItem[]
  calibration: CalibrationBreakdown | null
  /** Topic labels of missed questions (Readiness fail, or any Pre-Check). */
  reviewTopics: string[] | null
  /** Issued when a Readiness Check is passed; opens the Mastery Challenge. */
  readinessToken: string | null
  /** Suggested when a Mastery Challenge is not passed. Curriculum items only. */
  remediation: RemediationSuggestion[]
  /**
   * Signed proof of mastery to paste into Google Classroom. Issued only when a
   * Mastery Challenge is passed. Carries benchmark + score + date, no identity.
   */
  completionCode: string | null
}

export interface GradeInput {
  responses: ResponseInput[]
  readinessToken?: string | null
}

function humanizeSkillTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Grade a submission against the database answer key. Read-only.
 *
 * The denominator is every question in the assessment, so leaving questions
 * out can only lower a score. A response naming a question that is not part of
 * this assessment is rejected outright rather than ignored.
 */
export async function gradeSubmission(
  assessmentId: string,
  input: GradeInput,
  now: Date = new Date()
): Promise<GradeOutcome> {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, approvalStatus: 'APPROVED' },
    select: {
      id: true,
      assessmentType: true,
      masteryThreshold: true,
      benchmarkId: true,
      benchmark: { select: { code: true } },
      questions: {
        select: {
          points: true,
          question: {
            select: {
              id: true,
              readingLoadLevel: true,
              skillTag: true,
              misconceptionId: true,
              options: { select: { id: true, optionText: true, isCorrect: true, feedback: true } },
            },
          },
        },
      },
    },
  })

  if (!assessment) {
    throw new AssessmentError(`Assessment ${assessmentId} not found`, 'NOT_FOUND')
  }

  await assertReadiness(assessment, input.readinessToken)

  const type = assessment.assessmentType
  const questionById = new Map(assessment.questions.map((aq) => [aq.question.id, aq.question]))

  if (type === 'MASTERY_CHALLENGE') {
    const belowLevel2 = assessment.questions.filter((aq) => aq.question.readingLoadLevel < 2)
    if (belowLevel2.length > 0) {
      throw new AssessmentError(
        `Mastery Challenge contains ${belowLevel2.length} question(s) below reading-load level 2.`,
        'INVALID_CONTENT'
      )
    }
  }

  // One answer per question, every one of them part of THIS assessment, and the
  // chosen option must belong to that question.
  const seen = new Set<string>()
  for (const r of input.responses) {
    const question = questionById.get(r.questionId)
    if (!question || seen.has(r.questionId)) {
      throw new AssessmentError('Submission does not match this assessment', 'INVALID_SUBMISSION')
    }
    if (!question.options.some((o) => o.id === r.selectedOptionId)) {
      throw new AssessmentError('Submission does not match this assessment', 'INVALID_SUBMISSION')
    }
    seen.add(r.questionId)
  }

  if (CONFIDENCE_REQUIRED_TYPES.has(type)) {
    if (input.responses.some((r) => r.confidence === undefined || r.confidence === null)) {
      throw new AssessmentError(
        `Confidence rating is required for all responses on a ${type}`,
        'CONFIDENCE_REQUIRED'
      )
    }
  }

  const pointsMap = new Map(assessment.questions.map((aq) => [aq.question.id, aq.points]))
  const correctOptions = new Map<string, string>()
  for (const aq of assessment.questions) {
    const correct = aq.question.options.find((o) => o.isCorrect)
    if (correct) correctOptions.set(aq.question.id, correct.id)
  }

  const grades = gradeResponses(input.responses, correctOptions, pointsMap)
  const { score, passed } = computeScore(grades, pointsMap, assessment.masteryThreshold)

  const secure = SECURE_ASSESSMENT_TYPES.has(type)
  const results: GradedItem[] = grades.map((g) => {
    const question = questionById.get(g.questionId)!
    const selected = question.options.find((o) => o.id === g.selectedOptionId)
    const correct = question.options.find((o) => o.isCorrect)
    return {
      questionId: g.questionId,
      isCorrect: g.isCorrect,
      feedback: secure ? null : (selected?.feedback ?? null),
      correctOptionText: secure ? null : (correct?.optionText ?? null),
    }
  })

  const correctIds = new Set(grades.filter((g) => g.isCorrect).map((g) => g.questionId))
  const missed = assessment.questions.filter((aq) => !correctIds.has(aq.question.id))

  let reviewTopics: string[] | null = null
  if ((type === 'READINESS_CHECK' && !passed) || type === 'PRE_CHECK') {
    if (missed.length > 0) {
      reviewTopics = [
        ...new Set(
          missed
            .map((aq) => aq.question.skillTag)
            .filter(Boolean)
            .map(humanizeSkillTag)
        ),
      ]
    }
  }

  const calibration = CONFIDENCE_REQUIRED_TYPES.has(type) ? computeCalibrationBreakdown(grades) : null

  const benchmarkCode = assessment.benchmark?.code ?? null

  const readinessToken =
    type === 'READINESS_CHECK' && passed && benchmarkCode
      ? issueReadinessToken(benchmarkCode, now)
      : null

  const remediation =
    type === 'MASTERY_CHALLENGE' && !passed && assessment.benchmarkId
      ? await suggestRemediation(
          assessment.benchmarkId,
          grades
            .filter((g) => !g.isCorrect)
            .map((g) => {
              const q = questionById.get(g.questionId)!
              return {
                confidence: g.confidence,
                skillTag: q.skillTag,
                misconceptionId: q.misconceptionId,
              }
            })
        )
      : []

  const completionCode =
    type === 'MASTERY_CHALLENGE' && passed && benchmarkCode
      ? issueCompletionCode({ benchmarkCode, score, now })
      : null

  return {
    assessmentId: assessment.id,
    assessmentType: type,
    benchmarkCode,
    score,
    passed,
    totalQuestions: assessment.questions.length,
    correctCount: correctIds.size,
    results,
    calibration,
    reviewTopics,
    readinessToken,
    remediation,
    completionCode,
  }
}
