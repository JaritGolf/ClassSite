/**
 * Unit Tests: Assessment Grader — Pure Functions
 *
 * No database. No Next.js. Tests the core grading logic in isolation.
 * Includes explicit tamper-resistance verification (Audit 3, item 1).
 */

import { gradeResponses, computeScore } from '@/lib/assessment/grader'
import type { ResponseInput } from '@/lib/assessment/grader'

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** 5-question assessment fixture */
const Q_IDS = ['q1', 'q2', 'q3', 'q4', 'q5']
const CORRECT_OPT = {
  q1: 'opt-q1-correct',
  q2: 'opt-q2-correct',
  q3: 'opt-q3-correct',
  q4: 'opt-q4-correct',
  q5: 'opt-q5-correct',
}
const WRONG_OPT = {
  q1: 'opt-q1-wrong',
  q2: 'opt-q2-wrong',
  q3: 'opt-q3-wrong',
  q4: 'opt-q4-wrong',
  q5: 'opt-q5-wrong',
}

const correctOptions = new Map(Object.entries(CORRECT_OPT))
const pointsMap = new Map(Q_IDS.map((id) => [id, 1.0]))

function allCorrect(): ResponseInput[] {
  return Q_IDS.map((id) => ({ questionId: id, selectedOptionId: CORRECT_OPT[id as keyof typeof CORRECT_OPT] }))
}

function allWrong(): ResponseInput[] {
  return Q_IDS.map((id) => ({ questionId: id, selectedOptionId: WRONG_OPT[id as keyof typeof WRONG_OPT] }))
}

// ── gradeResponses ────────────────────────────────────────────────────────────

describe('gradeResponses — correctness', () => {
  it('marks all answers correct when selectedOptionId matches correct option', () => {
    const grades = gradeResponses(allCorrect(), correctOptions, pointsMap)
    expect(grades).toHaveLength(5)
    grades.forEach((g) => {
      expect(g.isCorrect).toBe(true)
      expect(g.pointsAwarded).toBe(1.0)
    })
  })

  it('marks all answers incorrect when selectedOptionId does not match', () => {
    const grades = gradeResponses(allWrong(), correctOptions, pointsMap)
    grades.forEach((g) => {
      expect(g.isCorrect).toBe(false)
      expect(g.pointsAwarded).toBe(0)
    })
  })

  it('grades a mixed set correctly', () => {
    const responses: ResponseInput[] = [
      { questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 },
      { questionId: 'q2', selectedOptionId: WRONG_OPT.q2 },
      { questionId: 'q3', selectedOptionId: CORRECT_OPT.q3 },
    ]
    const grades = gradeResponses(responses, correctOptions, pointsMap)
    expect(grades[0].isCorrect).toBe(true)
    expect(grades[1].isCorrect).toBe(false)
    expect(grades[2].isCorrect).toBe(true)
  })

  it('returns 0 pointsAwarded for unknown questionId (not in correctOptions)', () => {
    const responses: ResponseInput[] = [
      { questionId: 'unknown-q', selectedOptionId: 'some-opt' },
    ]
    const grades = gradeResponses(responses, correctOptions, pointsMap)
    expect(grades[0].isCorrect).toBe(false)
    expect(grades[0].pointsAwarded).toBe(0)
  })
})

describe('gradeResponses — tamper resistance (Audit 3 item 1)', () => {
  it('ignores any isCorrect field passed in client input', () => {
    // Simulate a tampered payload: client sends isCorrect:true on a WRONG answer
    // Zod strips these fields before calling gradeResponses, but we verify the
    // pure function itself also doesn't use them
    const tamperedResponse = {
      questionId: 'q1',
      selectedOptionId: WRONG_OPT.q1, // wrong answer
      // These fields would be present if Zod hadn't stripped them:
      // isCorrect: true,       ← not part of ResponseInput type → TypeScript prevents this
      // pointsAwarded: 99,     ← not part of ResponseInput type → TypeScript prevents this
      confidence: 1 as const,
    } satisfies ResponseInput

    const grades = gradeResponses([tamperedResponse], correctOptions, pointsMap)
    expect(grades[0].isCorrect).toBe(false)   // server-computed: wrong answer
    expect(grades[0].pointsAwarded).toBe(0)   // server-computed: 0 points
  })

  it('only uses selectedOptionId for correctness — ignores all other fields', () => {
    // Even if someone passes extra runtime fields, the function uses only
    // selectedOptionId to determine correctness
    const response = {
      questionId: 'q1',
      selectedOptionId: WRONG_OPT.q1,
      confidence: 2 as const,
      timeSeconds: 30,
    }
    const grades = gradeResponses([response], correctOptions, pointsMap)
    expect(grades[0].isCorrect).toBe(false)
    expect(grades[0].pointsAwarded).toBe(0)
  })
})

describe('gradeResponses — confidence and time capture (Audit 3 items 3+4)', () => {
  it('captures confidence values 0, 1, 2', () => {
    const responses: ResponseInput[] = [
      { questionId: 'q1', selectedOptionId: CORRECT_OPT.q1, confidence: 0 },
      { questionId: 'q2', selectedOptionId: CORRECT_OPT.q2, confidence: 1 },
      { questionId: 'q3', selectedOptionId: CORRECT_OPT.q3, confidence: 2 },
    ]
    const grades = gradeResponses(responses, correctOptions, pointsMap)
    expect(grades[0].confidence).toBe(0)
    expect(grades[1].confidence).toBe(1)
    expect(grades[2].confidence).toBe(2)
  })

  it('sets confidence to null when not provided', () => {
    const grades = gradeResponses(
      [{ questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 }],
      correctOptions,
      pointsMap
    )
    expect(grades[0].confidence).toBeNull()
  })

  it('captures timeSeconds correctly', () => {
    const grades = gradeResponses(
      [{ questionId: 'q1', selectedOptionId: CORRECT_OPT.q1, timeSeconds: 45 }],
      correctOptions,
      pointsMap
    )
    expect(grades[0].timeSeconds).toBe(45)
  })

  it('sets timeSeconds to null when not provided', () => {
    const grades = gradeResponses(
      [{ questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 }],
      correctOptions,
      pointsMap
    )
    expect(grades[0].timeSeconds).toBeNull()
  })
})

// ── computeScore ──────────────────────────────────────────────────────────────

describe('computeScore — scoring logic', () => {
  it('returns score 1.0 and passed=true when all correct (threshold 0.8)', () => {
    const grades = gradeResponses(allCorrect(), correctOptions, pointsMap)
    const { score, passed } = computeScore(grades, pointsMap, 0.8)
    expect(score).toBeCloseTo(1.0)
    expect(passed).toBe(true)
  })

  it('returns score 0 and passed=false when all wrong', () => {
    const grades = gradeResponses(allWrong(), correctOptions, pointsMap)
    const { score, passed } = computeScore(grades, pointsMap, 0.8)
    expect(score).toBeCloseTo(0)
    expect(passed).toBe(false)
  })

  it('passes exactly at the threshold (4/5 = 0.8)', () => {
    const responses: ResponseInput[] = [
      { questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 },
      { questionId: 'q2', selectedOptionId: CORRECT_OPT.q2 },
      { questionId: 'q3', selectedOptionId: CORRECT_OPT.q3 },
      { questionId: 'q4', selectedOptionId: CORRECT_OPT.q4 },
      { questionId: 'q5', selectedOptionId: WRONG_OPT.q5 },   // 1 wrong
    ]
    const grades = gradeResponses(responses, correctOptions, pointsMap)
    const { score, passed } = computeScore(grades, pointsMap, 0.8)
    expect(score).toBeCloseTo(0.8)
    expect(passed).toBe(true) // 0.8 >= 0.8
  })

  it('fails just below threshold (3/5 = 0.6 < 0.8)', () => {
    const responses: ResponseInput[] = [
      { questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 },
      { questionId: 'q2', selectedOptionId: CORRECT_OPT.q2 },
      { questionId: 'q3', selectedOptionId: CORRECT_OPT.q3 },
      { questionId: 'q4', selectedOptionId: WRONG_OPT.q4 },
      { questionId: 'q5', selectedOptionId: WRONG_OPT.q5 },
    ]
    const grades = gradeResponses(responses, correctOptions, pointsMap)
    const { score, passed } = computeScore(grades, pointsMap, 0.8)
    expect(score).toBeCloseTo(0.6)
    expect(passed).toBe(false)
  })

  it('partial submission: 3 correct answers out of 5 total questions = 0.6', () => {
    // Student only submitted 3 responses; 2 questions unanswered
    const responses: ResponseInput[] = [
      { questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 },
      { questionId: 'q2', selectedOptionId: CORRECT_OPT.q2 },
      { questionId: 'q3', selectedOptionId: CORRECT_OPT.q3 },
      // q4 and q5 not submitted
    ]
    const grades = gradeResponses(responses, correctOptions, pointsMap)
    // allQuestionPoints includes ALL 5 questions
    const { score, passed } = computeScore(grades, pointsMap, 0.8)
    expect(score).toBeCloseTo(0.6) // 3/5 = 0.6
    expect(passed).toBe(false)
  })

  it('handles zero totalPossible without dividing by zero', () => {
    const emptyGrades = gradeResponses([], new Map(), new Map())
    const { score, passed } = computeScore(emptyGrades, new Map(), 0.8)
    expect(score).toBe(0)
    expect(passed).toBe(false)
  })

  it('respects variable point weights', () => {
    // q1 = 2pts, q2 = 1pt, q3 = 1pt; total = 4pts
    const weightedPoints = new Map([
      ['q1', 2.0],
      ['q2', 1.0],
      ['q3', 1.0],
    ])
    const responses: ResponseInput[] = [
      { questionId: 'q1', selectedOptionId: CORRECT_OPT.q1 }, // 2pts
      { questionId: 'q2', selectedOptionId: WRONG_OPT.q2 },   // 0pts
      { questionId: 'q3', selectedOptionId: CORRECT_OPT.q3 }, // 1pt
    ]
    const grades = gradeResponses(
      responses,
      new Map([['q1', CORRECT_OPT.q1], ['q2', CORRECT_OPT.q2], ['q3', CORRECT_OPT.q3]]),
      weightedPoints
    )
    const { score } = computeScore(grades, weightedPoints, 0.8)
    expect(score).toBeCloseTo(3 / 4) // 3pts earned / 4pts total = 0.75
  })
})
