/**
 * Assessment Wire Contract — shared by client components AND server schemas.
 *
 * This module is client-safe (zod only — no prisma, no server imports).
 * Client components import from '@/lib/assessment/wire' directly, never from
 * the '@/lib/assessment' index (which pulls in server-only modules).
 *
 * Why this exists: client/server contract drift has shipped more than once
 * because clients hand-built request bodies. Clients MUST build request bodies
 * through the builder functions below, and tests/unit/assessment/
 * wire-contract.test.ts parses the builders' exact output through the server
 * zod schemas.
 *
 * NOTHING in these request bodies identifies a student. There is no attempt
 * id, no student id, no name and no device id — only question ids, the chosen
 * option, a confidence rating and (for a Mastery Challenge) the signed
 * readiness token. A guard test asserts the schemas stay that way.
 */

import { z } from 'zod'

// ── Confidence ────────────────────────────────────────────────────────────────

/** Wire value for the 3-level confidence scale (spec §17). */
export type ConfidenceValue = 0 | 1 | 2

/**
 * Canonical mapping — matches computeQuality (src/lib/spaced-retrieval/sm2.ts)
 * and computeCalibrationBreakdown (src/lib/metacognition/breakdown.ts):
 * 0 = "Not sure", 1 = "Pretty sure", 2 = "Very sure".
 */
export const CONFIDENCE_LEVELS: readonly {
  value: ConfidenceValue
  key: 'NOT_SURE' | 'PRETTY_SURE' | 'VERY_SURE'
  label: string
  emoji: string
}[] = [
  { value: 0, key: 'NOT_SURE', label: 'Not sure', emoji: '🤔' },
  { value: 1, key: 'PRETTY_SURE', label: 'Pretty sure', emoji: '🙂' },
  { value: 2, key: 'VERY_SURE', label: 'Very sure', emoji: '😎' },
]

export const ConfidenceValueSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])

// ── Secure assessment types ───────────────────────────────────────────────────

/**
 * Assessment types whose answer key and per-option feedback are never returned,
 * even after submission. Shared so the server and the player agree.
 */
export const SECURE_ASSESSMENT_TYPES: ReadonlySet<string> = new Set([
  'MASTERY_CHALLENGE',
  'REASSESSMENT',
  'REPUBLIC_CHALLENGE',
  'FINAL_TRIAL',
  'READINESS_CHECK',
  'DIAGNOSTIC',
])

export function isSecureAssessmentType(assessmentType: string): boolean {
  return SECURE_ASSESSMENT_TYPES.has(assessmentType)
}

const Id = z.string().min(1).max(60)
const ReadinessToken = z.string().min(1).max(120)

// ── Assessment start ──────────────────────────────────────────────────────────

export interface AssessmentStartBody {
  readinessToken?: string
}

export function buildAssessmentStartBody(readinessToken?: string | null): AssessmentStartBody {
  return readinessToken ? { readinessToken } : {}
}

export const AssessmentStartSchema = z.object({
  readinessToken: ReadinessToken.optional(),
})

// ── Assessment submit ─────────────────────────────────────────────────────────

export interface AssessmentSubmitResponseEntry {
  questionId: string
  selectedOptionId: string
  confidence?: ConfidenceValue
}

export interface AssessmentSubmitBody {
  responses: AssessmentSubmitResponseEntry[]
  readinessToken?: string
}

/**
 * Build the POST /api/assessment/[id]/submit body from the player's answers.
 * The key MUST be `confidence` (numeric) — the server schema strips unknown
 * keys, so a misnamed key fails silently (the historical bug).
 */
export function buildAssessmentSubmitBody(
  answers: Record<string, { optionId: string; confidence: ConfidenceValue | null }>,
  readinessToken?: string | null
): AssessmentSubmitBody {
  return {
    responses: Object.entries(answers).map(([questionId, a]) => ({
      questionId,
      selectedOptionId: a.optionId,
      ...(a.confidence !== null ? { confidence: a.confidence } : {}),
    })),
    ...(readinessToken ? { readinessToken } : {}),
  }
}

/**
 * Server-side submit schema. Zod strips unknown fields, so `isCorrect`,
 * `pointsAwarded` or anything else a tampered client adds never reaches the
 * grader — and neither would a name.
 */
export const AssessmentSubmitSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: Id,
        selectedOptionId: Id,
        confidence: ConfidenceValueSchema.optional(),
      })
    )
    .max(200),
  readinessToken: ReadinessToken.optional(),
})

/** What POST /api/assessment/[id]/submit returns. */
export interface AssessmentSubmitResult {
  assessmentType: string
  benchmarkCode: string | null
  score: number
  passed: boolean
  totalQuestions: number
  correctCount: number
  results: {
    questionId: string
    isCorrect: boolean
    feedback: string | null
    correctOptionText: string | null
  }[]
  calibration: {
    high: { correct: number; incorrect: number }
    medium: { correct: number; incorrect: number }
    low: { correct: number; incorrect: number }
  } | null
  reviewTopics: string[] | null
  readinessToken: string | null
  remediation: { itemId: string; title: string; remediationType: string }[]
  /** Signed completion code — present only when a Mastery Challenge is passed. */
  completionCode: string | null
}

// ── Single-question answer (practice, drill, challenge) ───────────────────────

export interface QuestionAnswerBody {
  questionId: string
  selectedOptionId: string
}

export function buildQuestionAnswerBody(args: QuestionAnswerBody): QuestionAnswerBody {
  return { questionId: args.questionId, selectedOptionId: args.selectedOptionId }
}

export const QuestionAnswerSchema = z.object({
  questionId: Id,
  selectedOptionId: Id,
})

/** What a single-question grading route returns. */
export interface QuestionAnswerResult {
  isCorrect: boolean
  /** Post-answer learning support (never sent before the answer). */
  correctOptionText: string | null
  selectedFeedback: string | null
}
