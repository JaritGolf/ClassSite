/**
 * Integration — student activity sessions (write path + retention).
 *
 * touchActivity must:
 *   1. Open a session on first activity.
 *   2. Extend the open session for activity inside the gap threshold.
 *   3. Close the old session and open a new one past the threshold.
 *   4. Debounce near-simultaneous touches (a heartbeat next to a submit).
 *   5. Never credit a long idle gap as work (bounded delta).
 *   6. Track time per app area.
 *
 * Plus: STUDENT_LOGIN audit + startedByLogin flag, closeStaleSessions, and the
 * retention purge branch for activity rows.
 *
 * Prefix: test-activity- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  ACTIVE_DELTA_CAP_SECONDS,
  SESSION_GAP_MINUTES,
  closeStaleSessions,
  touchActivity,
} from '@/lib/activity-sessions'
import { recordStudentLoginEvent } from '@/lib/activity-sessions/login'
import { purgeExpiredData } from '@/lib/retention/purge'

const prisma = new PrismaClient()

const PREFIX = 'test-activity-'

let studentUserId: string
let studentId: string
let teacherUserId: string

async function mkUser(suffix: string, role: 'TEACHER' | 'STUDENT') {
  return prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'Activity',
      lastName: suffix,
      role,
      status: 'ACTIVE',
    },
  })
}

/** Wipe this student's sessions so each test starts from a known state. */
async function resetSessions() {
  await prisma.studentActivitySession.deleteMany({ where: { studentId } })
}

beforeAll(async () => {
  const studentUser = await mkUser('student', 'STUDENT')
  studentUserId = studentUser.id
  const student = await prisma.student.upsert({
    where: { userId: studentUserId },
    update: {},
    create: { userId: studentUserId, gradeLevel: 7 },
    select: { id: true },
  })
  studentId = student.id

  // A teacher-role user, to prove the login recorder ignores non-students.
  const teacherUser = await mkUser('teacher', 'TEACHER')
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: {},
    create: { userId: teacherUserId },
  })
})

afterAll(async () => {
  await prisma.studentActivitySession.deleteMany({ where: { studentId } })
  await prisma.auditLog.deleteMany({
    where: { actorUserId: { in: [studentUserId, teacherUserId] } },
  })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

beforeEach(resetSessions)

const T0 = new Date('2026-07-30T08:00:00.000Z')
const at = (minutes: number, seconds = 0): Date =>
  new Date(T0.getTime() + minutes * 60_000 + seconds * 1000)

describe('touchActivity — opening and extending sessions', () => {
  it('opens a session on first activity', async () => {
    const result = await touchActivity(studentId, { at: T0, area: 'dashboard' })

    expect(result.outcome).toBe('opened')
    const rows = await prisma.studentActivitySession.findMany({ where: { studentId } })
    expect(rows).toHaveLength(1)
    expect(rows[0].startedAt).toEqual(T0)
    expect(rows[0].lastActiveAt).toEqual(T0)
    expect(rows[0].endedAt).toBeNull()
    // The opening instant is a point in time, not a duration.
    expect(rows[0].activeSeconds).toBe(0)
  })

  it('extends the same session for activity inside the gap', async () => {
    await touchActivity(studentId, { at: T0, area: 'mission' })
    const second = await touchActivity(studentId, { at: at(1), area: 'mission' })
    const third = await touchActivity(studentId, { at: at(2), area: 'mission' })

    expect(second.outcome).toBe('extended')
    expect(third.outcome).toBe('extended')
    expect(second.sessionId).toBe(third.sessionId)

    const rows = await prisma.studentActivitySession.findMany({ where: { studentId } })
    expect(rows).toHaveLength(1)
    expect(rows[0].lastActiveAt).toEqual(at(2))
    expect(rows[0].activeSeconds).toBe(120)
  })

  it('debounces a touch that lands seconds after another', async () => {
    // A submit and a heartbeat arriving together must not double-count.
    await touchActivity(studentId, { at: T0, area: 'assessment' })
    await touchActivity(studentId, { at: at(1), area: 'assessment' })
    const result = await touchActivity(studentId, { at: at(1, 3), area: 'assessment' })

    expect(result.outcome).toBe('debounced')
    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    // lastActiveAt unchanged by the debounced touch.
    expect(row.lastActiveAt).toEqual(at(1))
    expect(row.activeSeconds).toBe(60)
  })

  it('closes the old session and opens a new one past the gap', async () => {
    await touchActivity(studentId, { at: T0, area: 'mission' })
    await touchActivity(studentId, { at: at(10), area: 'mission' })
    const next = await touchActivity(studentId, {
      at: at(10 + SESSION_GAP_MINUTES + 1),
      area: 'drill',
    })

    expect(next.outcome).toBe('opened')

    const rows = await prisma.studentActivitySession.findMany({
      where: { studentId },
      orderBy: { startedAt: 'asc' },
    })
    expect(rows).toHaveLength(2)
    // The first session ends at its OWN last activity, not at the new touch —
    // the intervening idle time was not work.
    expect(rows[0].endedAt).toEqual(at(10))
    expect(rows[1].startedAt).toEqual(at(10 + SESSION_GAP_MINUTES + 1))
    expect(rows[1].endedAt).toBeNull()
  })

  it('never credits a long idle gap as active time', async () => {
    await touchActivity(studentId, { at: T0, area: 'mission' })
    // Still inside the session window, but a long silence: the client stops
    // pinging when the tab is hidden, so this is exactly the real-world case.
    await touchActivity(studentId, { at: at(SESSION_GAP_MINUTES - 1), area: 'mission' })

    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.activeSeconds).toBe(ACTIVE_DELTA_CAP_SECONDS)
    // The wall-clock span still reflects the full stretch.
    expect(row.lastActiveAt.getTime() - row.startedAt.getTime()).toBe(
      (SESSION_GAP_MINUTES - 1) * 60_000
    )
  })

  it('accumulates elapsed time against the area the student was already in', async () => {
    await touchActivity(studentId, { at: T0, area: 'mission' })
    await touchActivity(studentId, { at: at(1), area: 'mission' })
    await touchActivity(studentId, { at: at(2), area: 'mission' })
    // This ping reports 'drill', but the minute that just elapsed was spent on
    // the mission — the drill time gets credited by the NEXT ping.
    await touchActivity(studentId, { at: at(3), area: 'drill' })

    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.areaSeconds).toEqual({ mission: 180 })
    // ...and the student's current location is the drill.
    expect(row.lastArea).toBe('drill')

    await touchActivity(studentId, { at: at(4), area: 'drill' })
    const after = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(after.areaSeconds).toEqual({ mission: 180, drill: 60 })
  })

  it('knows where a just-arrived student is before any time accrues', async () => {
    // The live panel must be able to answer "what are they working on" from the
    // very first ping, when no area seconds have accumulated yet.
    await touchActivity(studentId, { at: T0, area: 'mission' })
    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.activeSeconds).toBe(0)
    expect(row.areaSeconds).toEqual({})
    expect(row.lastArea).toBe('mission')
  })

  it('updates the current area on a debounced touch without adding time', async () => {
    await touchActivity(studentId, { at: T0, area: 'mission' })
    await touchActivity(studentId, { at: at(1), area: 'mission' })
    const result = await touchActivity(studentId, { at: at(1, 2), area: 'drill' })

    expect(result.outcome).toBe('debounced')
    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.lastArea).toBe('drill')
    expect(row.activeSeconds).toBe(60)
  })
})

describe('closeStaleSessions', () => {
  it('closes an abandoned session at its own last activity', async () => {
    const longAgo = new Date(Date.now() - 60 * 60 * 1000)
    await touchActivity(studentId, { at: longAgo, area: 'mission' })

    const closed = await closeStaleSessions([studentId])
    expect(closed).toBe(1)

    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.endedAt).toEqual(row.lastActiveAt)
  })

  it('leaves a live session open', async () => {
    await touchActivity(studentId, { at: new Date(), area: 'mission' })
    expect(await closeStaleSessions([studentId])).toBe(0)
    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.endedAt).toBeNull()
  })

  it('is a no-op for an empty student list', async () => {
    expect(await closeStaleSessions([])).toBe(0)
  })
})

describe('recordStudentLoginEvent', () => {
  it('writes a STUDENT_LOGIN audit row and flags the session', async () => {
    const wrote = await recordStudentLoginEvent(studentUserId)
    expect(wrote).toBe(true)

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: studentUserId, action: 'STUDENT_LOGIN' },
    })
    expect(log).not.toBeNull()
    expect(log?.entityType).toBe('User')

    const row = await prisma.studentActivitySession.findFirstOrThrow({
      where: { studentId },
    })
    expect(row.startedByLogin).toBe(true)
  })

  it('ignores non-student roles', async () => {
    expect(await recordStudentLoginEvent(teacherUserId)).toBe(false)
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'STUDENT_LOGIN' },
    })
    expect(log).toBeNull()
  })

  it('ignores an empty user id', async () => {
    expect(await recordStudentLoginEvent('')).toBe(false)
  })
})

describe('retention purge — activity sessions', () => {
  const CONFIG = {
    auditLogRetentionDays: 0,
    voidedAttemptRetentionDays: 0,
    activitySessionRetentionDays: 30,
    suggestionRetentionDays: 0,
    studentRecordRetentionDays: 0,
  }

  it('reports aged sessions in a dry run without deleting them', async () => {
    const ancient = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    await touchActivity(studentId, { at: ancient, area: 'mission' })

    const result = await purgeExpiredData({ dryRun: true, config: CONFIG })
    expect(result.activitySessionsDeleted).toBeGreaterThanOrEqual(1)
    expect(
      await prisma.studentActivitySession.count({ where: { studentId } })
    ).toBe(1)
  })

  it('retains everything when the threshold is unset', async () => {
    const ancient = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    await touchActivity(studentId, { at: ancient, area: 'mission' })

    const result = await purgeExpiredData({
      dryRun: true,
      config: { ...CONFIG, activitySessionRetentionDays: 0 },
    })
    expect(result.activitySessionsDeleted).toBe(0)
  })
})
