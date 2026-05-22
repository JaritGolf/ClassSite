/**
 * Integration Tests — Teacher Class Dashboard
 *
 * Tests that GET /api/teacher/dashboard returns all §22.2 metrics.
 * Tests that GET /api/teacher/classes returns the teacher's roster.
 *
 * Uses real DB with test fixtures.
 * Prefix: test-phase9a- (avoids collision with other phases).
 */

import { PrismaClient } from '@prisma/client'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getClassStatusDistribution } from '@/lib/class-analytics'

const prisma = new PrismaClient()

// ── Fixtures ──────────────────────────────────────────────────────────────────

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string

const T_CLEVERID = 'test-phase9a-teacher-001'
const S_CLEVERID = 'test-phase9a-student-001'

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Phase9A', lastName: 'Teacher',
      role: 'TEACHER',
    },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    create: { userId: teacherUserId, schoolId: 'test-school-phase9a' },
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
      firstName: 'Phase9A', lastName: 'Student',
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

  // Class
  const cls = await prisma.class.upsert({
    where: { id: classId ?? 'placeholder' },
    create: {
      teacherId,
      name: 'Phase 9A Test Class',
      period: '1',
      schoolYear: '2025-2026',
    },
    update: {},
    select: { id: true },
  }).catch(() =>
    prisma.class.create({
      data: {
        teacherId,
        name: 'Phase 9A Test Class',
        period: '1',
        schoolYear: '2025-2026',
      },
      select: { id: true },
    })
  )
  classId = cls.id

  // Enrollment
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })
})

afterAll(async () => {
  // Clean up in FK-safe order
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  // Teacher deleted by cascade when User is deleted
  await prisma.$disconnect()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getTeacherRoster', () => {
  it('returns teacherId and schoolId', async () => {
    const roster = await getTeacherRoster(teacherUserId)
    expect(roster.teacherId).toBe(teacherId)
    expect(roster.schoolId).toBe('test-school-phase9a')
  })

  it('returns classes with student IDs', async () => {
    const roster = await getTeacherRoster(teacherUserId)
    expect(roster.classes.length).toBeGreaterThanOrEqual(1)
    const cls = roster.classes.find((c) => c.id === classId)
    expect(cls).toBeDefined()
    expect(cls!.studentIds).toContain(studentId)
  })

  it('allStudentIds contains the enrolled student', async () => {
    const roster = await getTeacherRoster(teacherUserId)
    expect(roster.allStudentIds).toContain(studentId)
  })

  it('throws FORBIDDEN for a non-teacher user', async () => {
    const fakeUserId = 'non-existent-user-id'
    await expect(getTeacherRoster(fakeUserId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('getClassStatusDistribution', () => {
  it('returns all 9 status keys with numeric values', async () => {
    const dist = await getClassStatusDistribution(teacherUserId)
    const expectedKeys = [
      'notStarted', 'inProgress', 'readyForMastery', 'needsRemediation',
      'remediationComplete', 'mastered', 'exposureComplete', 'teacherOverride',
      'interventionRequired',
    ]
    for (const key of expectedKeys) {
      expect(typeof dist[key as keyof typeof dist]).toBe('number')
    }
  })

  it('all counts are non-negative', async () => {
    const dist = await getClassStatusDistribution(teacherUserId)
    for (const val of Object.values(dist)) {
      expect(val).toBeGreaterThanOrEqual(0)
    }
  })
})
