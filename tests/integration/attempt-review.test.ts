/**
 * Integration tests: getAttemptReviewsForStudent (mastered-mission revisit).
 *
 * Verifies the answer-key-safe review surface a student sees when revisiting
 * a mastered mission: past attempts, per-question correct/incorrect against
 * their OWN answer — with the correct answer, option isCorrect flags, and
 * option feedback text NEVER present anywhere in the returned shape.
 */

import { PrismaClient } from '@prisma/client'
import { startAttempt, gradeAndSubmit, getAttemptReviewsForStudent } from '@/lib/assessment'
import type { SubmitInput } from '@/lib/assessment'
import { passReadinessCheck } from '../helpers/readiness'

const prisma = new PrismaClient()

let benchmarkId: string
let formAId: string
let formBId: string
let studentId: string
let questions: Array<{ questionId: string; correctOptionId: string; wrongOptionId: string }>

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(benchmark).not.toBeNull()
  benchmarkId = benchmark!.id

  const dbQuestions = await prisma.question.findMany({
    where: { benchmarkId, readingLoadLevel: { gte: 2 } },
    take: 5,
    include: { options: { select: { id: true, isCorrect: true } } },
  })
  expect(dbQuestions.length).toBeGreaterThanOrEqual(5)

  questions = dbQuestions.map((q) => ({
    questionId: q.id,
    correctOptionId: q.options.find((o) => o.isCorrect)!.id,
    wrongOptionId: q.options.find((o) => !o.isCorrect)!.id,
  }))

  const questionCreate = questions.map((q, i) => ({ questionId: q.questionId, sequenceOrder: i + 1, points: 1.0 }))

  const formA = await prisma.assessment.create({
    data: {
      benchmarkId,
      title: 'Test Mastery Challenge — Form A (attempt-review tests)',
      assessmentType: 'MASTERY_CHALLENGE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: { create: questionCreate },
    },
  })
  formAId = formA.id

  const formB = await prisma.assessment.create({
    data: {
      benchmarkId,
      title: 'Test Mastery Challenge — Form B (attempt-review tests)',
      assessmentType: 'MASTERY_CHALLENGE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: { create: questionCreate },
    },
  })
  formBId = formB.id

  const testUser = await prisma.user.upsert({
    where: { cleverId: 'test-attempt-review-student-001' },
    update: {},
    create: {
      cleverId: 'test-attempt-review-student-001',
      firstName: 'AttemptReview',
      lastName: 'TestStudent',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const testStudent = await prisma.student.upsert({
    where: { userId: testUser.id },
    update: {},
    create: { userId: testUser.id },
  })
  studentId = testStudent.id

  await passReadinessCheck(prisma, studentId, benchmarkId)

  // Attempt 1 (Form A): all wrong — fail.
  const attempt1 = await startAttempt(formAId, studentId)
  const failInput: SubmitInput = {
    attemptId: attempt1.attemptId,
    responses: questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.wrongOptionId,
      confidence: 0,
    })),
  }
  await gradeAndSubmit(failInput, studentId)

  // Attempt 2 (Form B): all correct — pass.
  const attempt2 = await startAttempt(formBId, studentId)
  const passInput: SubmitInput = {
    attemptId: attempt2.attemptId,
    responses: questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.correctOptionId,
      confidence: 2,
    })),
  }
  await gradeAndSubmit(passInput, studentId)
})

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({
    where: { attempt: { assessmentId: { in: [formAId, formBId] } } },
  })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId: { in: [formAId, formBId] } } })
  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: { in: [formAId, formBId] } } })
  await prisma.assessment.deleteMany({ where: { id: { in: [formAId, formBId] } } })
  await prisma.confidenceCalibrationSnapshot.deleteMany({
    where: { student: { user: { cleverId: 'test-attempt-review-student-001' } } },
  })
  // passReadinessCheck's own attempt lives on the seeded readiness assessment.
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: 'test-attempt-review-student-001' } } })
  await prisma.user.deleteMany({ where: { cleverId: 'test-attempt-review-student-001' } })
  await prisma.$disconnect()
})

describe('getAttemptReviewsForStudent', () => {
  it('returns both attempts across both forms, in order, with correct pass/fail', async () => {
    const reviews = await getAttemptReviewsForStudent({
      studentId,
      benchmarkId,
      assessmentType: 'MASTERY_CHALLENGE',
    })

    expect(reviews).toHaveLength(2)
    expect(reviews[0].attemptNumber).toBeLessThan(reviews[1].attemptNumber)
    expect(reviews[0].passed).toBe(false)
    expect(reviews[0].score).toBeCloseTo(0)
    expect(reviews[1].passed).toBe(true)
    expect(reviews[1].score).toBeCloseTo(1.0)
  })

  it('marks each response correct/incorrect against the student\'s own answer', async () => {
    const reviews = await getAttemptReviewsForStudent({
      studentId,
      benchmarkId,
      assessmentType: 'MASTERY_CHALLENGE',
    })

    for (const r of reviews[0].responses) expect(r.isCorrect).toBe(false)
    for (const r of reviews[1].responses) expect(r.isCorrect).toBe(true)

    expect(reviews[0].responses).toHaveLength(questions.length)
    for (const r of reviews[0].responses) {
      expect(typeof r.prompt).toBe('string')
      expect(r.prompt.length).toBeGreaterThan(0)
      expect(typeof r.selectedOptionText).toBe('string')
    }
  })

  it('never exposes the answer key: no isCorrect/feedback on any option, no correct-option field', async () => {
    const reviews = await getAttemptReviewsForStudent({
      studentId,
      benchmarkId,
      assessmentType: 'MASTERY_CHALLENGE',
    })

    const serialized = JSON.stringify(reviews)
    // The correct answer text itself must never appear for the failed attempt
    // (every response there was wrong, so if the correct text leaked in it
    // would show up as an extra field, not as selectedOptionText).
    for (const attempt of reviews) {
      for (const response of attempt.responses) {
        expect(response).not.toHaveProperty('isCorrectOption')
        expect(response).not.toHaveProperty('correctOptionText')
        expect(response).not.toHaveProperty('feedback')
        expect(response).not.toHaveProperty('optionIsCorrect')
      }
    }
    expect(serialized).not.toMatch(/"feedback"/)
  })

  it('returns an empty array for an assessment type never attempted', async () => {
    const reviews = await getAttemptReviewsForStudent({
      studentId,
      benchmarkId,
      assessmentType: 'PRE_CHECK',
    })
    expect(reviews).toEqual([])
  })
})
