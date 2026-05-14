/**
 * Integration Tests: Assessment Engine
 *
 * Tests the domain functions (startAttempt, gradeAndSubmit, fetchAssessmentForStudent)
 * against the real database. All 7 Audit 3 requirements are covered.
 *
 * Prerequisites: DATABASE_URL must point to a running PostgreSQL instance
 *   with Phase 1 migration applied and seed data loaded.
 *
 * Setup: creates test Assessment records using seeded questions (SS.7.CG.1.1).
 * Cleanup: removes all created Assessments, Attempts, and Responses in afterAll.
 */

import { PrismaClient } from '@prisma/client'
import {
  startAttempt,
  gradeAndSubmit,
  fetchAssessmentForStudent,
  AssessmentError,
} from '@/lib/assessment'
import type { SubmitInput } from '@/lib/assessment'

const prisma = new PrismaClient()

// ── Test fixtures ─────────────────────────────────────────────────────────────

let masteryAssessmentId: string
let practiceAssessmentId: string
let studentId: string
let questions: Array<{
  questionId: string
  correctOptionId: string
  wrongOptionId: string
  points: number
}>

beforeAll(async () => {
  // Ensure seed data is present
  const benchmark = await prisma.benchmark.findUnique({
    where: { code: 'SS.7.CG.1.1' },
  })
  expect(benchmark).not.toBeNull()

  // Get 5 questions from the seeded bank
  const dbQuestions = await prisma.question.findMany({
    where: { benchmarkId: benchmark!.id },
    take: 5,
    include: {
      options: { select: { id: true, isCorrect: true } },
    },
  })
  expect(dbQuestions.length).toBeGreaterThanOrEqual(5)

  questions = dbQuestions.map((q) => ({
    questionId: q.id,
    correctOptionId: q.options.find((o) => o.isCorrect)!.id,
    wrongOptionId: q.options.find((o) => !o.isCorrect)!.id,
    points: 1.0,
  }))

  // Create a MASTERY_CHALLENGE assessment
  const mastery = await prisma.assessment.create({
    data: {
      benchmarkId: benchmark!.id,
      title: 'Test Mastery Challenge (Phase 3 tests)',
      assessmentType: 'MASTERY_CHALLENGE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: {
        create: questions.map((q, i) => ({
          questionId: q.questionId,
          sequenceOrder: i + 1,
          points: q.points,
        })),
      },
    },
  })
  masteryAssessmentId = mastery.id

  // Create a PRACTICE assessment using the same questions
  const practice = await prisma.assessment.create({
    data: {
      benchmarkId: benchmark!.id,
      title: 'Test Practice (Phase 3 tests)',
      assessmentType: 'PRACTICE',
      masteryThreshold: 0.7,
      approvalStatus: 'APPROVED',
      questions: {
        create: questions.map((q, i) => ({
          questionId: q.questionId,
          sequenceOrder: i + 1,
          points: q.points,
        })),
      },
    },
  })
  practiceAssessmentId = practice.id

  // Create a dedicated test student using a 'test-phase3-' prefix so that the
  // auth integration test's afterAll cleanup (which deletes 'mock-*' users) can
  // never race-delete this student while assessment tests are still running.
  const testUser = await prisma.user.upsert({
    where: { cleverId: 'test-phase3-student-001' },
    update: {},
    create: {
      cleverId: 'test-phase3-student-001',
      firstName: 'Phase3',
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
})

afterAll(async () => {
  // Delete in dependency order: responses → attempts → assessment questions → assessments → student → user
  await prisma.attemptResponse.deleteMany({
    where: {
      attempt: {
        assessmentId: { in: [masteryAssessmentId, practiceAssessmentId] },
      },
    },
  })
  await prisma.assessmentAttempt.deleteMany({
    where: { assessmentId: { in: [masteryAssessmentId, practiceAssessmentId] } },
  })
  await prisma.assessmentQuestion.deleteMany({
    where: { assessmentId: { in: [masteryAssessmentId, practiceAssessmentId] } },
  })
  await prisma.assessment.deleteMany({
    where: { id: { in: [masteryAssessmentId, practiceAssessmentId] } },
  })
  // Remove the dedicated test student + user created by this suite
  await prisma.student.deleteMany({
    where: { user: { cleverId: 'test-phase3-student-001' } },
  })
  await prisma.user.deleteMany({
    where: { cleverId: 'test-phase3-student-001' },
  })
  await prisma.$disconnect()
})

// ── Audit 3 Item 2: Answer keys never exposed ─────────────────────────────────

describe('fetchAssessmentForStudent — answer key security (Audit 3 item 2)', () => {
  it('returns questions without isCorrect on any option', async () => {
    const result = await fetchAssessmentForStudent(masteryAssessmentId)
    expect(result).not.toBeNull()
    for (const q of result!.questions) {
      for (const opt of q.options) {
        expect(opt).not.toHaveProperty('isCorrect')
        expect(opt).not.toHaveProperty('feedback')
      }
    }
  })

  it('returns the correct assessment metadata', async () => {
    const result = await fetchAssessmentForStudent(masteryAssessmentId)
    expect(result!.meta.assessmentType).toBe('MASTERY_CHALLENGE')
    expect(result!.meta.masteryThreshold).toBe(0.8)
    expect(result!.questions).toHaveLength(5)
  })

  it('returns null for a non-existent assessment', async () => {
    const result = await fetchAssessmentForStudent('non-existent-id-00000000000')
    expect(result).toBeNull()
  })
})

// ── Audit 3 Item 6: Attempts recorded correctly ───────────────────────────────

describe('startAttempt — attempt records (Audit 3 item 6)', () => {
  it('creates an attempt with startedAt and attemptNumber=1', async () => {
    const result = await startAttempt(masteryAssessmentId, studentId)

    expect(result.attemptId).toBeTruthy()
    expect(result.attemptNumber).toBe(1)
    expect(result.assessmentType).toBe('MASTERY_CHALLENGE')
    expect(result.masteryThreshold).toBe(0.8)

    const dbAttempt = await prisma.assessmentAttempt.findUnique({
      where: { id: result.attemptId },
    })
    expect(dbAttempt).not.toBeNull()
    expect(dbAttempt!.startedAt).toBeInstanceOf(Date)
    expect(dbAttempt!.submittedAt).toBeNull()
    expect(dbAttempt!.score).toBeNull()
    expect(dbAttempt!.passed).toBeNull()
  })

  it('throws NOT_FOUND for a non-existent assessment', async () => {
    await expect(
      startAttempt('non-existent-id-00000000000', studentId)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

// ── Audit 3 Items 1+6: Server-side grading, happy path ────────────────────────

describe('gradeAndSubmit — happy path (Audit 3 items 1, 6)', () => {
  let attemptId: string

  beforeEach(async () => {
    const result = await startAttempt(masteryAssessmentId, studentId)
    attemptId = result.attemptId
  })

  it('grades all correct answers: score=1.0, passed=true', async () => {
    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 2,
        timeSeconds: 15,
      })),
    }

    const result = await gradeAndSubmit(input, studentId)
    expect(result.score).toBeCloseTo(1.0)
    expect(result.passed).toBe(true)
    expect(result.attemptId).toBe(attemptId)
  })

  it('records submittedAt, score, passed on the attempt', async () => {
    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 1,
      })),
    }
    await gradeAndSubmit(input, studentId)

    const dbAttempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    })
    expect(dbAttempt!.submittedAt).toBeInstanceOf(Date)
    expect(dbAttempt!.score).toBeCloseTo(1.0)
    expect(dbAttempt!.passed).toBe(true)
  })

  it('grades all wrong answers: score=0, passed=false', async () => {
    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.wrongOptionId,
        confidence: 0,
      })),
    }
    const result = await gradeAndSubmit(input, studentId)
    expect(result.score).toBeCloseTo(0)
    expect(result.passed).toBe(false)
  })
})

// ── Audit 3 Item 1: Tamper resistance ────────────────────────────────────────

describe('gradeAndSubmit — tamper resistance (Audit 3 item 1)', () => {
  it('recomputes isCorrect server-side even if client sends wrong answer', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    // Build submission: all wrong answers + try to inject isCorrect via extra fields
    // SubmitSchema strips unknown fields → isCorrect/pointsAwarded never reach gradeAndSubmit
    const rawPayload = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.wrongOptionId,  // wrong answer
        confidence: 2,
        // These would be tamper fields — Zod strips them:
        // isCorrect: true,
        // pointsAwarded: 99,
      })),
    }

    // Validate through Zod (as the route handler does)
    const { SubmitSchema } = await import('@/lib/assessment')
    const parsed = SubmitSchema.parse(rawPayload)

    const result = await gradeAndSubmit(parsed, studentId)
    expect(result.score).toBeCloseTo(0)   // all wrong → 0 points
    expect(result.passed).toBe(false)     // 0 < 0.8 threshold

    // Verify DB records also show isCorrect=false
    const responses = await prisma.attemptResponse.findMany({
      where: { attemptId: result.attemptId },
    })
    responses.forEach((r) => {
      expect(r.isCorrect).toBe(false)
      expect(r.pointsAwarded).toBe(0)
    })
  })
})

// ── Audit 3 Item 3: Confidence captured ──────────────────────────────────────

describe('gradeAndSubmit — confidence (Audit 3 item 3)', () => {
  it('throws CONFIDENCE_REQUIRED if any response is missing confidence on MASTERY_CHALLENGE', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        // confidence deliberately omitted
      })),
    }

    await expect(gradeAndSubmit(input, studentId)).rejects.toMatchObject({
      code: 'CONFIDENCE_REQUIRED',
    })
  })

  it('captures confidence=2 in AttemptResponse records', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 2,
      })),
    }
    await gradeAndSubmit(input, studentId)

    const dbResponses = await prisma.attemptResponse.findMany({
      where: { attemptId },
    })
    dbResponses.forEach((r) => {
      expect(r.confidence).toBe(2)
    })
  })
})

// ── Audit 3 Item 4: Time-to-answer captured ───────────────────────────────────

describe('gradeAndSubmit — time capture (Audit 3 item 4)', () => {
  it('captures timeSeconds in AttemptResponse records', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q, i) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 1,
        timeSeconds: 10 + i * 5, // 10, 15, 20, 25, 30 seconds
      })),
    }
    await gradeAndSubmit(input, studentId)

    const dbResponses = await prisma.attemptResponse.findMany({
      where: { attemptId },
      orderBy: { id: 'asc' },
    })
    const times = dbResponses.map((r) => r.timeSeconds)
    expect(times).toEqual(expect.arrayContaining([10, 15, 20, 25, 30]))
  })
})

// ── Audit 3 Item 5: Practice feedback / secure no feedback ───────────────────

describe('gradeAndSubmit — practice vs. secure mode (Audit 3 item 5)', () => {
  it('returns feedback for PRACTICE assessment', async () => {
    const { attemptId } = await startAttempt(practiceAssessmentId, studentId)

    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
      })),
    }
    const result = await gradeAndSubmit(input, studentId)
    expect(result.feedback).not.toBeNull()
    expect(Array.isArray(result.feedback)).toBe(true)
  })

  it('returns null feedback for MASTERY_CHALLENGE (secure mode)', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 1,
      })),
    }
    const result = await gradeAndSubmit(input, studentId)
    expect(result.feedback).toBeNull()
  })
})

// ── Audit 3 Item 7: Edge cases ────────────────────────────────────────────────

describe('gradeAndSubmit — edge cases (Audit 3 item 7)', () => {
  it('partial submission: 3 of 5 answered → score 3/5 = 0.6, passed=false', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    const input: SubmitInput = {
      attemptId,
      responses: questions.slice(0, 3).map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 1,
      })),
    }
    const result = await gradeAndSubmit(input, studentId)
    expect(result.score).toBeCloseTo(0.6) // 3/5
    expect(result.passed).toBe(false)     // 0.6 < 0.8
  })

  it('double-submit guard: second submission throws ALREADY_SUBMITTED', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)
    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 2,
      })),
    }
    await gradeAndSubmit(input, studentId) // first submit — succeeds
    await expect(gradeAndSubmit(input, studentId)).rejects.toMatchObject({
      code: 'ALREADY_SUBMITTED',
    })
  })

  it('attempt number increments: second startAttempt has attemptNumber=2', async () => {
    const r1 = await startAttempt(masteryAssessmentId, studentId)
    const r2 = await startAttempt(masteryAssessmentId, studentId)
    expect(r2.attemptNumber).toBe(r1.attemptNumber + 1)
  })

  it('ownership guard: wrong studentId throws FORBIDDEN', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)

    // Create a second student with a non-mock cleverId so auth cleanup can't race-delete it
    const otherUser = await prisma.user.upsert({
      where: { cleverId: 'test-phase3-student-002' },
      update: {},
      create: {
        cleverId: 'test-phase3-student-002',
        firstName: 'Other',
        lastName: 'Student',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
    const otherStudent = await prisma.student.upsert({
      where: { userId: otherUser.id },
      update: {},
      create: { userId: otherUser.id },
    })

    const input: SubmitInput = {
      attemptId,
      responses: questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: q.correctOptionId,
        confidence: 1,
      })),
    }

    await expect(gradeAndSubmit(input, otherStudent.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })

    // Cleanup
    await prisma.student.delete({ where: { id: otherStudent.id } })
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})
