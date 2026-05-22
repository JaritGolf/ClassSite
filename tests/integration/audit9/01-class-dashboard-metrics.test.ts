/**
 * Audit 9 — Item 1: Class dashboard surfaces all metrics in §22.2
 *
 * Asserts one assertion per §22.2 metric:
 *   - statusDistribution (9 keys)
 *   - masteryByBenchmark
 *   - masteryByReportingCategory
 *   - masteryByUnit
 *   - mostMissedQuestions
 *   - commonMisconceptions
 *   - studentsNeedingAction
 *   - remediationCompletion
 *   - recommendedSmallGroups
 *   - eocReadinessTrend
 *   - offRampStudents
 *   - classDecayRates (from spaced-retrieval)
 */

import { PrismaClient } from '@prisma/client'
import {
  getClassStatusDistribution,
  getClassMasteryByBenchmark,
  getClassMasteryByReportingCategory,
  getClassMasteryByUnit,
  getMostMissedQuestions,
  getCommonMisconceptions,
  getStudentsNeedingAction,
  getRemediationCompletionStatus,
  getRecommendedSmallGroups,
  getEocReadinessTrend,
  getOffRampStudents,
} from '@/lib/class-analytics'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'
import { getTeacherRoster } from '@/lib/teacher-roster'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let studentId: string

const T_CLEVERID = 'test-audit9-01-teacher'
const S_CLEVERID = 'test-audit9-01-student'

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Audit9', lastName: 'Teacher',
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
      firstName: 'Audit9', lastName: 'Student',
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
      name: 'Audit 9 Item 1 Test Class',
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
})

afterAll(async () => {
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 9 Item 1 — §22.2 class dashboard metrics', () => {
  it('1. statusDistribution has all 9 status keys', async () => {
    const dist = await getClassStatusDistribution(teacherUserId)
    const keys = Object.keys(dist)
    expect(keys).toHaveLength(9)
    expect(keys).toContain('mastered')
    expect(keys).toContain('notStarted')
  })

  it('2. masteryByBenchmark returns an array', async () => {
    const rows = await getClassMasteryByBenchmark(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('3. masteryByReportingCategory returns an array', async () => {
    const rows = await getClassMasteryByReportingCategory(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('4. masteryByUnit returns an array', async () => {
    const rows = await getClassMasteryByUnit(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('5. mostMissedQuestions returns an array', async () => {
    const rows = await getMostMissedQuestions(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('6. commonMisconceptions returns an array', async () => {
    const rows = await getCommonMisconceptions(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('7. studentsNeedingAction returns an array', async () => {
    const rows = await getStudentsNeedingAction(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('8. remediationCompletion returns an array', async () => {
    const rows = await getRemediationCompletionStatus(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('9. recommendedSmallGroups returns an array', async () => {
    const groups = await getRecommendedSmallGroups(teacherUserId)
    expect(Array.isArray(groups)).toBe(true)
  })

  it('10. eocReadinessTrend returns an array', async () => {
    const points = await getEocReadinessTrend(teacherUserId)
    expect(Array.isArray(points)).toBe(true)
  })

  it('11. offRampStudents returns an array', async () => {
    const rows = await getOffRampStudents(teacherUserId)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('12. classDecayRates returns an array', async () => {
    const roster = await getTeacherRoster(teacherUserId)
    const rates = await getClassDecayRates(roster.teacherId)
    expect(Array.isArray(rates)).toBe(true)
  })
})
