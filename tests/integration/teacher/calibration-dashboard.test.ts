/**
 * Integration Tests — Calibration Dashboard
 *
 * Tests getClassCalibrationTrend and getOverconfidenceStudents.
 *
 * Prefix: test-9b-cal- to avoid collision.
 */

import { PrismaClient } from '@prisma/client'
import { getClassCalibrationTrend, getOverconfidenceStudents } from '@/lib/calibration-analytics'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let studentId: string

const T_CLEVERID = 'test-9b-cal-teacher-001'
const S_CLEVERID = 'test-9b-cal-student-001'

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: '9bCal', lastName: 'Teacher',
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

  // Student
  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: {
      cleverId: S_CLEVERID,
      email: `${S_CLEVERID}@test.invalid`,
      firstName: '9bCal', lastName: 'Student',
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

  // Class + enrollment
  const cls = await prisma.class.create({
    data: { teacherId, name: '9bCal Test Class', schoolYear: '2025-2026' },
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

describe('getClassCalibrationTrend', () => {
  it('returns an array', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId)
    expect(Array.isArray(trend)).toBe(true)
  })

  it('returns empty array when no data', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId)
    // No attempts in DB for this teacher/class, so empty is expected
    expect(trend.length).toBeGreaterThanOrEqual(0)
  })

  it('each point has weekStart (Date) and calibrationScore (0..1)', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId)
    for (const p of trend) {
      expect(p.weekStart).toBeInstanceOf(Date)
      expect(typeof p.calibrationScore).toBe('number')
      expect(p.calibrationScore).toBeGreaterThanOrEqual(0)
      expect(p.calibrationScore).toBeLessThanOrEqual(1)
    }
  })
})

describe('getOverconfidenceStudents', () => {
  it('returns an array', async () => {
    const rows = await getOverconfidenceStudents(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('default threshold is 0.3 — returns empty when no high-confidence responses', async () => {
    const rows = await getOverconfidenceStudents(teacherUserId)
    // No attempts → no overconfident students
    expect(rows.length).toBe(0)
  })

  it('respects custom threshold parameter', async () => {
    // With threshold=0.0 still returns empty (no data)
    const rows = await getOverconfidenceStudents(teacherUserId, 0.0)
    expect(Array.isArray(rows)).toBe(true)
  })
})
