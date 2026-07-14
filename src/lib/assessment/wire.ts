/**
 * Assessment Wire Contract — shared by client components AND server schemas.
 *
 * This module is client-safe (zod only — no prisma, no server imports).
 * Client components import from '@/lib/assessment/wire' directly, never from
 * the '@/lib/assessment' index (which pulls in server-only modules).
 *
 * Why this exists: three separate client/server contract drifts have shipped
 * (questionId vs id, position, confidenceRating vs confidence) because clients
 * hand-built request bodies. Clients MUST build request bodies through the
 * builder functions below, and tests/unit/assessment/wire-contract.test.ts
 * parses the builders' exact output through the server zod schemas.
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

// ── Assessment submit ─────────────────────────────────────────────────────────

export interface AssessmentSubmitResponseEntry {
  questionId: string
  selectedOptionId: string
  confidence?: ConfidenceValue
  timeSeconds?: number
}

export interface AssessmentSubmitBody {
  attemptId: string
  responses: AssessmentSubmitResponseEntry[]
}

/**
 * Build the POST /api/assessment/[id]/submit body from the player's answers
 * state. The key MUST be `confidence` (numeric) — the server SubmitSchema
 * strips unknown keys, so a misnamed key fails silently (the historical bug).
 */
export function buildAssessmentSubmitBody(
  attemptId: string,
  answers: Record<
    string,
    { optionId: string; confidence: ConfidenceValue | null; timeSeconds?: number }
  >
): AssessmentSubmitBody {
  return {
    attemptId,
    responses: Object.entries(answers).map(([questionId, a]) => ({
      questionId,
      selectedOptionId: a.optionId,
      ...(a.confidence !== null ? { confidence: a.confidence } : {}),
      ...(a.timeSeconds !== undefined ? { timeSeconds: a.timeSeconds } : {}),
    })),
  }
}

// ── Drill review ──────────────────────────────────────────────────────────────

export interface DrillReviewBody {
  questionId: string
  selectedOptionId: string
  confidence: ConfidenceValue
}

/** Build the POST /api/drill/[benchmarkId]/review body (explicit allowlist). */
export function buildDrillReviewBody(args: DrillReviewBody): DrillReviewBody {
  return {
    questionId: args.questionId,
    selectedOptionId: args.selectedOptionId,
    confidence: args.confidence,
  }
}

/** Server-side request schema for the drill review route (lives here so the
 *  contract test can import it — route files can only export handlers). */
export const DrillReviewSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1),
  confidence: ConfidenceValueSchema,
})

/** Response shape of POST /api/drill/[benchmarkId]/review — DrillCard types
 *  against this so field renames surface as type errors on both sides. */
export interface DrillReviewResponse {
  isCorrect: boolean
  quality: number
  newIntervalDays: number
  dueAt: string
  offRampRecovered: boolean
  /** Post-answer learning support (never sent before the answer). */
  correctOptionText: string | null
  selectedFeedback: string | null
}
