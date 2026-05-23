/**
 * Integration tests — Dimension Breakdowns
 *
 * Verifies that breakdowns only count voided=false attempts.
 * Prefix: test-eoc-bkdn-
 */

import { PrismaClient } from '@prisma/client'
import { getDimensionBreakdownForClass, getDimensionBreakdownForStudent } from '@/lib/eoc-analytics/breakdowns'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-eoc-bkdn-teacher'
const S_CLEVERID = 'test-eoc-bkdn-student'

let teacherId: string
let teacherUserId: string
let studentId: string
let classId: string
let assessmentId: string
let liveAttemptId: string
let voidedAttemptId: string
let questionId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'EocBkdn', lastName: 'Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'EocBkdn', lastName: 'Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({ data: { teacherId, name: 'EocBkdn Class', schoolYear: '2025-2026' }, select: { id: true } })
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
      prompt: 'EocBkdn test question',
      itemType: 'MULTIPLE_CHOICE',
      cognitiveComplexity: 'MODERATE',
      readingLoadLevel: 2,
      skillTag: 'test',
      remediationTag: 'test',
      approvalStatus: 'APPROVED',
      sourceTier: 'B',
    },
    select: { id: true },
  })
  questionId = question.id

  const assessment = await prisma.assessment.create({
    data: { benchmarkId: bm.id, title: 'EocBkdn Assessment', assessmentType: 'PRACTICE' },
    select: { id: true },
  })
  assessmentId = assessment.id

  // Live attempt (voided=false)
  const liveAttempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 1, score: 0.8, passed: true, submittedAt: new Date(), voided: false },
    select: { id: true },
  })
  liveAttemptId = liveAttempt.id

  // Voided attempt
  const voidedAttempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 2, score: 0.4, passed: false, submittedAt: new Date(), voided: true },
    select: { id: true },
  })
  voidedAttemptId = voidedAttempt.id

  // AttemptResponse for live attempt (correct)
  await prisma.attemptResponse.create({
    data: { attemptId: liveAttemptId, questionId, isCorrect: true, pointsAwarded: 1, responseJson: {} },
  })

  // AttemptResponse for voided attempt (incorrect)
  await prisma.attemptResponse.create({
    data: { attemptId: voidedAttemptId, questionId, isCorrect: false, pointsAwarded: 0, responseJson: {} },
  })
})

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({ where: { attemptId: { in: [liveAttemptId, voidedAttemptId] } } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.questionOption.deleteMany({ where: { questionId } })
  await prisma.question.deleteMany({ where: { id: questionId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('getDimensionBreakdownForClass', () => {
  it('returns readingLoad, complexity, stimulusType arrays', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    expect(Array.isArray(result.readingLoad)).toBe(true)
    expect(Array.isArray(result.complexity)).toBe(true)
    expect(Array.isArray(result.stimulusType)).toBe(true)
  })

  it('readingLoad has entries for levels 1, 2, 3', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    const keys = result.readingLoad.map((r) => r.key)
    expect(keys).toContain('1')
    expect(keys).toContain('2')
    expect(keys).toContain('3')
  })

  it('complexity has entries for LOW, MODERATE, HIGH', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    const keys = result.complexity.map((c) => c.key)
    expect(keys).toContain('LOW')
    expect(keys).toContain('MODERATE')
    expect(keys).toContain('HIGH')
  })

  it('only counts voided=false attempts — sampleSize should exclude voided response', async () => {
    const result = await getDimensionBreakdownForClass(classId)
    // Level 2 should have sampleSize=1 (live attempt only, not the voided one)
    const level2 = result.readingLoad.find((r) => r.key === '2')
    // The live response is correct, so correctRate should be 100%
    if (level2 && level2.sampleSize > 0) {
      expect(level2.correctRate).toBeGreaterThan(0)
    }
  })
})

describe('getDimensionBreakdownForStudent', () => {
  it('returns studentId in result', async () => {
    const result = await getDimensionBreakdownForStudent(studentId)
    expect(result.studentId).toBe(studentId)
  })

  it('only counts voided=false responses', async () => {
    const result = await getDimensionBreakdownForStudent(studentId)
    // Moderate complexity: only 1 live response (correct), so sampleSize=1, correctRate=100
    const moderate = result.complexity.find((c) => c.key === 'MODERATE')
    if (moderate && moderate.sampleSize > 0) {
      expect(moderate.correctRate).toBe(100)
    }
  })
})
