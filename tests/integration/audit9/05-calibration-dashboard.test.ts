/**
 * Audit 9 — Item 5: Calibration dashboard renders.
 *
 * Tests:
 *   - getClassCalibrationTrend returns array of CalibrationTrendPoints
 *   - getOverconfidenceStudents returns array (may be empty without data)
 *   - Each trend point has bucketStart and calibrationScore
 *   - Overconfidence row has required fields
 */

import { PrismaClient } from '@prisma/client'
import { getClassCalibrationTrend, getOverconfidenceStudents } from '@/lib/calibration-analytics'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let studentId: string

const T_CLEVERID = 'test-audit9-05-teacher'
const S_CLEVERID = 'test-audit9-05-student'

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Audit9-05', lastName: 'Teacher',
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
      firstName: 'Audit9-05', lastName: 'Student',
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
    data: { teacherId, name: 'Audit 9-05 Test Class', schoolYear: '2025-2026' },
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
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 9 Item 5 — Calibration dashboard', () => {
  it('5a. getClassCalibrationTrend returns an array', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId)
    expect(Array.isArray(trend)).toBe(true)
  })

  it('5b. CalibrationTrendPoint has bucketStart (Date) and calibrationScore (number 0..1)', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId)
    for (const p of trend) {
      expect(p.bucketStart).toBeInstanceOf(Date)
      expect(typeof p.calibrationScore).toBe('number')
      expect(p.calibrationScore).toBeGreaterThanOrEqual(0)
      expect(p.calibrationScore).toBeLessThanOrEqual(1)
    }
  })

  it('5c. getOverconfidenceStudents returns an array', async () => {
    const rows = await getOverconfidenceStudents(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('5d. OverconfidenceRow shape is correct when rows present', async () => {
    const rows = await getOverconfidenceStudents(teacherUserId)
    for (const row of rows) {
      expect(typeof row.studentId).toBe('string')
      expect(typeof row.displayName).toBe('string')
      expect(typeof row.gap).toBe('number')
      expect(row.gap).toBeGreaterThanOrEqual(0.3)
      expect(typeof row.sampleSize).toBe('number')
      expect(row.sampleSize).toBeGreaterThanOrEqual(5)
    }
  })

  it('5e. getOverconfidenceStudents with threshold=0.0 still returns array', async () => {
    const rows = await getOverconfidenceStudents(teacherUserId, 0.0)
    expect(Array.isArray(rows)).toBe(true)
  })
})
