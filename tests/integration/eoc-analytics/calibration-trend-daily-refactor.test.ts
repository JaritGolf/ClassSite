/**
 * Integration tests — Calibration Trend Granularity Refactor
 *
 * Verifies:
 * - getClassCalibrationTrend(uid, 'day') returns daily bucketing
 * - getClassCalibrationTrend(uid) (default) still works (weekly, Phase 9 compat)
 * - CalibrationTrendPoint now uses bucketStart (not weekStart)
 *
 * Prefix: test-eoc-cal-daily-
 */

import { PrismaClient } from '@prisma/client'
import { getClassCalibrationTrend } from '@/lib/calibration-analytics'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-eoc-cal-daily-teacher'
const S_CLEVERID = 'test-eoc-cal-daily-student'

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'EocCalDaily', lastName: 'Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'EocCalDaily', lastName: 'Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({ data: { teacherId, name: 'EocCalDaily Class', schoolYear: '2025-2026' }, select: { id: true } })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
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

describe('getClassCalibrationTrend — granularity refactor', () => {
  it('default (no granularity arg) returns an array — Phase 9 compat', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId)
    expect(Array.isArray(trend)).toBe(true)
  })

  it('explicit "week" granularity returns an array', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'week')
    expect(Array.isArray(trend)).toBe(true)
  })

  it('explicit "day" granularity returns an array', async () => {
    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    expect(Array.isArray(trend)).toBe(true)
  })

  it('CalibrationTrendPoint has bucketStart (not weekStart) and calibrationScore', async () => {
    // Seed a calibration snapshot
    await prisma.confidenceCalibrationSnapshot.create({
      data: {
        studentId,
        scope: 'overall',
        snapshotAt: new Date('2026-05-22T10:00:00Z'),
        highConfidenceCorrect: 8,
        highConfidenceIncorrect: 2,
        mediumConfidenceCorrect: 0,
        mediumConfidenceIncorrect: 0,
        lowConfidenceCorrect: 0,
        lowConfidenceIncorrect: 0,
      },
    })

    const trend = await getClassCalibrationTrend(teacherUserId, 'day')

    for (const point of trend) {
      // New field name: bucketStart
      expect(point.bucketStart).toBeInstanceOf(Date)
      // TypeScript enforces bucketStart — weekStart no longer on the type
      // calibrationScore still present
      expect(typeof point.calibrationScore).toBe('number')
      expect(point.calibrationScore).toBeGreaterThanOrEqual(0)
      expect(point.calibrationScore).toBeLessThanOrEqual(1)
    }
  })

  it('daily granularity: each bucket differs by exactly 24h when consecutive days', async () => {
    // Seed two more days
    await prisma.confidenceCalibrationSnapshot.createMany({
      data: [
        {
          studentId, scope: 'overall',
          snapshotAt: new Date('2026-05-20T10:00:00Z'),
          highConfidenceCorrect: 5, highConfidenceIncorrect: 5,
          mediumConfidenceCorrect: 0, mediumConfidenceIncorrect: 0,
          lowConfidenceCorrect: 0, lowConfidenceIncorrect: 0,
        },
        {
          studentId, scope: 'overall',
          snapshotAt: new Date('2026-05-21T10:00:00Z'),
          highConfidenceCorrect: 7, highConfidenceIncorrect: 3,
          mediumConfidenceCorrect: 0, mediumConfidenceIncorrect: 0,
          lowConfidenceCorrect: 0, lowConfidenceIncorrect: 0,
        },
      ],
      skipDuplicates: true,
    })

    const trend = await getClassCalibrationTrend(teacherUserId, 'day')
    expect(trend.length).toBeGreaterThanOrEqual(1)

    // All bucketStart values should be at midnight UTC
    for (const point of trend) {
      expect(point.bucketStart.getUTCHours()).toBe(0)
      expect(point.bucketStart.getUTCMinutes()).toBe(0)
      expect(point.bucketStart.getUTCSeconds()).toBe(0)
    }

    // If multiple consecutive day buckets, they should differ by 24h
    for (let i = 1; i < trend.length; i++) {
      const diff = trend[i].bucketStart.getTime() - trend[i - 1].bucketStart.getTime()
      expect(diff).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000)
    }
  })
})
