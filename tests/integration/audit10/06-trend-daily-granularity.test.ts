/**
 * Audit 10 — Item 6: Trend over time renders with at least daily granularity.
 *
 * Calls getReadinessTrend with granularity='day' and windowDays=7.
 * Asserts:
 * - Returns an array
 * - Each point's bucketStart is start-of-UTC-day
 * - Consecutive buckets differ by exactly 24h (when adjacent)
 *
 * Prefix: test-audit10-06-
 */

import { PrismaClient } from '@prisma/client'
import { getReadinessTrend } from '@/lib/eoc-analytics/trend'
import { startOfUtcDay } from '@/lib/eoc-analytics/snapshot'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit10-06-teacher'
const S_CLEVERID = 'test-audit10-06-student'

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '06T', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '06S', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({ data: { teacherId, name: 'Audit10-06 Class', schoolYear: '2025-2026' }, select: { id: true } })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })

  // Get a reporting category
  const rc = await prisma.reportingCategory.findFirst({ select: { id: true } })
  if (!rc) return

  // Seed 5 consecutive daily snapshots for the student
  const days = [
    new Date('2026-05-16T00:00:00.000Z'),
    new Date('2026-05-17T00:00:00.000Z'),
    new Date('2026-05-18T00:00:00.000Z'),
    new Date('2026-05-19T00:00:00.000Z'),
    new Date('2026-05-20T00:00:00.000Z'),
  ]

  for (const day of days) {
    await prisma.eocReadinessSnapshot.create({
      data: {
        studentId,
        reportingCategoryId: rc.id,
        readinessScore: 0.5,
        readinessLow: 0.3,
        readinessHigh: 0.7,
        createdAt: day,
      },
    })
  }
})

afterAll(async () => {
  await prisma.eocReadinessSnapshot.deleteMany({ where: { studentId } })
  await prisma.classReadinessSnapshot.deleteMany({ where: { classId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 10 — Item 6: Trend with daily granularity', () => {
  it('6a. getReadinessTrend returns an array', async () => {
    const trend = await getReadinessTrend({
      scope: { type: 'student', studentId },
      granularity: 'day',
      windowDays: 7,
    })
    expect(Array.isArray(trend)).toBe(true)
  })

  it('6b. Returns N ≤ 7 day buckets for windowDays=7', async () => {
    const trend = await getReadinessTrend({
      scope: { type: 'student', studentId },
      granularity: 'day',
      windowDays: 7,
    })
    expect(trend.length).toBeLessThanOrEqual(7)
  })

  it('6c. Each bucketStart is at UTC midnight (start-of-day)', async () => {
    const trend = await getReadinessTrend({
      scope: { type: 'student', studentId },
      granularity: 'day',
      windowDays: 90, // wider window to include all seeded snapshots
    })
    for (const point of trend) {
      const dayStart = startOfUtcDay(point.bucketStart)
      expect(dayStart.toISOString()).toBe(point.bucketStart.toISOString())
    }
  })

  it('6d. Consecutive buckets differ by exactly 24h (daily granularity)', async () => {
    const trend = await getReadinessTrend({
      scope: { type: 'student', studentId },
      granularity: 'day',
      windowDays: 90,
    })
    for (let i = 1; i < trend.length; i++) {
      const diff = trend[i].bucketStart.getTime() - trend[i - 1].bucketStart.getTime()
      // Each bucket should be exactly 24h apart (86400000 ms) for consecutive days
      expect(diff).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('6e. Points are ordered ascending by bucketStart', async () => {
    const trend = await getReadinessTrend({
      scope: { type: 'student', studentId },
      granularity: 'day',
      windowDays: 90,
    })
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].bucketStart.getTime()).toBeGreaterThan(trend[i - 1].bucketStart.getTime())
    }
  })

  it('6f. TrendPoint has value in [0,100] and sampleSize >= 1', async () => {
    const trend = await getReadinessTrend({
      scope: { type: 'student', studentId },
      granularity: 'day',
      windowDays: 90,
    })
    for (const point of trend) {
      expect(point.value).toBeGreaterThanOrEqual(0)
      expect(point.value).toBeLessThanOrEqual(100)
      expect(point.sampleSize).toBeGreaterThanOrEqual(1)
    }
  })
})
