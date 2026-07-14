/**
 * Wire-contract test — client payload builders ↔ server zod schemas.
 *
 * Guards against the client/server contract drift class of bug that has now
 * shipped three times (questionId vs id, option position, and
 * confidenceRating-string vs confidence-number). The failure mode is SILENT:
 * zod strips unknown keys, so a misnamed field doesn't fail parsing — it just
 * vanishes, and the server then rejects the request downstream
 * (CONFIDENCE_REQUIRED) or grades without the data.
 *
 * Therefore these tests assert not only that the builders' exact output
 * parses, but that the parsed result STILL CONTAINS the fields.
 */

import { z } from 'zod'
import { SubmitSchema } from '@/lib/assessment'
import {
  buildAssessmentSubmitBody,
  buildDrillReviewBody,
  DrillReviewSchema,
  CONFIDENCE_LEVELS,
  type ConfidenceValue,
} from '@/lib/assessment/wire'

// Valid cuids for schema fields that require them.
const ATTEMPT_ID = 'clzzzzzzz0000attempt0000001'
const QUESTION_ID = 'clzzzzzzz0000question000001'
const OPTION_ID = 'clzzzzzzz0000option00000001'

describe('assessment submit wire contract', () => {
  it('builder output parses through SubmitSchema and confidence SURVIVES parsing', () => {
    const body = buildAssessmentSubmitBody(ATTEMPT_ID, {
      [QUESTION_ID]: { optionId: OPTION_ID, confidence: 2 },
    })

    const parsed = SubmitSchema.parse(body)
    expect(parsed.attemptId).toBe(ATTEMPT_ID)
    expect(parsed.responses).toHaveLength(1)
    expect(parsed.responses[0].questionId).toBe(QUESTION_ID)
    expect(parsed.responses[0].selectedOptionId).toBe(OPTION_ID)
    // The assertion that would have caught the confidenceRating bug:
    expect(parsed.responses[0].confidence).toBe(2)
  })

  it('every CONFIDENCE_LEVELS value survives parsing', () => {
    for (const level of CONFIDENCE_LEVELS) {
      const body = buildAssessmentSubmitBody(ATTEMPT_ID, {
        [QUESTION_ID]: { optionId: OPTION_ID, confidence: level.value },
      })
      const parsed = SubmitSchema.parse(body)
      expect(parsed.responses[0].confidence).toBe(level.value)
    }
  })

  it('null confidence (practice assessments) omits the key and still parses', () => {
    const body = buildAssessmentSubmitBody(ATTEMPT_ID, {
      [QUESTION_ID]: { optionId: OPTION_ID, confidence: null },
    })
    const parsed = SubmitSchema.parse(body)
    expect(parsed.responses[0].confidence).toBeUndefined()
    // The key must be absent, not null — zod would reject an explicit null.
    expect('confidence' in body.responses[0]).toBe(false)
  })

  it('timeSeconds passes through when provided', () => {
    const body = buildAssessmentSubmitBody(ATTEMPT_ID, {
      [QUESTION_ID]: { optionId: OPTION_ID, confidence: 1, timeSeconds: 42 },
    })
    const parsed = SubmitSchema.parse(body)
    expect(parsed.responses[0].timeSeconds).toBe(42)
  })

  it('REGRESSION: a confidenceRating-keyed payload is silently stripped (the old bug)', () => {
    // Documents the historical failure mode: this body PARSES fine but the
    // confidence is gone, which then trips CONFIDENCE_REQUIRED server-side.
    const legacyBody = {
      attemptId: ATTEMPT_ID,
      responses: [
        { questionId: QUESTION_ID, selectedOptionId: OPTION_ID, confidenceRating: 'VERY_SURE' },
      ],
    }
    const parsed = SubmitSchema.parse(legacyBody)
    expect(parsed.responses[0].confidence).toBeUndefined()
  })

  it('compile-time: builder output is assignable to the schema inference', () => {
    // Drift between the builder type and the schema type = tsc error here.
    const body: z.infer<typeof SubmitSchema> = buildAssessmentSubmitBody(ATTEMPT_ID, {
      [QUESTION_ID]: { optionId: OPTION_ID, confidence: 0 },
    })
    expect(body).toBeDefined()
  })
})

describe('drill review wire contract', () => {
  it('builder output parses through DrillReviewSchema for every confidence level', () => {
    for (const level of CONFIDENCE_LEVELS) {
      const body = buildDrillReviewBody({
        questionId: QUESTION_ID,
        selectedOptionId: OPTION_ID,
        confidence: level.value,
      })
      const parsed = DrillReviewSchema.parse(body)
      expect(parsed.confidence).toBe(level.value)
      expect(parsed.questionId).toBe(QUESTION_ID)
      expect(parsed.selectedOptionId).toBe(OPTION_ID)
    }
  })

  it('REGRESSION: string confidence is rejected (the old drill 400 bug)', () => {
    const legacyBody = {
      questionId: QUESTION_ID,
      selectedOptionId: OPTION_ID,
      confidenceRating: 'NOT_SURE',
    }
    expect(DrillReviewSchema.safeParse(legacyBody).success).toBe(false)
  })

  it('builder allowlists fields — extras cannot ride along', () => {
    const withExtra = {
      questionId: QUESTION_ID,
      selectedOptionId: OPTION_ID,
      confidence: 1 as ConfidenceValue,
      isCorrect: true,
    }
    const body = buildDrillReviewBody(withExtra)
    expect('isCorrect' in body).toBe(false)
  })
})

describe('CONFIDENCE_LEVELS canonical mapping', () => {
  it('maps 0=NOT_SURE, 1=PRETTY_SURE, 2=VERY_SURE (SM-2 computeQuality contract)', () => {
    expect(CONFIDENCE_LEVELS.map((l) => [l.value, l.key])).toEqual([
      [0, 'NOT_SURE'],
      [1, 'PRETTY_SURE'],
      [2, 'VERY_SURE'],
    ])
  })
})
