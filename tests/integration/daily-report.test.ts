/**
 * Integration — Daily Class Report.
 *
 * buildDailyClassReport must:
 *   1. Scope strictly to the requested class (no other class's students leak in).
 *   2. Refuse a class the caller does not own (roster IDOR guard → FORBIDDEN).
 *   3. Flag off-ramp students + surface them in the prioritized action plan.
 *   4. Count spaced-review items due today per student.
 *   5. Return an empty, non-throwing report for a class with no students.
 *
 * Prefix: test-daily- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import { buildDailyClassReport } from '@/lib/daily-report'

const prisma = new PrismaClient()

const PREFIX = 'test-daily-'

let teacherUserId: string
let otherTeacherUserId: string
let benchmarkId: string
let classAId: string
let classBId: string
let classEmptyId: string
let enrolledStudentId: string // in class A — off-ramp + due review
let otherStudentId: string // in class B — on track

async function mkUser(suffix: string, role: 'TEACHER' | 'STUDENT') {
  return prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'Daily',
      lastName: suffix,
      role,
      status: 'ACTIVE',
    },
  })
}

async function mkStudent(suffix: string) {
  const u = await mkUser(suffix, 'STUDENT')
  const s = await prisma.student.upsert({
    where: { userId: u.id },
    update: {},
    create: { userId: u.id, gradeLevel: 7 },
    select: { id: true },
  })
  return s.id
}

async function mkClass(teacherId: string, name: string) {
  const existing = await prisma.class.findFirst({
    where: { teacherId, name },
    select: { id: true },
  })
  if (existing) return existing.id
  const c = await prisma.class.create({
    data: { teacherId, name, schoolYear: '2025-2026' },
    select: { id: true },
  })
  return c.id
}

beforeAll(async () => {
  benchmarkId = (
    await prisma.benchmark.findFirstOrThrow({
      where: { code: 'SS.7.CG.1.1' },
      select: { id: true },
    })
  ).id

  const teacherUser = await mkUser('teacher', 'TEACHER')
  teacherUserId = teacherUser.id
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: {},
    create: { userId: teacherUserId },
    select: { id: true },
  })

  const otherTeacherUser = await mkUser('otherteacher', 'TEACHER')
  otherTeacherUserId = otherTeacherUser.id
  await prisma.teacher.upsert({
    where: { userId: otherTeacherUserId },
    update: {},
    create: { userId: otherTeacherUserId },
  })

  enrolledStudentId = await mkStudent('enrolled')
  otherStudentId = await mkStudent('other')

  classAId = await mkClass(teacher.id, 'Daily A')
  classBId = await mkClass(teacher.id, 'Daily B')
  classEmptyId = await mkClass(teacher.id, 'Daily Empty')

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: classAId, studentId: enrolledStudentId } },
    create: { classId: classAId, studentId: enrolledStudentId, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: classBId, studentId: otherStudentId } },
    create: { classId: classBId, studentId: otherStudentId, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  })

  // Enrolled student: off-ramp on the benchmark + a review item due in the past.
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: enrolledStudentId, benchmarkId } },
    create: {
      studentId: enrolledStudentId,
      benchmarkId,
      status: 'INTERVENTION_REQUIRED',
      offRampTriggeredAt: new Date(),
    },
    update: {
      status: 'INTERVENTION_REQUIRED',
      offRampTriggeredAt: new Date(),
    },
  })
  await prisma.spacedReviewState.upsert({
    where: { studentId_benchmarkId: { studentId: enrolledStudentId, benchmarkId } },
    create: {
      studentId: enrolledStudentId,
      benchmarkId,
      dueAt: new Date(Date.now() - 86_400_000), // due yesterday
    },
    update: { dueAt: new Date(Date.now() - 86_400_000) },
  })
})

afterAll(async () => {
  const sids = [enrolledStudentId, otherStudentId].filter(Boolean)
  await prisma.spacedReviewState.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.studentProgress.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.classEnrollment.deleteMany({
    where: { classId: { in: [classAId, classBId, classEmptyId].filter(Boolean) } },
  })
  await prisma.class.deleteMany({
    where: { id: { in: [classAId, classBId, classEmptyId].filter(Boolean) } },
  })
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.teacher.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

describe('buildDailyClassReport — class scoping', () => {
  it('includes only students enrolled in the requested class', async () => {
    const report = await buildDailyClassReport(teacherUserId, classAId)
    expect(report.classInfo.id).toBe(classAId)
    expect(report.classInfo.studentCount).toBe(1)
    const ids = report.roster.map((r) => r.studentId)
    expect(ids).toContain(enrolledStudentId)
    expect(ids).not.toContain(otherStudentId)
  })

  it('does not leak the other class into class B', async () => {
    const report = await buildDailyClassReport(teacherUserId, classBId)
    const ids = report.roster.map((r) => r.studentId)
    expect(ids).toEqual([otherStudentId])
    expect(ids).not.toContain(enrolledStudentId)
  })
})

describe('buildDailyClassReport — authorization', () => {
  it('throws FORBIDDEN when the class is not the caller\'s', async () => {
    await expect(
      buildDailyClassReport(otherTeacherUserId, classAId)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('buildDailyClassReport — flags + action plan', () => {
  it('flags the off-ramp student and surfaces an OFF_RAMP action item', async () => {
    const report = await buildDailyClassReport(teacherUserId, classAId)

    const row = report.roster.find((r) => r.studentId === enrolledStudentId)
    expect(row).toBeDefined()
    expect(row!.flags).toContain('OFF_RAMP')

    expect(report.counts.offRampStudents).toBe(1)
    const offRampItem = report.actionPlan.find((a) => a.category === 'OFF_RAMP')
    expect(offRampItem).toBeDefined()
    expect(offRampItem!.studentNames.length).toBe(1)
    // Most-urgent category sorts first.
    expect(report.actionPlan[0].priority).toBe(1)
  })

  it('counts spaced-review items due today', async () => {
    const report = await buildDailyClassReport(teacherUserId, classAId)
    const row = report.roster.find((r) => r.studentId === enrolledStudentId)
    expect(row!.itemsDueToday).toBeGreaterThanOrEqual(1)
    expect(report.counts.drillItemsDue).toBeGreaterThanOrEqual(1)
  })
})

describe('buildDailyClassReport — empty class', () => {
  it('returns an empty, non-throwing report', async () => {
    const report = await buildDailyClassReport(teacherUserId, classEmptyId)
    expect(report.classInfo.studentCount).toBe(0)
    expect(report.roster).toEqual([])
    expect(report.actionPlan).toEqual([])
    expect(report.readiness).toBeNull()
  })
})
