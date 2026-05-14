/**
 * Integration Tests: Adaptive Difficulty Engine
 *
 * Tests submitPracticeAnswer, getNextItem, and initSession against the real DB.
 * Covers all 5 Audit 6 requirements.
 *
 * Prerequisites: DATABASE_URL must point to a running PostgreSQL instance
 *   with Phase 1 migration applied and seed data loaded.
 *
 * Setup: creates a PRACTICE assessment from seeded SS.7.CG.1.1 questions.
 * Questions have 3 LOW, 9 MODERATE, 3 HIGH complexity items.
 */

import { PrismaClient } from '@prisma/client'
import { startAttempt } from '@/lib/assessment'
import {
  initSession,
  getSessionState,
  submitPracticeAnswer,
  getNextItem,
} from '@/lib/adaptive-difficulty'

const prisma = new PrismaClient()

// ── Fixtures ───────────────────────────────────────────────────────────────

let practiceAssessmentId: string
let masteryAssessmentId: string
let studentId: string

type QFixture = {
  questionId: string
  correctOptionId: string
  wrongOptionId: string
  complexity: string
}

let lowQuestions: QFixture[]
let moderateQuestions: QFixture[]
let highQuestions: QFixture[]
let benchmarkId: string

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  const bm = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(bm).not.toBeNull()
  benchmarkId = bm!.id

  // Load all seeded questions grouped by complexity
  const dbQ = await prisma.question.findMany({
    where: { benchmarkId, approvalStatus: 'APPROVED' },
    include: { options: { select: { id: true, isCorrect: true } } },
  })

  const toFixture = (q: typeof dbQ[0]): QFixture => ({
    questionId: q.id,
    correctOptionId: q.options.find((o) => o.isCorrect)!.id,
    wrongOptionId: q.options.find((o) => !o.isCorrect)!.id,
    complexity: q.cognitiveComplexity,
  })

  lowQuestions = dbQ.filter((q) => q.cognitiveComplexity === 'LOW').map(toFixture)
  moderateQuestions = dbQ.filter((q) => q.cognitiveComplexity === 'MODERATE').map(toFixture)
  highQuestions = dbQ.filter((q) => q.cognitiveComplexity === 'HIGH').map(toFixture)

  expect(lowQuestions.length).toBeGreaterThanOrEqual(3)
  expect(moderateQuestions.length).toBeGreaterThanOrEqual(3)
  expect(highQuestions.length).toBeGreaterThanOrEqual(1)

  // Create PRACTICE assessment with all 15 questions
  const allQ = [...lowQuestions, ...moderateQuestions, ...highQuestions]
  const practice = await prisma.assessment.create({
    data: {
      benchmarkId,
      title: 'Phase 6 Adaptive Practice Test',
      assessmentType: 'PRACTICE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: {
        create: allQ.map((q, i) => ({
          questionId: q.questionId,
          sequenceOrder: i + 1,
          points: 1.0,
        })),
      },
    },
  })
  practiceAssessmentId = practice.id

  // Create MASTERY_CHALLENGE assessment (fixed-form)
  const mastery = await prisma.assessment.create({
    data: {
      benchmarkId,
      title: 'Phase 6 Mastery (fixed-form) Test',
      assessmentType: 'MASTERY_CHALLENGE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: {
        create: allQ.slice(0, 5).map((q, i) => ({
          questionId: q.questionId,
          sequenceOrder: i + 1,
          points: 1.0,
        })),
      },
    },
  })
  masteryAssessmentId = mastery.id

  // Create test student (test-phase6- prefix avoids auth cleanup)
  const user = await prisma.user.upsert({
    where: { cleverId: 'test-phase6-student-001' },
    update: {},
    create: {
      cleverId: 'test-phase6-student-001',
      firstName: 'Phase6',
      lastName: 'TestStudent',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const s = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = s.id
})

afterAll(async () => {
  const assessmentIds = [practiceAssessmentId, masteryAssessmentId].filter(Boolean)

  await prisma.adaptiveSessionState.deleteMany({
    where: { attempt: { assessmentId: { in: assessmentIds } } },
  })
  await prisma.studentRemediation.deleteMany({
    where: { studentId },
  })
  await prisma.attemptResponse.deleteMany({
    where: { attempt: { assessmentId: { in: assessmentIds } } },
  })
  await prisma.assessmentAttempt.deleteMany({
    where: { assessmentId: { in: assessmentIds } },
  })
  await prisma.assessmentQuestion.deleteMany({
    where: { assessmentId: { in: assessmentIds } },
  })
  await prisma.assessment.deleteMany({
    where: { id: { in: assessmentIds } },
  })
  await prisma.student.deleteMany({
    where: { user: { cleverId: { startsWith: 'test-phase6-' } } },
  })
  await prisma.user.deleteMany({
    where: { cleverId: { startsWith: 'test-phase6-' } },
  })
  await prisma.$disconnect()
})

// Helper: fresh practice attempt
async function freshAttempt(): Promise<string> {
  const r = await startAttempt(practiceAssessmentId, studentId)
  return r.attemptId
}

// Helper: submit N correct LOW answers to bump complexity
async function submitNCorrect(attemptId: string, questions: QFixture[], n: number) {
  for (let i = 0; i < n; i++) {
    await submitPracticeAnswer(
      attemptId,
      questions[i].questionId,
      questions[i].correctOptionId,
      studentId,
      2
    )
  }
}

// Helper: submit N incorrect answers
async function submitNIncorrect(attemptId: string, questions: QFixture[], n: number) {
  for (let i = 0; i < n; i++) {
    await submitPracticeAnswer(
      attemptId,
      questions[i].questionId,
      questions[i].wrongOptionId,
      studentId,
      0
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit 6 Item 1 — 3 consecutive correct → complexity bump up
// ─────────────────────────────────────────────────────────────────────────────

describe('Audit 6 item 1 — 3 consecutive correct bumps complexity up', () => {
  it('starts at LOW complexity after initSession', async () => {
    const attemptId = await freshAttempt()
    const state = await initSession(attemptId)
    expect(state).not.toBeNull()
    expect(state!.currentComplexity).toBe('LOW')
    expect(state!.consecutiveCorrect).toBe(0)
  })

  it('after 2 correct answers, complexity is still LOW', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    await submitNCorrect(attemptId, lowQuestions, 2)

    const state = await getSessionState(attemptId)
    expect(state!.currentComplexity).toBe('LOW')
    expect(state!.consecutiveCorrect).toBe(2)
  })

  it('after 3 correct answers, complexity bumps to MODERATE', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    const lastResult = await (async () => {
      await submitNCorrect(attemptId, lowQuestions, 2)
      return submitPracticeAnswer(
        attemptId, lowQuestions[2].questionId, lowQuestions[2].correctOptionId, studentId, 2
      )
    })()

    expect(lastResult.newComplexity).toBe('MODERATE')
    expect(lastResult.nextAction).toBe('NEXT_QUESTION')

    const state = await getSessionState(attemptId)
    expect(state!.currentComplexity).toBe('MODERATE')
    expect(state!.consecutiveCorrect).toBe(0) // reset
  })

  it('getNextItem returns a MODERATE question after complexity bumps to MODERATE', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)
    await submitNCorrect(attemptId, lowQuestions, 3)

    const next = await getNextItem(attemptId, studentId)
    expect(next.type).toBe('QUESTION')
    if (next.type === 'QUESTION') {
      expect(next.question.cognitiveComplexity).toBe('MODERATE')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit 6 Item 2 — 3 consecutive incorrect → complexity bump down + worked example
// ─────────────────────────────────────────────────────────────────────────────

describe('Audit 6 item 2 — 3 consecutive incorrect bumps down + worked example', () => {
  it('after 2 incorrect at MODERATE, no worked example yet', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    // First bump to MODERATE
    await submitNCorrect(attemptId, lowQuestions, 3)
    // Now submit 2 incorrect at MODERATE
    await submitNIncorrect(attemptId, moderateQuestions, 2)

    const state = await getSessionState(attemptId)
    expect(state!.pendingWorkedExample).toBe(false)
    expect(state!.currentComplexity).toBe('MODERATE')
    expect(state!.consecutiveIncorrect).toBe(2)
  })

  it('after 3 incorrect at MODERATE, pendingWorkedExample=true, complexity drops to LOW', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    // Bump to MODERATE first
    await submitNCorrect(attemptId, lowQuestions, 3)

    // Submit 3 incorrect at MODERATE
    const lastResult = await (async () => {
      await submitNIncorrect(attemptId, moderateQuestions, 2)
      return submitPracticeAnswer(
        attemptId, moderateQuestions[2].questionId, moderateQuestions[2].wrongOptionId, studentId, 0
      )
    })()

    expect(lastResult.nextAction).toBe('WORKED_EXAMPLE')
    expect(lastResult.newComplexity).toBe('LOW') // bumped down

    const state = await getSessionState(attemptId)
    expect(state!.pendingWorkedExample).toBe(true)
    expect(state!.currentComplexity).toBe('LOW')
    expect(state!.consecutiveIncorrect).toBe(0) // reset
    expect(state!.workedExampleQuestionId).not.toBeNull()
  })

  it('getNextItem returns WORKED_EXAMPLE payload when pendingWorkedExample=true', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    // Trigger worked example (3 incorrect from LOW)
    await submitNIncorrect(attemptId, lowQuestions, 3)

    const next = await getNextItem(attemptId, studentId)
    expect(next.type).toBe('WORKED_EXAMPLE')
    if (next.type === 'WORKED_EXAMPLE') {
      expect(next.question).toBeDefined()
      expect(next.correctOptionId).toBeTruthy()
      // options must NOT have isCorrect
      for (const opt of next.question.options) {
        expect(opt).not.toHaveProperty('isCorrect')
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit 6 Item 3 — After worked example, near-transfer item at same complexity
// ─────────────────────────────────────────────────────────────────────────────

describe('Audit 6 item 3 — near-transfer item after worked example', () => {
  it('after getNextItem delivers WORKED_EXAMPLE, state transitions to pendingNearTransfer', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    // Trigger worked example
    await submitNIncorrect(attemptId, lowQuestions, 3)

    // Consume the worked example via getNextItem
    const next = await getNextItem(attemptId, studentId)
    expect(next.type).toBe('WORKED_EXAMPLE')

    // State should now be pendingNearTransfer=true
    const state = await getSessionState(attemptId)
    expect(state!.pendingNearTransfer).toBe(true)
    expect(state!.pendingWorkedExample).toBe(false)
  })

  it('getNextItem returns NEAR_TRANSFER after worked example acknowledged', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    await submitNIncorrect(attemptId, lowQuestions, 3)
    // Consume worked example (transitions to pendingNearTransfer)
    await getNextItem(attemptId, studentId)

    // Next call should return NEAR_TRANSFER
    const next = await getNextItem(attemptId, studentId)
    expect(next.type).toBe('NEAR_TRANSFER')
    if (next.type === 'NEAR_TRANSFER') {
      // Near-transfer is at the (bumped-down) current complexity
      expect(next.question).toBeDefined()
      expect(next.question.options.length).toBeGreaterThan(0)
      for (const opt of next.question.options) {
        expect(opt).not.toHaveProperty('isCorrect')
      }
    }
  })

  it('correct near-transfer answer → nextAction=NEXT_QUESTION, state resets', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    // Trigger worked example via 3 incorrect at LOW
    await submitNIncorrect(attemptId, lowQuestions, 3)
    // Consume worked example
    await getNextItem(attemptId, studentId)

    // Submit a correct near-transfer answer
    // Pick a question we haven't used yet
    const nearTransferQ = lowQuestions.find(
      (q) => ![lowQuestions[0], lowQuestions[1], lowQuestions[2]].includes(q)
    ) ?? moderateQuestions[0]

    const result = await submitPracticeAnswer(
      attemptId,
      nearTransferQ.questionId,
      nearTransferQ.correctOptionId,
      studentId,
      1
    )

    expect(result.isCorrect).toBe(true)
    expect(result.nextAction).toBe('NEXT_QUESTION')

    const state = await getSessionState(attemptId)
    expect(state!.pendingNearTransfer).toBe(false)
    expect(state!.pendingWorkedExample).toBe(false)
  })

  it('incorrect near-transfer answer → nextAction=REMEDIATION_ESCALATED', async () => {
    const attemptId = await freshAttempt()
    await initSession(attemptId)

    await submitNIncorrect(attemptId, lowQuestions, 3)
    await getNextItem(attemptId, studentId) // consume worked example

    // Submit a wrong near-transfer answer using a question not already seen
    const nearTransferQ = moderateQuestions[0]

    const result = await submitPracticeAnswer(
      attemptId,
      nearTransferQ.questionId,
      nearTransferQ.wrongOptionId,
      studentId,
      0
    )

    expect(result.isCorrect).toBe(false)
    expect(result.nextAction).toBe('REMEDIATION_ESCALATED')

    const state = await getSessionState(attemptId)
    expect(state!.pendingNearTransfer).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit 6 Item 4 — Mastery Challenges remain fixed-form (no AdaptiveSessionState)
// ─────────────────────────────────────────────────────────────────────────────

describe('Audit 6 item 4 — Mastery Challenges are fixed-form', () => {
  it('initSession returns null for a MASTERY_CHALLENGE attempt', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)
    const state = await initSession(attemptId)
    expect(state).toBeNull()
  })

  it('no AdaptiveSessionState row is created for a MASTERY_CHALLENGE attempt', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)
    await initSession(attemptId) // should be no-op

    const row = await prisma.adaptiveSessionState.findUnique({
      where: { attemptId },
    })
    expect(row).toBeNull()
  })

  it('getSessionState returns null for a MASTERY_CHALLENGE attempt', async () => {
    const { attemptId } = await startAttempt(masteryAssessmentId, studentId)
    const state = await getSessionState(attemptId)
    expect(state).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit 6 Item 5 — Session state resets between sessions
// ─────────────────────────────────────────────────────────────────────────────

describe('Audit 6 item 5 — session state resets between sessions', () => {
  it('a new attempt starts with fresh state at LOW / 0 counters', async () => {
    // First session: get to MODERATE complexity
    const attempt1Id = await freshAttempt()
    await initSession(attempt1Id)
    await submitNCorrect(attempt1Id, lowQuestions, 3) // bump to MODERATE

    const state1 = await getSessionState(attempt1Id)
    expect(state1!.currentComplexity).toBe('MODERATE')

    // Second session: should start fresh
    const attempt2Id = await freshAttempt()
    const state2 = await initSession(attempt2Id)

    expect(state2).not.toBeNull()
    expect(state2!.currentComplexity).toBe('LOW')
    expect(state2!.consecutiveCorrect).toBe(0)
    expect(state2!.consecutiveIncorrect).toBe(0)
    expect(state2!.pendingWorkedExample).toBe(false)
    expect(state2!.pendingNearTransfer).toBe(false)
  })

  it('state from session 1 does not bleed into session 2', async () => {
    // Session 1: trigger a worked example
    const attempt1Id = await freshAttempt()
    await initSession(attempt1Id)
    await submitNIncorrect(attempt1Id, lowQuestions, 3)

    const state1 = await getSessionState(attempt1Id)
    expect(state1!.pendingWorkedExample).toBe(true)

    // Session 2: completely independent state
    const attempt2Id = await freshAttempt()
    await initSession(attempt2Id)
    const state2 = await getSessionState(attempt2Id)

    expect(state2!.pendingWorkedExample).toBe(false)
    expect(state2!.workedExampleQuestionId).toBeNull()
  })
})
