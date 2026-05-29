/**
 * Audit 11 — Item 5: Confidence ratings are required on all challenge items.
 *
 * Starts a Republic Challenge attempt, submits without confidence on at
 * least one response, and verifies gradeAndSubmit throws CONFIDENCE_REQUIRED.
 *
 * Prefix: test-audit11-05-
 */

import { PrismaClient } from '@prisma/client'
import { createRepublicChallengeSession } from '@/lib/republic-challenge'
import {
  fetchAssessmentForStudent,
  gradeAndSubmit,
  startAttempt,
  AssessmentError,
} from '@/lib/assessment'

const prisma = new PrismaClient()

let studentId: string
let studentUserId: string

beforeAll(async () => {
  const u = await prisma.user.upsert({
    where: { cleverId: 'test-audit11-05-s1' },
    create: {
      cleverId: 'test-audit11-05-s1',
      firstName: 'Audit11',
      lastName: '05',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
    update: {},
  })
  studentUserId = u.id
  const s = await prisma.student.upsert({
    where: { userId: u.id },
    update: {},
    create: { userId: u.id },
  })
  studentId = s.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: studentUserId },
        { metadataJson: { path: ['studentId'], equals: studentId } },
      ],
    },
  })
  await prisma.attemptResponse.deleteMany({ where: { attempt: { studentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
  const ephemeral = await prisma.assessment.findMany({
    where: { benchmarkId: null, mode: { not: null } },
    select: { id: true },
  })
  if (ephemeral.length > 0) {
    const ids = ephemeral.map((a) => a.id)
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: { in: ids } } })
    await prisma.assessment.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.confidenceCalibrationSnapshot.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({
    where: { user: { cleverId: { startsWith: 'test-audit11-05-' } } },
  })
  await prisma.user.deleteMany({
    where: { cleverId: { startsWith: 'test-audit11-05-' } },
  })
  await prisma.$disconnect()
})

describe('Audit 11 item 5 — confidence required on Republic Challenge', () => {
  it('submission without confidence throws CONFIDENCE_REQUIRED', async () => {
    const session = await createRepublicChallengeSession({
      studentId,
      mode: 'MIXED_MISSION',
      length: 3,
      actorUserId: studentUserId,
    })
    const { attemptId } = await startAttempt(session.assessmentId, studentId)
    const fetched = await fetchAssessmentForStudent(session.assessmentId, studentId)
    const responses = fetched!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      // confidence intentionally omitted
      timeSeconds: 5,
    }))
    await expect(
      gradeAndSubmit({ attemptId, responses }, studentId)
    ).rejects.toMatchObject({ code: 'CONFIDENCE_REQUIRED' })
  })

  it('submission with confidence succeeds', async () => {
    const session = await createRepublicChallengeSession({
      studentId,
      mode: 'MIXED_MISSION',
      length: 3,
      actorUserId: studentUserId,
    })
    const { attemptId } = await startAttempt(session.assessmentId, studentId)
    const fetched = await fetchAssessmentForStudent(session.assessmentId, studentId)
    const responses = fetched!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      confidence: 1 as const,
      timeSeconds: 5,
    }))
    const result = await gradeAndSubmit({ attemptId, responses }, studentId)
    expect(result.attemptId).toBe(attemptId)
    expect(result.feedback).toBeNull() // secure mode
  })

  it('Final Trial also requires confidence', async () => {
    const session = await createRepublicChallengeSession({
      studentId,
      mode: 'FINAL_REPUBLIC_TRIAL',
      length: 3,
      actorUserId: studentUserId,
    })
    const { attemptId } = await startAttempt(session.assessmentId, studentId)
    const fetched = await fetchAssessmentForStudent(session.assessmentId, studentId)
    const responses = fetched!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      timeSeconds: 5,
    }))
    await expect(
      gradeAndSubmit({ attemptId, responses }, studentId)
    ).rejects.toBeInstanceOf(AssessmentError)
  })
})
