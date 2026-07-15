/**
 * Integration — Teacher roster-scope guard (IDOR regression).
 *
 * applyTeacherOverride and setAccommodation must refuse to act on a student who
 * is NOT enrolled in one of the calling teacher's classes. Before this guard,
 * any authenticated teacher could mutate any student's mastery progress or
 * accommodations across the district by passing an arbitrary studentId.
 *
 * Prefix: test-idor- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import { applyTeacherOverride, OverrideError } from '@/lib/mastery'
import { setAccommodation, AccommodationError } from '@/lib/reading-load'
import { enrollStudentWithTeacher, cleanupTestRoster } from '../helpers/roster'

const prisma = new PrismaClient()

let teacherUserId: string
let enrolledStudentId: string
let outsiderStudentId: string
let benchmarkId: string

const PREFIX = 'test-idor-'

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findFirstOrThrow({
    where: { code: 'SS.7.CG.1.1' },
    select: { id: true },
  })
  benchmarkId = benchmark.id

  const teacherUser = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}teacher` },
    update: {},
    create: {
      cleverId: `${PREFIX}teacher`,
      firstName: 'Idor',
      lastName: 'Teacher',
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: {},
    create: { userId: teacherUserId },
  })

  const mk = async (suffix: string) => {
    const u = await prisma.user.upsert({
      where: { cleverId: `${PREFIX}${suffix}` },
      update: {},
      create: {
        cleverId: `${PREFIX}${suffix}`,
        firstName: 'Idor',
        lastName: suffix,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
    const s = await prisma.student.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, gradeLevel: 7 },
      select: { id: true },
    })
    return s.id
  }
  enrolledStudentId = await mk('enrolled')
  outsiderStudentId = await mk('outsider')

  // Only the enrolled student joins the teacher's class.
  await enrollStudentWithTeacher(prisma, teacherUserId, enrolledStudentId)
})

afterAll(async () => {
  const sids = [enrolledStudentId, outsiderStudentId].filter(Boolean)
  await prisma.auditLog.deleteMany({
    where: { actorUserId: teacherUserId },
  })
  await prisma.teacherOverride.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.studentProgress.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.studentAccommodation.deleteMany({ where: { studentId: { in: sids } } })
  await cleanupTestRoster(prisma, teacherUserId)
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.teacher.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

describe('applyTeacherOverride roster scope', () => {
  it('succeeds for a student in the teacher\'s class', async () => {
    const result = await applyTeacherOverride(
      teacherUserId,
      enrolledStudentId,
      benchmarkId,
      'UNLOCK_BENCHMARK',
      'roster-scope test — enrolled'
    )
    expect(result.overrideId).toBeTruthy()
  })

  it('throws FORBIDDEN for a student NOT in the teacher\'s class (IDOR)', async () => {
    await expect(
      applyTeacherOverride(
        teacherUserId,
        outsiderStudentId,
        benchmarkId,
        'UNLOCK_BENCHMARK',
        'roster-scope test — outsider'
      )
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    // Nothing was written for the outsider.
    const overrides = await prisma.teacherOverride.count({
      where: { studentId: outsiderStudentId },
    })
    expect(overrides).toBe(0)
  })
})

describe('setAccommodation roster scope', () => {
  it('succeeds for a student in the teacher\'s class', async () => {
    const result = await setAccommodation(
      teacherUserId,
      enrolledStudentId,
      'ACC-EXT-TIME',
      true
    )
    expect(result.accommodationCode).toBe('ACC-EXT-TIME')
  })

  it('throws FORBIDDEN for a student NOT in the teacher\'s class (IDOR)', async () => {
    await expect(
      setAccommodation(teacherUserId, outsiderStudentId, 'ACC-EXT-TIME', true)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const accs = await prisma.studentAccommodation.count({
      where: { studentId: outsiderStudentId },
    })
    expect(accs).toBe(0)
  })
})

// Reference the imported error classes so tsc/eslint keep the intent explicit.
void OverrideError
void AccommodationError
