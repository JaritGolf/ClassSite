/**
 * Audit 9 — Item 3: Student profile shows calibration trend + spaced-retrieval status
 *
 * Asserts:
 *   - calibration.trend is present (array)
 *   - calibration.overallGap is a number between 0 and 1
 *   - decayFlags is present (array)
 *   - spacedRetrieval.itemsDueCount is a non-negative number
 *   - spacedRetrieval.avgIntervalDays is a non-negative number
 */

import { PrismaClient } from '@prisma/client'
import { getStudentProfileForTeacher } from '@/lib/student-profile'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string

const T_CLEVERID = 'test-audit9-03-teacher'
const S_CLEVERID = 'test-audit9-03-student'

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Audit9Item3', lastName: 'Teacher',
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

  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: {
      cleverId: S_CLEVERID,
      email: `${S_CLEVERID}@test.invalid`,
      firstName: 'Audit9Item3', lastName: 'Student',
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

  const cls = await prisma.class.create({
    data: {
      teacherId,
      name: 'Audit 9 Item 3 Test Class',
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

  // Seed a calibration snapshot for this student
  await prisma.confidenceCalibrationSnapshot.create({
    data: {
      studentId,
      scope: 'overall',
      highConfidenceCorrect: 8,
      highConfidenceIncorrect: 2,
      mediumConfidenceCorrect: 5,
      mediumConfidenceIncorrect: 1,
      lowConfidenceCorrect: 3,
      lowConfidenceIncorrect: 0,
    },
  })
})

afterAll(async () => {
  await prisma.confidenceCalibrationSnapshot.deleteMany({ where: { studentId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 9 Item 3 — student profile calibration + spaced retrieval', () => {
  it('calibration.trend is a non-empty array (after seeding snapshot)', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(Array.isArray(vm.calibration.trend)).toBe(true)
    expect(vm.calibration.trend.length).toBeGreaterThan(0)
  })

  it('calibration.overallGap is between 0 and 1', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(vm.calibration.overallGap).toBeGreaterThanOrEqual(0)
    expect(vm.calibration.overallGap).toBeLessThanOrEqual(1)
  })

  it('calibration.overallGap reflects actual high-confidence incorrect rate', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    // 2 incorrect / (8+2) = 0.2
    expect(vm.calibration.overallGap).toBeCloseTo(0.2, 2)
  })

  it('calibration trend points have weekStart, calibrationScore', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    const point = vm.calibration.trend[0]
    expect(point).toHaveProperty('weekStart')
    expect(point).toHaveProperty('calibrationScore')
    expect(typeof point.calibrationScore).toBe('number')
  })

  it('decayFlags is an array', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(Array.isArray(vm.decayFlags)).toBe(true)
  })

  it('spacedRetrieval.itemsDueCount is a non-negative number', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(vm.spacedRetrieval.itemsDueCount).toBeGreaterThanOrEqual(0)
  })

  it('spacedRetrieval.avgIntervalDays is a non-negative number', async () => {
    const vm = await getStudentProfileForTeacher(teacherUserId, studentId)
    expect(vm.spacedRetrieval.avgIntervalDays).toBeGreaterThanOrEqual(0)
  })
})
