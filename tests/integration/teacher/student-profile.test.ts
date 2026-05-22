/**
 * Integration Tests — Teacher Student Profile
 *
 * Tests getStudentProfileForTeacher:
 *   - Returns VM with correct shape
 *   - 403 for student not in teacher's classes
 *
 * Prefix: test-phase9b- (avoids collision).
 */

import { PrismaClient } from '@prisma/client'
import { getStudentProfileForTeacher } from '@/lib/student-profile'
import { RosterError } from '@/lib/teacher-roster'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string
let otherStudentId: string

const T_CLEVERID = 'test-phase9b-teacher-001'
const S_CLEVERID = 'test-phase9b-student-001'
const OS_CLEVERID = 'test-phase9b-other-student-001'

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Phase9B', lastName: 'Teacher',
      role: 'TEACHER',
    },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    create: { userId: teacherUserId },
    update: {},
    select: { id: true },
  })
  teacherId = teacher.id

  // Student (in class)
  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: {
      cleverId: S_CLEVERID,
      email: `${S_CLEVERID}@test.invalid`,
      firstName: 'Phase9B', lastName: 'Student',
      role: 'STUDENT',
    },
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

  // Other student (NOT in teacher's class)
  const otherStudentUser = await prisma.user.upsert({
    where: { cleverId: OS_CLEVERID },
    create: {
      cleverId: OS_CLEVERID,
      email: `${OS_CLEVERID}@test.invalid`,
      firstName: 'Other9B', lastName: 'Student',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })
  const otherStudent = await prisma.student.upsert({
    where: { userId: otherStudentUser.id },
    create: { userId: otherStudentUser.id },
    update: {},
    select: { id: true },
  })
  otherStudentId = otherStudent.id

  // Class + enrollment
  const cls = await prisma.class.create({
    data: {
      teacherId,
      name: 'Phase 9B Test Class',
      schoolYear: '2025-2026',
    },
    select: { id: true },
  })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })
  // otherStudent is deliberately NOT enrolled
})

afterAll(async () => {
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId, otherStudentId] } } })
  await prisma.user.deleteMany({
    where: { cleverId: { in: [T_CLEVERID, S_CLEVERID, OS_CLEVERID] } },
  })
  await prisma.$disconnect()
})

describe('getStudentProfileForTeacher', () => {
  it('returns a VM with the expected top-level keys', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(vm).toHaveProperty('student')
    expect(vm).toHaveProperty('mastery')
    expect(vm).toHaveProperty('attempts')
    expect(vm).toHaveProperty('calibration')
    expect(vm).toHaveProperty('spacedRetrieval')
    expect(vm).toHaveProperty('decayFlags')
    expect(vm).toHaveProperty('remediationHistory')
    expect(vm).toHaveProperty('badges')
    expect(vm).toHaveProperty('overrideHistory')
    expect(vm).toHaveProperty('accommodations')
    expect(vm).toHaveProperty('strengthsByDimension')
  })

  it('calibration has trend array and overallGap number', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(Array.isArray(vm.calibration.trend)).toBe(true)
    expect(typeof vm.calibration.overallGap).toBe('number')
    expect(vm.calibration.overallGap).toBeGreaterThanOrEqual(0)
    expect(vm.calibration.overallGap).toBeLessThanOrEqual(1)
  })

  it('decayFlags is an array', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(Array.isArray(vm.decayFlags)).toBe(true)
  })

  it('spacedRetrieval has itemsDueCount, nextReviewAt, avgIntervalDays', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(typeof vm.spacedRetrieval.itemsDueCount).toBe('number')
    expect(typeof vm.spacedRetrieval.avgIntervalDays).toBe('number')
    // nextReviewAt may be null if no spaced review states
  })

  it('returns student displayName', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(vm.student.displayName).toContain('Phase9B')
  })

  it('throws FORBIDDEN for a student not in the teacher\'s classes', async () => {
    await expect(
      getStudentProfileForTeacher(teacherUserId, otherStudentId)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('the FORBIDDEN error is a RosterError', async () => {
    try {
      await getStudentProfileForTeacher(teacherUserId, otherStudentId)
      fail('Expected RosterError to be thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(RosterError)
    }
  })
})
