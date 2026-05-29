/**
 * Integration Tests: Mission learning loop — Pre-Check & Readiness Check
 * (spec §10.4 steps 1 & 7).
 *
 * Verifies:
 *   - A PRE_CHECK attempt is ungraded for progression: it does NOT create or
 *     change StudentProgress (no mastery side-effects).
 *   - A READINESS_CHECK records pass/fail (used by the mission flow to gate the
 *     Mastery Challenge) and likewise does not mutate mastery status.
 *
 * Depends on the Unit 1 assessment seed (Mission Scout / Training Check rows).
 */

import { PrismaClient } from '@prisma/client'
import { startAttempt, gradeAndSubmit } from '@/lib/assessment'
import { updateProgressAfterAttempt } from '@/lib/mastery'
import type { SubmitInput } from '@/lib/assessment'

const prisma = new PrismaClient()

const CLEVER_ID = 'test-missionloop-student-001'
let studentId: string
let benchmarkId: string
let preCheckId: string
let readinessId: string

async function correctResponses(assessmentId: string): Promise<SubmitInput['responses']> {
  const items = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    select: { question: { select: { id: true, options: { select: { id: true, isCorrect: true } } } } },
  })
  return items.map((it) => ({
    questionId: it.question.id,
    selectedOptionId: it.question.options.find((o) => o.isCorrect)!.id,
  }))
}

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(benchmark).not.toBeNull()
  benchmarkId = benchmark!.id

  const preCheck = await prisma.assessment.findFirst({
    where: { benchmarkId, assessmentType: 'PRE_CHECK' },
    select: { id: true },
  })
  const readiness = await prisma.assessment.findFirst({
    where: { benchmarkId, assessmentType: 'READINESS_CHECK' },
    select: { id: true },
  })
  expect(preCheck).not.toBeNull()
  expect(readiness).not.toBeNull()
  preCheckId = preCheck!.id
  readinessId = readiness!.id

  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: { cleverId: CLEVER_ID, firstName: 'Mission', lastName: 'Loop', role: 'STUDENT', status: 'ACTIVE' },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id
})

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({ where: { attempt: { studentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('Mission Pre-Check is ungraded for progression (§10.4 step 1)', () => {
  it('does not create or change StudentProgress', async () => {
    const { attemptId } = await startAttempt(preCheckId, studentId)
    const responses = await correctResponses(preCheckId)
    await gradeAndSubmit({ attemptId, responses }, studentId)

    const result = await updateProgressAfterAttempt(attemptId, studentId)
    expect(result.newStatus).toBe('IN_PROGRESS')
    expect(result.masteryScore).toBeNull()
    expect(result.nextBenchmarkUnlocked).toBe(false)

    const progress = await prisma.studentProgress.findUnique({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
    })
    expect(progress).toBeNull()
  })
})

describe('Readiness Check records pass without affecting mastery (§10.4 step 7)', () => {
  it('passes on all-correct and leaves mastery status untouched', async () => {
    const { attemptId } = await startAttempt(readinessId, studentId)
    const responses = await correctResponses(readinessId)
    const result = await gradeAndSubmit({ attemptId, responses }, studentId)

    expect(result.passed).toBe(true)
    expect(result.calibration).toBeNull() // readiness check does not require confidence

    const progressResult = await updateProgressAfterAttempt(attemptId, studentId)
    expect(progressResult.newStatus).toBe('IN_PROGRESS')

    const progress = await prisma.studentProgress.findUnique({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
    })
    expect(progress).toBeNull()
  })
})
