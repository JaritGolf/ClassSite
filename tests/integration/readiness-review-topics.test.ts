/**
 * Integration: readiness-check review topics (learning-loop closure).
 *
 * A failed READINESS_CHECK submission returns `reviewTopics` — humanized skill
 * tags of missed/unanswered questions — so the mission flow can point the
 * student back at the right training. Rule #2 stays intact: topic labels only,
 * no keys, no per-question correctness. Passing submissions and other
 * assessment types return null.
 */

import { PrismaClient } from '@prisma/client'
import { startAttempt, gradeAndSubmit } from '@/lib/assessment'

const prisma = new PrismaClient()

const CLEVER_ID = 'test-readiness-topics-student-001'
let assessmentId: string
let studentId: string
let questions: Array<{ questionId: string; correctOptionId: string; wrongOptionId: string }>

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(benchmark).not.toBeNull()

  const dbQuestions = await prisma.question.findMany({
    where: { benchmarkId: benchmark!.id, active: true, approvalStatus: 'APPROVED' },
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
      title: 'Test Readiness Check (review topics)',
      assessmentType: 'READINESS_CHECK',
      masteryThreshold: 0.7,
      approvalStatus: 'APPROVED',
      questions: {
        create: questions.map((q, i) => ({
          questionId: q.questionId,
          sequenceOrder: i + 1,
          points: 1.0,
        })),
      },
    },
  })
  assessmentId = assessment.id

  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: {
      cleverId: CLEVER_ID,
      firstName: 'Readiness',
      lastName: 'TopicsTest',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id
}, 60000)

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({ where: { attempt: { assessmentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.studentProgress.deleteMany({ where: { student: { user: { cleverId: CLEVER_ID } } } })
  await prisma.spacedReviewState.deleteMany({ where: { student: { user: { cleverId: CLEVER_ID } } } })
  await prisma.eocReadinessSnapshot.deleteMany({ where: { student: { user: { cleverId: CLEVER_ID } } } })
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('READINESS_CHECK reviewTopics', () => {
  it('a failed submission returns humanized topics for missed + unanswered questions', async () => {
    const { attemptId } = await startAttempt(assessmentId, studentId)
    // Answer 1 correct, 2 wrong, leave 1 unanswered → 25% (fail at 70%)
    const result = await gradeAndSubmit(
      {
        attemptId,
        responses: [
          { questionId: questions[0].questionId, selectedOptionId: questions[0].correctOptionId },
          { questionId: questions[1].questionId, selectedOptionId: questions[1].wrongOptionId },
          { questionId: questions[2].questionId, selectedOptionId: questions[2].wrongOptionId },
        ],
      },
      studentId
    )

    expect(result.passed).toBe(false)
    expect(result.reviewTopics).not.toBeNull()
    expect(result.reviewTopics!.length).toBeGreaterThanOrEqual(1)
    // Humanized (title-cased words, no slug hyphens) — e.g. "Enlightenment Influence"
    for (const topic of result.reviewTopics!) {
      expect(topic).not.toMatch(/-/)
      expect(topic).toMatch(/^[A-Z]/)
    }
    // Rule #2: no answer keys or per-question data in the payload
    expect(result.feedback).toBeNull()
  })

  it('a passing submission returns null reviewTopics', async () => {
    const { attemptId } = await startAttempt(assessmentId, studentId)
    const result = await gradeAndSubmit(
      {
        attemptId,
        responses: questions.map((q) => ({
          questionId: q.questionId,
          selectedOptionId: q.correctOptionId,
        })),
      },
      studentId
    )
    expect(result.passed).toBe(true)
    expect(result.reviewTopics).toBeNull()
  })
})
