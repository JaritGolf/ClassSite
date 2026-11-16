/**
 * Wire contract — the bodies the client builders produce must parse through
 * the server schemas with every field intact, and the schemas must have no
 * room for anything that identifies a student.
 */

import {
  AssessmentStartSchema,
  AssessmentSubmitSchema,
  QuestionAnswerSchema,
  buildAssessmentStartBody,
  buildAssessmentSubmitBody,
  buildQuestionAnswerBody,
  CONFIDENCE_LEVELS,
} from '@/lib/assessment/wire'

describe('assessment submit', () => {
  const answers = {
    q1: { optionId: 'o1', confidence: 0 as const },
    q2: { optionId: 'o2', confidence: 2 as const },
    q3: { optionId: 'o3', confidence: null },
  }

  it('builder output parses, and confidence SURVIVES parsing (incl. 0 = "Not sure")', () => {
    const parsed = AssessmentSubmitSchema.parse(buildAssessmentSubmitBody(answers, 'R1~X~20260914~SIG'))
    expect(parsed.responses).toEqual([
      { questionId: 'q1', selectedOptionId: 'o1', confidence: 0 },
      { questionId: 'q2', selectedOptionId: 'o2', confidence: 2 },
      { questionId: 'q3', selectedOptionId: 'o3' },
    ])
    expect(parsed.readinessToken).toBe('R1~X~20260914~SIG')
  })

  it('strips tamper fields and anything identifying', () => {
    const parsed = AssessmentSubmitSchema.parse({
      responses: [{ questionId: 'q1', selectedOptionId: 'o1', isCorrect: true, pointsAwarded: 5 }],
      studentName: 'Alex',
      studentId: 's1',
      attemptId: 'a1',
      score: 1,
    })
    expect(parsed).toEqual({ responses: [{ questionId: 'q1', selectedOptionId: 'o1' }] })
  })

  it('rejects the old string confidence values', () => {
    expect(
      AssessmentSubmitSchema.safeParse({
        responses: [{ questionId: 'q', selectedOptionId: 'o', confidence: 'VERY_SURE' }],
      }).success
    ).toBe(false)
  })

  it('the schemas accept exactly the documented keys — no identity field exists', () => {
    expect(Object.keys(AssessmentSubmitSchema.shape).sort()).toEqual(['readinessToken', 'responses'])
    expect(Object.keys(AssessmentSubmitSchema.shape.responses.element.shape).sort()).toEqual([
      'confidence',
      'questionId',
      'selectedOptionId',
    ])
    expect(Object.keys(AssessmentStartSchema.shape)).toEqual(['readinessToken'])
    expect(Object.keys(QuestionAnswerSchema.shape).sort()).toEqual(['questionId', 'selectedOptionId'])
  })
})

describe('assessment start + single answer', () => {
  it('start body is empty without a token and carries it when present', () => {
    expect(AssessmentStartSchema.parse(buildAssessmentStartBody(null))).toEqual({})
    expect(AssessmentStartSchema.parse(buildAssessmentStartBody('tok'))).toEqual({ readinessToken: 'tok' })
  })

  it('single-answer builder output parses unchanged', () => {
    const body = buildQuestionAnswerBody({ questionId: 'q', selectedOptionId: 'o' })
    expect(QuestionAnswerSchema.parse(body)).toEqual(body)
  })
})

describe('confidence scale', () => {
  it('is the three-level 0/1/2 scale (rule #6)', () => {
    expect(CONFIDENCE_LEVELS.map((c) => [c.value, c.label])).toEqual([
      [0, 'Not sure'],
      [1, 'Pretty sure'],
      [2, 'Very sure'],
    ])
  })
})
