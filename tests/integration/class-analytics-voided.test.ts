/**
 * Integration — class-analytics excludes voided attempts.
 *
 * The attempt-reset feature voids a bad attempt so it stops counting. Before
 * this fix, most-missed / misconception analytics still counted a voided
 * attempt's responses, so a reset didn't actually remove its influence.
 *
 * Prefix: test-voided- (isolated).
 */

import { PrismaClient } from '@prisma/client'
import { getMostMissedQuestions } from '@/lib/class-analytics'

const prisma = new PrismaClient()

let teacherUserId: string
let studentId: string
let classId: string
let questionId: string
let wrongOptionId: string
let assessmentId: string

const PREFIX = 'test-voided-'

beforeAll(async () => {
  // Reuse a seeded, fully-optioned question.
  const q = await prisma.question.findFirstOrThrow({
    where: { options: { some: { isCorrect: false } } },
    select: {
      id: true,
      benchmarkId: true,
      options: { where: { isCorrect: false }, select: { id: true }, take: 1 },
    },
  })
  questionId = q.id
  wrongOptionId = q.options[0].id

  const teacherUser = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}teacher` },
    update: {},
    create: { cleverId: `${PREFIX}teacher`, firstName: 'V', lastName: 'T', role: 'TEACHER', status: 'ACTIVE' },
  })
  teacherUserId = teacherUser.id
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: {},
    create: { userId: teacherUserId },
    select: { id: true },
  })

  const studentUser = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}student` },
    update: {},
    create: { cleverId: `${PREFIX}student`, firstName: 'V', lastName: 'S', role: 'STUDENT', status: 'ACTIVE' },
  })
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, gradeLevel: 7 },
    select: { id: true },
  })
  studentId = student.id

  const cls = await prisma.class.create({
    data: { teacherId: teacher.id, name: `${PREFIX}class`, schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id
  await prisma.classEnrollment.create({ data: { classId, studentId, status: 'ACTIVE' } })

  const assessment = await prisma.assessment.create({
    data: {
      benchmarkId: q.benchmarkId,
      assessmentType: 'PRACTICE',
      title: `${PREFIX}assessment`,
      approvalStatus: 'APPROVED',
    },
    select: { id: true },
  })
  assessmentId = assessment.id

  // Two attempts, each with one WRONG response to the same question:
  // one live, one voided. Only the live one should count.
  for (const [n, voided] of [[1, false], [2, true]] as const) {
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        studentId,
        attemptNumber: n,
        score: 0,
        passed: false,
        submittedAt: new Date(),
        voided,
      },
      select: { id: true },
    })
    await prisma.attemptResponse.create({
      data: {
        attemptId: attempt.id,
        questionId,
        responseJson: { selectedOptionId: wrongOptionId },
        selectedOptionId: wrongOptionId,
        isCorrect: false,
      },
    })
  }
})

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({ where: { attempt: { assessmentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.teacher.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

describe('getMostMissedQuestions ignores voided attempts', () => {
  it('counts only the live attempt (1), not the voided one', async () => {
    const rows = await getMostMissedQuestions(teacherUserId)
    const row = rows.find((r) => r.questionId === questionId)
    expect(row).toBeDefined()
    // 2 wrong responses exist in the DB but one attempt is voided → 1 counted.
    expect(row!.totalAttempts).toBe(1)
    expect(row!.missCount).toBe(1)
  })
})
