/**
 * Badge Award Engine integration — badges are actually awarded now.
 *
 * Regression guard for the "badges are never awarded" defect: no
 * studentBadge.create existed anywhere in src/ before this engine.
 */

import { PrismaClient } from '@prisma/client'
import { evaluateAndAwardBadges } from '@/lib/badges'
import { seedBadges } from '../../seed/badges'

const prisma = new PrismaClient()

const CLEVER_ID = 'test-badges-student-001'
let studentId: string
let benchmarkId: string

beforeAll(async () => {
  await seedBadges(prisma)

  const benchmark = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(benchmark).not.toBeNull()
  benchmarkId = benchmark!.id

  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: {
      cleverId: CLEVER_ID,
      firstName: 'Badge',
      lastName: 'TestStudent',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id
})

afterAll(async () => {
  await prisma.studentBadge.deleteMany({ where: { studentId } })
  await prisma.spacedReviewEvent.deleteMany({ where: { studentId } })
  await prisma.spacedReviewState.deleteMany({ where: { studentId } })
  await prisma.streakState.deleteMany({ where: { studentId } })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('evaluateAndAwardBadges', () => {
  it('awards nothing to a brand-new student', async () => {
    const awarded = await evaluateAndAwardBadges(studentId)
    expect(awarded).toEqual([])
    const count = await prisma.studentBadge.count({ where: { studentId } })
    expect(count).toBe(0)
  })

  it('awards Citizen-in-Training on first benchmark mastery — idempotently', async () => {
    await prisma.studentProgress.upsert({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      update: { status: 'MASTERED' },
      create: { studentId, benchmarkId, status: 'MASTERED' },
    })

    const awarded = await evaluateAndAwardBadges(studentId)
    expect(awarded).toContain('Citizen-in-Training')

    // Second evaluation must not duplicate or re-award.
    const secondPass = await evaluateAndAwardBadges(studentId)
    expect(secondPass).not.toContain('Citizen-in-Training')
    const rows = await prisma.studentBadge.findMany({
      where: { studentId, badge: { name: 'Citizen-in-Training' } },
    })
    expect(rows).toHaveLength(1)
  })

  it('awards streak badges from longestLength (once earned, never unearned)', async () => {
    await prisma.streakState.upsert({
      where: { studentId },
      update: { currentLength: 2, longestLength: 7 },
      create: { studentId, currentLength: 2, longestLength: 7 },
    })

    const awarded = await evaluateAndAwardBadges(studentId)
    expect(awarded).toContain('7-Day Patriot')
    expect(awarded).not.toContain('14-Day Sentinel')
  })

  it('awards First Drill after one spaced-review event', async () => {
    const question = await prisma.question.findFirst({
      where: { benchmarkId },
      select: { id: true },
    })
    await prisma.spacedReviewEvent.create({
      data: {
        studentId,
        benchmarkId,
        questionId: question!.id,
        quality: 4,
        isCorrect: true,
        confidence: 2,
      },
    })

    const awarded = await evaluateAndAwardBadges(studentId)
    expect(awarded).toContain('First Drill')
  })

  it('never awards criteria kinds without a data source (reading-track counters)', async () => {
    const readingBadges = await prisma.studentBadge.findMany({
      where: { studentId, badge: { track: 'READING' } },
    })
    expect(readingBadges).toHaveLength(0)
  })
})
