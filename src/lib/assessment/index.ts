/**
 * Assessment Module — Public API
 *
 * Import everything assessment-related from here.
 * Internal modules (grader, question-fetcher, attempt) are not imported directly
 * by route handlers — they go through this index.
 */

import { z } from 'zod'

// ── Zod Request Schemas ───────────────────────────────────────────────────────

/**
 * Submit request schema.
 *
 * Security: Zod strips unknown fields by default.
 * Any `isCorrect`, `pointsAwarded`, or other tamper fields in the client
 * payload are silently dropped before gradeResponses() is called.
 */
export const SubmitSchema = z.object({
  attemptId: z.string().cuid('attemptId must be a valid cuid'),
  responses: z
    .array(
      z.object({
        questionId: z.string().cuid('questionId must be a valid cuid'),
        selectedOptionId: z.string().cuid('selectedOptionId must be a valid cuid'),
        // Confidence: 0 = "Not sure", 1 = "Pretty sure", 2 = "Very sure"
        // Required for MASTERY_CHALLENGE — enforced in attempt.ts gradeAndSubmit()
        confidence: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
        timeSeconds: z.number().int().min(0).max(7200).optional(),
        // Note: isCorrect, pointsAwarded, and any other fields are NOT in this schema.
        // Zod strips them automatically — tamper-safe by design.
      })
    )
    .min(0), // allow empty array for edge cases (zero-response partial submission)
})

export type SubmitInput = z.infer<typeof SubmitSchema>

// ── Public Re-exports ─────────────────────────────────────────────────────────

export { startAttempt, gradeAndSubmit, AssessmentError } from './attempt'
export type { StartAttemptResult, SubmitResult, FeedbackItem } from './attempt'

export { fetchAssessmentForStudent } from './question-fetcher'
export type { SafeQuestion, SafeOption, AssessmentMeta } from './question-fetcher'

export { gradeResponses, computeScore } from './grader'
export type { ResponseInput, GradeResult } from './grader'
