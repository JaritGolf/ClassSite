/**
 * Audit 14 — Item 1: Teacher can generate a progress report for a student on
 * their roster, and CANNOT generate one for a student not on their roster.
 * Prefix: test-audit14-01-
 */

import { PrismaClient } from '@prisma/client'
import { getParentSummary } from '@/lib/parent-summary'
import { RosterError } from '@/lib/teacher-roster'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit14-01-teacher'
const S_CLEVERID = 'test-audit14-01-student'
const OTHER_CLEVERID = 'test-audit14-01-other-student'

let teacherUserId: string
let teacherId: string
let studentId: string
let otherStudentId: string
let classId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '01Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '01Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const oUser = await prisma.user.upsert({
    where: { cleverId: OTHER_CLEVERID },
    create: { cleverId: OTHER_CLEVERID, email: `${OTHER_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '01Other', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const other = await prisma.student.upsert({ where: { userId: oUser.id }, create: { userId: oUser.id }, update: {}, select: { id: true } })
  otherStudentId = other.id

  const cls = await prisma.class.create({
    data: { teacherId, name: 'Audit 14-01 Class', schoolYear: '2025-2026' },
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
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId, otherStudentId] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID, OTHER_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 14 — Item 1: generate for roster student', () => {
  it('generates a summary for a student on the roster', async () => {
    const vm = await getParentSummary(teacherUserId, studentId)
    expect(vm.student.displayName).toBe('A14 01Student')
    expect(vm.mastery).toBeDefined()
    expect(vm.eocReadiness).toBeDefined()
    expect(Array.isArray(vm.recentAssessments)).toBe(true)
  })

  it('rejects a student NOT on the roster (RosterError FORBIDDEN)', async () => {
    await expect(getParentSummary(teacherUserId, otherStudentId)).rejects.toMatchObject({
      name: 'RosterError',
      code: 'FORBIDDEN',
    })
    // sanity: it's the expected error class
    await expect(getParentSummary(teacherUserId, otherStudentId)).rejects.toBeInstanceOf(RosterError)
  })
})
