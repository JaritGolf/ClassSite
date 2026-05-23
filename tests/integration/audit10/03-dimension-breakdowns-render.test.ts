/**
 * Audit 10 — Item 3: Stimulus type, complexity, reading-load breakdowns render.
 *
 * Verifies GET /api/admin/analytics/breakdowns?classId=<id> returns
 * readingLoad, complexity, stimulusType arrays each with ≥1 entry
 * where the fixture has data.
 *
 * Prefix: test-audit10-03-
 */

import { PrismaClient } from '@prisma/client'
import { getDimensionBreakdownForClass } from '@/lib/eoc-analytics/breakdowns'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit10-03-teacher'
const S_CLEVERID = 'test-audit10-03-student'

let teacherId: string
let teacherUserId: string
let studentId: string
let classId: string
let assessmentId: string
let attemptId: string
let questionId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '03T', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '03S', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({ data: { teacherId, name: 'Audit10-03 Class', schoolYear: '2025-2026' }, select: { id: true } })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })

  const bm = await prisma.benchmark.findFirst({ select: { id: true, reportingCategoryId: true } })
  if (!bm) throw new Error('No benchmark in DB')

  const question = await prisma.question.create({
    data: {
      benchmarkId: bm.id,
      reportingCategoryId: bm.reportingCategoryId,
      prompt: 'Audit10-03 test question',
      itemType: 'MULTIPLE_CHOICE',
      cognitiveComplexity: 'HIGH',
      readingLoadLevel: 3,
      skillTag: 'test',
      remediationTag: 'test',
      approvalStatus: 'APPROVED',
      sourceTier: 'B',
    },
    select: { id: true },
  })
  questionId = question.id

  const assessment = await prisma.assessment.create({
    data: { benchmarkId: bm.id, title: 'Audit10-03 Assessment', assessmentType: 'PRACTICE' },
    select: { id: true },
  })
  assessmentId = assessment.id

  const attempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 1, score: 0.7, passed: true, submittedAt: new Date(), voided: false },
    select: { id: true },
  })
  attemptId = attempt.id

  await prisma.attemptResponse.create({
    data: { attemptId, questionId, isCorrect: true, pointsAwarded: 1, responseJson: {} },
  })
})

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({ where: { attemptId } })
  await prisma.assessmentAttempt.deleteMany({ where: { id: attemptId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.questionOption.deleteMany({ where: { questionId } })
  await prisma.question.deleteMany({ where: { id: questionId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 10 — Item 3: Dimension breakdowns render', () => {
  it('3a. getDimensionBreakdownForClass returns readingLoad array', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    expect(Array.isArray(result.readingLoad)).toBe(true)
  })

  it('3b. getDimensionBreakdownForClass returns complexity array', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    expect(Array.isArray(result.complexity)).toBe(true)
  })

  it('3c. getDimensionBreakdownForClass returns stimulusType array', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    expect(Array.isArray(result.stimulusType)).toBe(true)
  })

  it('3d. readingLoad level 3 has sampleSize >= 1 for fixture data', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    const level3 = result.readingLoad.find((r) => r.key === '3')
    expect(level3).toBeDefined()
    expect(level3!.sampleSize).toBeGreaterThanOrEqual(1)
  })

  it('3e. complexity HIGH has sampleSize >= 1 for fixture data', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    const high = result.complexity.find((c) => c.key === 'HIGH')
    expect(high).toBeDefined()
    expect(high!.sampleSize).toBeGreaterThanOrEqual(1)
  })

  it('3f. stimulusType has NONE entry (no stimulus attached to test question)', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    const none = result.stimulusType.find((s) => s.key === 'NONE')
    expect(none).toBeDefined()
  })

  it('3g. all correctRate values are in [0, 100]', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    for (const row of [...result.readingLoad, ...result.complexity, ...result.stimulusType]) {
      expect(row.correctRate).toBeGreaterThanOrEqual(0)
      expect(row.correctRate).toBeLessThanOrEqual(100)
    }
  })
})
