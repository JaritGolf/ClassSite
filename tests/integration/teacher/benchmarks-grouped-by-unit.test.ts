/**
 * Integration Tests — getBenchmarksGroupedByUnit
 *
 * Confirms the /teacher/benchmarks list page's data source groups every
 * active unit's benchmarks in sequence order and never omits a benchmark
 * just because no student has attempted it yet (the bug the reorg fixes).
 *
 * Prefix: test-tb-grp- to avoid collision.
 */

import { PrismaClient } from '@prisma/client'
import { getBenchmarksGroupedByUnit } from '@/lib/class-analytics'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let studentId: string
let untouchedBenchmarkId: string
let masteredBenchmarkId: string

const T_CLEVERID = 'test-tb-grp-teacher-001'
const S_CLEVERID = 'test-tb-grp-student-001'

beforeAll(async () => {
  const activeUnits = await prisma.unit.findMany({
    where: { active: true },
    orderBy: { sequenceOrder: 'asc' },
    include: { benchmarks: { orderBy: { sequenceOrder: 'asc' }, select: { id: true } } },
  })
  const unitWithTwo = activeUnits.find((u) => u.benchmarks.length >= 2)
  if (!unitWithTwo) throw new Error('No active unit with 2+ benchmarks — run seed first')
  untouchedBenchmarkId = unitWithTwo.benchmarks[0].id
  masteredBenchmarkId = unitWithTwo.benchmarks[1].id

  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'TbGrp', lastName: 'Teacher',
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
      firstName: 'TbGrp', lastName: 'Student',
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
    data: { teacherId, name: 'TbGrp Test Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })

  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId: masteredBenchmarkId } },
    create: { studentId, benchmarkId: masteredBenchmarkId, status: 'MASTERED' },
    update: { status: 'MASTERED' },
  })
})

afterAll(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('getBenchmarksGroupedByUnit', () => {
  it('includes every active unit, sorted by unitSequenceOrder', async () => {
    const groups = await getBenchmarksGroupedByUnit(teacherUserId)
    const activeUnitCount = await prisma.unit.count({ where: { active: true } })
    expect(groups).toHaveLength(activeUnitCount)
    const orders = groups.map((g) => g.unitSequenceOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('sorts benchmarks within a unit by sequenceOrder', async () => {
    const groups = await getBenchmarksGroupedByUnit(teacherUserId)
    for (const group of groups) {
      const orders = group.benchmarks.map((b) => b.sequenceOrder)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    }
  })

  it('includes a benchmark with zero student attempts, marked hasData:false', async () => {
    const groups = await getBenchmarksGroupedByUnit(teacherUserId)
    const row = groups.flatMap((g) => g.benchmarks).find((b) => b.benchmarkId === untouchedBenchmarkId)
    expect(row).toBeDefined()
    expect(row?.hasData).toBe(false)
    expect(row?.totalStudents).toBe(0)
    expect(row?.masteredCount).toBe(0)
    expect(row?.masteryRatePercent).toBe(0)
  })

  it('reflects real mastery data for an attempted benchmark, marked hasData:true', async () => {
    const groups = await getBenchmarksGroupedByUnit(teacherUserId)
    const row = groups.flatMap((g) => g.benchmarks).find((b) => b.benchmarkId === masteredBenchmarkId)
    expect(row).toBeDefined()
    expect(row?.hasData).toBe(true)
    expect(row?.totalStudents).toBe(1)
    expect(row?.masteredCount).toBe(1)
    expect(row?.masteryRatePercent).toBe(100)
  })
})
