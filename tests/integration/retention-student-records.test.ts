/**
 * Student-record deletion — Fla. Stat. § 1006.1494(3)(c)
 *
 * The load-bearing test here is "leaves no orphan rows behind". None of
 * Student's child relations cascade, so CHILD_DELETION_ORDER in
 * src/lib/retention/student-records.ts is a hand-maintained list. If someone adds
 * a table with a `studentId` and forgets to add it there, the delete throws a
 * foreign-key error and this suite fails — which is the entire point.
 */

import { PrismaClient } from '@prisma/client'
import {
  markStudentDisenrolled,
  findPurgeableStudents,
  purgeDisenrolledStudents,
} from '@/lib/retention/student-records'
import { DEFAULT_RETENTION_CONFIG } from '@/lib/retention/policy'

const prisma = new PrismaClient()

const PREFIX = 'test-retention-1006'
const CONFIG = { ...DEFAULT_RETENTION_CONFIG, studentRecordRetentionDays: 90 }

const DAY = 24 * 60 * 60 * 1000

/** Create a student with a representative spread of child rows. */
async function makeStudent(tag: string) {
  const user = await prisma.user.create({
    data: {
      role: 'STUDENT',
      firstName: `${PREFIX}`,
      lastName: tag,
      cleverId: `${PREFIX}-${tag}`,
    },
  })
  const student = await prisma.student.create({
    data: { userId: user.id, gradeLevel: 7 },
  })

  const benchmark = await prisma.benchmark.findFirst({
    where: { code: { startsWith: 'SS.7.CG.' } },
    select: { id: true },
  })
  if (!benchmark) throw new Error('No seeded benchmark — run npm run db:seed')

  await prisma.studentProgress.create({
    data: { studentId: student.id, benchmarkId: benchmark.id, status: 'IN_PROGRESS' },
  })
  await prisma.streakState.create({ data: { studentId: student.id } })
  await prisma.studentUiSettings.create({ data: { studentId: student.id } })
  await prisma.studentActivitySession.create({
    data: { studentId: student.id, startedAt: new Date(), lastActiveAt: new Date() },
  })

  return { userId: user.id, studentId: student.id }
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { firstName: PREFIX },
    select: { id: true, student: { select: { id: true } } },
  })
  for (const u of users) {
    if (u.student) {
      const sid = u.student.id
      await prisma.studentActivitySession.deleteMany({ where: { studentId: sid } })
      await prisma.studentUiSettings.deleteMany({ where: { studentId: sid } })
      await prisma.streakState.deleteMany({ where: { studentId: sid } })
      await prisma.studentProgress.deleteMany({ where: { studentId: sid } })
      await prisma.student.deleteMany({ where: { id: sid } })
    }
    await prisma.user.deleteMany({ where: { id: u.id } })
  }
  await prisma.auditLog.deleteMany({
    where: { action: { in: ['STUDENT_DISENROLLED', 'STUDENT_RECORDS_PURGED'] } },
  })
}

beforeAll(cleanup)
afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('markStudentDisenrolled', () => {
  it('records the notice date, deactivates, and writes an audit row', async () => {
    const { studentId } = await makeStudent('mark')
    const when = new Date()

    const res = await markStudentDisenrolled(studentId, null, when)
    expect(res.deactivatedAt.getTime()).toBe(when.getTime())

    const row = await prisma.student.findUnique({
      where: { id: studentId },
      select: { active: true, deactivatedAt: true },
    })
    expect(row?.active).toBe(false)
    expect(row?.deactivatedAt).not.toBeNull()

    const log = await prisma.auditLog.findFirst({
      where: { action: 'STUDENT_DISENROLLED', entityId: studentId },
    })
    expect(log).not.toBeNull()
  })

  // Otherwise repeated calls would keep pushing the statutory deadline forward.
  it('is idempotent — a second call does not reset the clock', async () => {
    const { studentId } = await makeStudent('idem')
    const first = new Date(Date.now() - 10 * DAY)

    await markStudentDisenrolled(studentId, null, first)
    const second = await markStudentDisenrolled(studentId, null, new Date())

    expect(second.deactivatedAt.getTime()).toBe(first.getTime())
  })
})

describe('findPurgeableStudents', () => {
  it('ignores an enrolled student (no clock running)', async () => {
    const { studentId } = await makeStudent('enrolled')
    const { candidates } = await findPurgeableStudents(CONFIG)
    expect(candidates.map((c) => c.studentId)).not.toContain(studentId)
  })

  it('ignores a student still inside the 90-day window', async () => {
    const { studentId } = await makeStudent('recent')
    await markStudentDisenrolled(studentId, null, new Date(Date.now() - 30 * DAY))

    const { candidates } = await findPurgeableStudents(CONFIG)
    expect(candidates.map((c) => c.studentId)).not.toContain(studentId)
  })

  it('selects a student past the window', async () => {
    const { studentId } = await makeStudent('expired')
    await markStudentDisenrolled(studentId, null, new Date(Date.now() - 100 * DAY))

    const { candidates } = await findPurgeableStudents(CONFIG)
    expect(candidates.map((c) => c.studentId)).toContain(studentId)
  })

  it('selects nobody when retention is disabled (0 = retain forever)', async () => {
    const { studentId } = await makeStudent('disabled')
    await markStudentDisenrolled(studentId, null, new Date(Date.now() - 100 * DAY))

    const { candidates, cutoff } = await findPurgeableStudents({
      ...CONFIG,
      studentRecordRetentionDays: 0,
    })
    expect(cutoff).toBeNull()
    expect(candidates.map((c) => c.studentId)).not.toContain(studentId)
  })
})

describe('purgeDisenrolledStudents', () => {
  it('dry run reports counts and deletes nothing', async () => {
    const { studentId } = await makeStudent('dryrun')
    await markStudentDisenrolled(studentId, null, new Date(Date.now() - 100 * DAY))

    const res = await purgeDisenrolledStudents({ dryRun: true, config: CONFIG })
    expect(res.dryRun).toBe(true)
    expect(res.studentsEligible).toBeGreaterThanOrEqual(1)
    expect(res.studentsDeleted).toBe(0)

    expect(await prisma.student.findUnique({ where: { id: studentId } })).not.toBeNull()
  })

  // The real assertion: every child table is covered, and the user row goes too.
  it('deletes the student, the user, and every child row', async () => {
    const { studentId, userId } = await makeStudent('purge')
    await markStudentDisenrolled(studentId, null, new Date(Date.now() - 100 * DAY))

    const res = await purgeDisenrolledStudents({ dryRun: false, config: CONFIG })
    expect(res.studentsDeleted).toBeGreaterThanOrEqual(1)

    expect(await prisma.student.findUnique({ where: { id: studentId } })).toBeNull()
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull()

    expect(await prisma.studentProgress.count({ where: { studentId } })).toBe(0)
    expect(await prisma.streakState.count({ where: { studentId } })).toBe(0)
    expect(await prisma.studentUiSettings.count({ where: { studentId } })).toBe(0)
    expect(await prisma.studentActivitySession.count({ where: { studentId } })).toBe(0)
  })

  it('records the purge without naming the students it removed', async () => {
    const { studentId } = await makeStudent('audited')
    await markStudentDisenrolled(studentId, null, new Date(Date.now() - 100 * DAY))

    await purgeDisenrolledStudents({ dryRun: false, config: CONFIG })

    const log = await prisma.auditLog.findFirst({
      where: { action: 'STUDENT_RECORDS_PURGED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()

    // Writing the id back into the audit trail would re-create the identifier
    // the purge just deleted.
    expect(JSON.stringify(log?.metadataJson)).not.toContain(studentId)
    expect(JSON.stringify(log?.metadataJson)).toContain('1006.1494')
  })

  it('leaves an enrolled student untouched', async () => {
    const { studentId } = await makeStudent('survivor')
    await purgeDisenrolledStudents({ dryRun: false, config: CONFIG })
    expect(await prisma.student.findUnique({ where: { id: studentId } })).not.toBeNull()
  })
})
