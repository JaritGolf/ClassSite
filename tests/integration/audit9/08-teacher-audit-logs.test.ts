/**
 * Audit 9 Driver — Item 8: Teacher actions all create AuditLog entries
 *
 * Spec §36.10 item 8:
 *   Teacher actions (override, reset, approve, archive, accommodation set)
 *   all create AuditLog entries.
 *
 * Exercises all 6 catalog actions and asserts one AuditLog row per action
 * with the correct action string.
 *
 * Prefix: test-audit9-08-
 */

import { PrismaClient } from '@prisma/client'
import { applyTeacherOverride } from '@/lib/mastery/override'
import { resetAttempt } from '@/lib/assessment-reset'
import { approveContent, archiveContent, bulkApproveByTag } from '@/lib/content-approval'
import { setAccommodation } from '@/lib/reading-load'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit9-08-teacher'
const S_CLEVERID = 'test-audit9-08-student'
const ACC_CODE = 'TEST-ACC-AUDIT9-08'

let teacherUserId: string
let studentId: string
let attemptId: string
let assessmentId: string
let benchmarkId: string
let questionIdForApprove: string
let questionIdForArchive: string
let questionIdForBulk: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit908', lastName: 'Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })

  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'Audit908', lastName: 'Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id },
    update: {},
    select: { id: true },
  })
  studentId = student.id

  // Class + enrollment (needed for resetAttempt)
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUserId }, select: { id: true } })
  const cls = await prisma.class.create({
    data: { teacherId: teacher!.id, name: 'Audit 9-08 Class', schoolYear: '2025-26' },
    select: { id: true },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId } },
    create: { classId: cls.id, studentId },
    update: {},
  })

  // Benchmark
  const bm = await prisma.benchmark.findFirst({ select: { id: true, reportingCategoryId: true } })
  if (!bm) throw new Error('No benchmark in DB')
  benchmarkId = bm.id

  // Assessment + attempt
  const assessment = await prisma.assessment.create({
    data: { benchmarkId, title: 'Audit9-08 Assessment', assessmentType: 'MASTERY_CHALLENGE' },
    select: { id: true },
  })
  assessmentId = assessment.id

  const attempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 1, score: 0.5, passed: false, submittedAt: new Date() },
    select: { id: true },
  })
  attemptId = attempt.id

  // Questions
  const makeQ = async (promptSuffix: string) => {
    const q = await prisma.question.create({
      data: {
        benchmarkId: bm.id, reportingCategoryId: bm.reportingCategoryId,
        prompt: `Audit9-08 question ${promptSuffix}`,
        itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW',
        readingLoadLevel: 2, skillTag: 'test', remediationTag: 'test',
        approvalStatus: 'NEEDS_REVIEW', sourceTier: 'C',
      },
      select: { id: true },
    })
    return q.id
  }
  questionIdForApprove = await makeQ('approve')
  questionIdForArchive = await makeQ('archive')
  questionIdForBulk = await makeQ('bulk')

  // Progress row for override
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    create: { studentId, benchmarkId, status: 'IN_PROGRESS' },
    update: {},
  })

  // Accommodation for setAccommodation test
  await prisma.accommodation.upsert({
    where: { code: ACC_CODE },
    create: { code: ACC_CODE, name: 'Audit 9-08 Acc', description: 'Test' },
    update: {},
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await prisma.teacherOverride.deleteMany({ where: { teacher: { userId: teacherUserId } } })
  await prisma.studentAccommodation.deleteMany({ where: { studentId } })
  await prisma.accommodation.deleteMany({ where: { code: ACC_CODE } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.questionOption.deleteMany({ where: { questionId: { in: [questionIdForApprove, questionIdForArchive, questionIdForBulk] } } })
  await prisma.question.deleteMany({ where: { id: { in: [questionIdForApprove, questionIdForArchive, questionIdForBulk] } } })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.classEnrollment.deleteMany({ where: { studentId } })
  await prisma.class.deleteMany({ where: { teacher: { userId: teacherUserId } } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 9 — Item 8: All teacher actions write AuditLog entries', () => {
  it('TEACHER_OVERRIDE_* — applyTeacherOverride writes AuditLog', async () => {
    const result = await applyTeacherOverride(teacherUserId, studentId, benchmarkId, 'CUSTOM', 'Audit 9-08 test')
    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log!.action).toBe('TEACHER_OVERRIDE_CUSTOM')
    expect(log!.actorUserId).toBe(teacherUserId)
  })

  it('RESET_ATTEMPT — resetAttempt writes AuditLog', async () => {
    const result = await resetAttempt(teacherUserId, attemptId, 'Audit 9-08 reset')
    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log!.action).toBe('RESET_ATTEMPT')
    expect(log!.entityId).toBe(attemptId)
  })

  it('APPROVE_CONTENT — approveContent writes AuditLog', async () => {
    const result = await approveContent(teacherUserId, 'QUESTION', questionIdForApprove)
    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log!.action).toBe('APPROVE_CONTENT')
    expect(log!.entityId).toBe(questionIdForApprove)
  })

  it('ARCHIVE_CONTENT — archiveContent writes AuditLog', async () => {
    const result = await archiveContent(teacherUserId, 'QUESTION', questionIdForArchive, 'audit test')
    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log!.action).toBe('ARCHIVE_CONTENT')
    expect(log!.entityId).toBe(questionIdForArchive)
  })

  it('BULK_APPROVE_CONTENT — bulkApproveByTag writes AuditLog', async () => {
    const result = await bulkApproveByTag(teacherUserId, { entityType: 'QUESTION', ids: [questionIdForBulk] })
    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log!.action).toBe('BULK_APPROVE_CONTENT')
  })

  it('ACCOMMODATION_SET — setAccommodation writes AuditLog', async () => {
    await setAccommodation(teacherUserId, studentId, ACC_CODE, true, 'audit test reason')
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'ACCOMMODATION_SET' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log!.action).toBe('ACCOMMODATION_SET')
    expect((log!.metadataJson as { accommodationCode: string }).accommodationCode).toBe(ACC_CODE)
  })
})
