/**
 * Audit 14 — Item 4: Sharing a parent summary creates an audit-log entry capturing
 * teacher ID, student ID, timestamp, and the fields included (spec §22 catalog).
 * Prefix: test-audit14-04-
 */

import { PrismaClient } from '@prisma/client'
import { shareParentSummary, PARENT_SUMMARY_SHARED } from '@/lib/parent-summary'
import { RosterError } from '@/lib/teacher-roster'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit14-04-teacher'
const S_CLEVERID = 'test-audit14-04-student'
const OUTSIDER_CLEVERID = 'test-audit14-04-outsider'

let teacherUserId: string
let teacherId: string
let studentId: string
let outsiderStudentId: string
let classId: string

const FIELDS = ['currentMission', 'mastery', 'eocReadiness']

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '04Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '04Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const oUser = await prisma.user.upsert({
    where: { cleverId: OUTSIDER_CLEVERID },
    create: { cleverId: OUTSIDER_CLEVERID, email: `${OUTSIDER_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '04Outsider', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const outsider = await prisma.student.upsert({ where: { userId: oUser.id }, create: { userId: oUser.id }, update: {}, select: { id: true } })
  outsiderStudentId = outsider.id

  const cls = await prisma.class.create({
    data: { teacherId, name: 'Audit 14-04 Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId, outsiderStudentId] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID, OUTSIDER_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 14 — Item 4: share writes an audit log', () => {
  it('creates a PARENT_SUMMARY_SHARED audit log with teacher, student, and fields', async () => {
    const result = await shareParentSummary(teacherUserId, studentId, FIELDS)
    expect(result.ok).toBe(true)

    const log = await prisma.auditLog.findUniqueOrThrow({ where: { id: result.auditLogId } })
    expect(log.action).toBe(PARENT_SUMMARY_SHARED)
    expect(log.actorUserId).toBe(teacherUserId)
    expect(log.entityType).toBe('Student')
    expect(log.entityId).toBe(studentId)

    const meta = log.metadataJson as { studentId: string; fieldsIncluded: string[]; sharedAt: string }
    expect(meta.studentId).toBe(studentId)
    expect(meta.fieldsIncluded).toEqual(FIELDS)
    expect(typeof meta.sharedAt).toBe('string')
  })

  it('refuses to share for a student outside the teacher roster (no log written)', async () => {
    await expect(shareParentSummary(teacherUserId, outsiderStudentId, FIELDS)).rejects.toBeInstanceOf(RosterError)
    const leak = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, entityId: outsiderStudentId },
    })
    expect(leak).toBeNull()
  })
})
