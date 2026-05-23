/**
 * Audit 10 — Item 5: Calibration metrics computed correctly.
 *
 * Seeds AttemptResponse rows with known confidence × correctness mix.
 * Calls getClassCalibrationTrend(teacherUserId, 'day').
 * Asserts calibration score matches hand-computed value for the day bucket.
 *
 * Hand-computed: 8 high-confidence correct + 2 incorrect → 8/10 = 0.8
 *
 * Prefix: test-audit10-05-
 */

import { PrismaClient } from '@prisma/client'
import { getClassCalibrationTrend } from '@/lib/calibration-analytics'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit10-05-teacher'
const S_CLEVERID = 'test-audit10-05-student'

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '05T', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '05S', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({ data: { teacherId, name: 'Audit10-05 Class', schoolYear: '2025-2026' }, select: { id: true } })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })

  // Seed ConfidenceCalibrationSnapshot for 2026-05-21
  // 8 high-confidence correct + 2 incorrect → calibrationScore = 8/10 = 0.8
  await prisma.confidenceCalibrationSnapshot.create({
    data: {
      studentId,
      scope: 'overall',
      snapshotAt: new Date('2026-05-21T10:00:00Z'),
      highConfidenceCorrect: 8,
      highConfidenceIncorrect: 2,
      mediumConfidenceCorrect: 0,
      mediumConfidenceIncorrect: 0,
      lowConfidenceCorrect: 0,
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

describe('Audit 10 — Item 5: Calibration metrics computed correctly', () => {
  it('5a. getClassCalibrationTrend with "day" granularity returns an array', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    expect(Array.isArray(trend)).toBe(true)
  })

  it('5b. Trend has at least 1 point for the seeded data', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    expect(trend.length).toBeGreaterThanOrEqual(1)
  })

  it('5c. CalibrationScore = 0.8 for the seeded day bucket (8 correct / 10 total)', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    // The seeded day is 2026-05-21
    const day = trend.find((p) => {
      const dateStr = p.bucketStart.toISOString().slice(0, 10)
      return dateStr === '2026-05-21'
    })
    expect(day).toBeDefined()
    expect(day!.calibrationScore).toBeCloseTo(0.8, 5)
  })

  it('5d. Each point uses bucketStart (Date)', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    for (const p of trend) {
      expect(p.bucketStart).toBeInstanceOf(Date)
      // TypeScript type no longer has weekStart — this is compile-time enforced
    }
  })

  it('5e. calibrationScore is in [0, 1]', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    for (const p of trend) {
      expect(p.calibrationScore).toBeGreaterThanOrEqual(0)
      expect(p.calibrationScore).toBeLessThanOrEqual(1)
    }
  })

  it('5f. Daily buckets are at UTC midnight', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    for (const p of trend) {
      expect(p.bucketStart.getUTCHours()).toBe(0)
      expect(p.bucketStart.getUTCMinutes()).toBe(0)
      expect(p.bucketStart.getUTCSeconds()).toBe(0)
    }
  })
})
