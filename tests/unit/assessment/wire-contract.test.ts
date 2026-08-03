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
  buildIntegrityReportBody,
  DrillReviewSchema,
  IntegrityReportSchema,
  CONFIDENCE_LEVELS,
  MAX_EVENTS_PER_REPORT,
  MAX_REPORTED_DURATION_MS,
  SECURE_ASSESSMENT_TYPES,
  isSecureAssessmentType,
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

describe('integrity report wire contract', () => {
  it("the builder's exact output parses, and the events SURVIVE parsing", () => {
    const body = buildIntegrityReportBody(ATTEMPT_ID, [
      { eventType: 'VISIBILITY_HIDDEN', durationMs: 4200 },
      { eventType: 'COPY_BLOCKED' },
    ])
    const parsed = IntegrityReportSchema.safeParse(body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.attemptId).toBe(ATTEMPT_ID)
    expect(parsed.data.events).toHaveLength(2)
    expect(parsed.data.events[0]).toEqual({
      eventType: 'VISIBILITY_HIDDEN',
      durationMs: 4200,
    })
    // Instantaneous events carry no duration and must not gain a bogus 0.
    expect(parsed.data.events[1].durationMs).toBeUndefined()
  })

  it('carries NO timestamp field — the server clock is the only clock', () => {
    const body = buildIntegrityReportBody(ATTEMPT_ID, [{ eventType: 'BLUR' }])
    expect(JSON.stringify(body)).not.toMatch(/recordedAt|timestamp|occurredAt/i)
    // And the schema would strip one anyway.
    const withTimestamp = {
      ...body,
      events: [{ eventType: 'BLUR', recordedAt: '1999-01-01T00:00:00.000Z' }],
    }
    const parsed = IntegrityReportSchema.safeParse(withTimestamp)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect('recordedAt' in parsed.data.events[0]).toBe(false)
    }
  })

  it('clamps an absurd client-reported duration instead of storing it', () => {
    const body = buildIntegrityReportBody(ATTEMPT_ID, [
      { eventType: 'BLUR', durationMs: MAX_REPORTED_DURATION_MS * 100 },
    ])
    expect(body.events[0].durationMs).toBe(MAX_REPORTED_DURATION_MS)
    expect(IntegrityReportSchema.safeParse(body).success).toBe(true)
  })

  it('drops a non-positive duration rather than sending it', () => {
    const body = buildIntegrityReportBody(ATTEMPT_ID, [
      { eventType: 'BLUR', durationMs: -1 },
    ])
    expect(body.events[0].durationMs).toBeUndefined()
    expect(IntegrityReportSchema.safeParse(body).success).toBe(true)
  })

  it('truncates an over-long batch to what the schema accepts', () => {
    const many = Array.from({ length: MAX_EVENTS_PER_REPORT + 25 }, () => ({
      eventType: 'BLUR' as const,
    }))
    const body = buildIntegrityReportBody(ATTEMPT_ID, many)
    expect(body.events).toHaveLength(MAX_EVENTS_PER_REPORT)
    expect(IntegrityReportSchema.safeParse(body).success).toBe(true)
  })

  it('rejects an unknown event type', () => {
    const parsed = IntegrityReportSchema.safeParse({
      attemptId: ATTEMPT_ID,
      events: [{ eventType: 'SCREENSHOT_TAKEN' }],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects an empty batch', () => {
    expect(
      IntegrityReportSchema.safeParse({ attemptId: ATTEMPT_ID, events: [] }).success
    ).toBe(false)
  })
})

describe('SECURE_ASSESSMENT_TYPES single source of truth', () => {
  it('covers exactly the six types whose feedback is withheld', () => {
    expect([...SECURE_ASSESSMENT_TYPES].sort()).toEqual([
      'DIAGNOSTIC',
      'FINAL_TRIAL',
      'MASTERY_CHALLENGE',
      'READINESS_CHECK',
      'REASSESSMENT',
      'REPUBLIC_CHALLENGE',
    ])
  })

  it('does NOT include PRACTICE — practice returns feedback by design', () => {
    expect(isSecureAssessmentType('PRACTICE')).toBe(false)
    expect(isSecureAssessmentType('MASTERY_CHALLENGE')).toBe(true)
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
