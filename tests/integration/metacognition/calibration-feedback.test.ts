/**
 * Integration Tests: Calibration feedback + snapshot writer (spec §17.4, §17.6)
 *
 * Verifies that submitting a confidence-required assessment (1) returns a
 * per-confidence-level calibration breakdown to the student, and (2) persists
 * ConfidenceCalibrationSnapshot rows (overall + per-benchmark) that the teacher
 * dashboards read.
 *
 * Prerequisites: DATABASE_URL points to a running PostgreSQL with seed data.
 */

import { PrismaClient } from '@prisma/client'
import { startAttempt, gradeAndSubmit } from '@/lib/assessment'
import type { SubmitInput } from '@/lib/assessment'
import { passReadinessCheck } from '../../helpers/readiness'

const prisma = new PrismaClient()

const CLEVER_ID = 'test-metacog-student-001'
let assessmentId: string
let studentId: string
let benchmarkCode: string
let questions: Array<{ questionId: string; correctOptionId: string; wrongOptionId: string }>

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(benchmark).not.toBeNull()
  benchmarkCode = benchmark!.code

  const dbQuestions = await prisma.question.findMany({
    where: { benchmarkId: benchmark!.id, readingLoadLevel: { gte: 2 } },
    take: 4,
    include: { options: { select: { id: true, isCorrect: true } } },
  })
  expect(dbQuestions.length).toBeGreaterThanOrEqual(4)

  questions = dbQuestions.map((q) => ({
    questionId: q.id,
    correctOptionId: q.options.find((o) => o.isCorrect)!.id,
    wrongOptionId: q.options.find((o) => !o.isCorrect)!.id,
  }))

  const assessment = await prisma.assessment.create({
    data: {
      benchmarkId: benchmark!.id,
      title: 'Test Mastery (metacognition tests)',
      assessmentType: 'MASTERY_CHALLENGE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: {
        create: questions.map((q, i) => ({ questionId: q.questionId, sequenceOrder: i + 1, points: 1.0 })),
      },
    },
  })
  assessmentId = assessment.id

  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: { cleverId: CLEVER_ID, firstName: 'Metacog', lastName: 'TestStudent', role: 'STUDENT', status: 'ACTIVE' },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id

  // Satisfy the server-side readiness→mastery gate for the seeded benchmark.
  await passReadinessCheck(prisma, studentId, benchmark!.id)
})

afterAll(async () => {
  await prisma.confidenceCalibrationSnapshot.deleteMany({ where: { studentId } })
  await prisma.attemptResponse.deleteMany({ where: { attempt: { assessmentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  // The passReadinessCheck helper attempt lives on the SEEDED readiness
  // assessment — sweep this student's remaining attempts too.
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('calibration feedback on Mastery Challenge submit (§17.4)', () => {
  it('returns a per-confidence breakdown and writes overall + per-benchmark snapshots', async () => {
    const { attemptId } = await startAttempt(assessmentId, studentId)

    // q0: very sure + correct ; q1: very sure + wrong ; q2: not sure + correct ; q3: pretty sure + wrong
    const responses: SubmitInput['responses'] = [
      { questionId: questions[0].questionId, selectedOptionId: questions[0].correctOptionId, confidence: 2 },
      { questionId: questions[1].questionId, selectedOptionId: questions[1].wrongOptionId, confidence: 2 },
      { questionId: questions[2].questionId, selectedOptionId: questions[2].correctOptionId, confidence: 0 },
      { questionId: questions[3].questionId, selectedOptionId: questions[3].wrongOptionId, confidence: 1 },
    ]

    const result = await gradeAndSubmit({ attemptId, responses }, studentId)

    expect(result.calibration).not.toBeNull()
    expect(result.calibration!.high).toEqual({ correct: 1, incorrect: 1 })
    expect(result.calibration!.medium).toEqual({ correct: 0, incorrect: 1 })
    expect(result.calibration!.low).toEqual({ correct: 1, incorrect: 0 })

    const overall = await prisma.confidenceCalibrationSnapshot.findFirst({
      where: { studentId, scope: 'overall' },
      orderBy: { snapshotAt: 'desc' },
    })
    expect(overall).not.toBeNull()
    expect(overall!.highConfidenceCorrect).toBe(1)
    expect(overall!.highConfidenceIncorrect).toBe(1)
    expect(overall!.lowConfidenceCorrect).toBe(1)

    const perBenchmark = await prisma.confidenceCalibrationSnapshot.findFirst({
      where: { studentId, scope: `benchmark:${benchmarkCode}` },
    })
    expect(perBenchmark).not.toBeNull()
  })
})
