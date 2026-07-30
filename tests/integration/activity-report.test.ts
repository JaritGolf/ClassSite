/**
 * Integration — activity session reporting.
 *
 * getClassSessionActivity / getLivePresence / getStudentSessionHistory must:
 *   1. Refuse a class the caller does not own (roster IDOR guard → FORBIDDEN).
 *   2. Scope strictly to the requested class.
 *   3. Attribute work to the session whose window contains it, and NOT to a
 *      session that ended before it.
 *   4. Exclude voided attempts.
 *   5. Keep students with zero activity visible (a student who never logged on
 *      is exactly what the teacher needs to see).
 *   6. Classify live presence by recency of last activity.
 *
 * Prefix: test-actrep- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  getClassSessionActivity,
  getLivePresence,
  getStudentSessionHistory,
  touchActivity,
} from '@/lib/activity-sessions'
import { RosterError } from '@/lib/teacher-roster'

const prisma = new PrismaClient()

const PREFIX = 'test-actrep-'

let teacherUserId: string
let otherTeacherUserId: string
let classId: string
let otherClassId: string
let workerStudentId: string // has sessions + graded work
let idleStudentId: string // enrolled, never logged on
let benchmarkId: string
let assessmentId: string
let questionId: string

const T0 = new Date('2026-07-20T08:00:00.000Z')
const at = (minutes: number): Date => new Date(T0.getTime() + minutes * 60_000)

async function mkUser(suffix: string, role: 'TEACHER' | 'STUDENT') {
  return prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'ActRep',
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
  const benchmark = await prisma.benchmark.findFirstOrThrow({
    where: { code: 'SS.7.CG.1.1' },
    select: { id: true },
  })
  benchmarkId = benchmark.id

  const question = await prisma.question.findFirstOrThrow({
    where: { benchmarkId },
    select: { id: true },
  })
  questionId = question.id

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
  const otherTeacher = await prisma.teacher.upsert({
    where: { userId: otherTeacherUserId },
    update: {},
    create: { userId: otherTeacherUserId },
    select: { id: true },
  })

  workerStudentId = await mkStudent('worker')
  idleStudentId = await mkStudent('idle')

  classId = await mkClass(teacher.id, 'ActRep Own')
  otherClassId = await mkClass(otherTeacher.id, 'ActRep Foreign')

  for (const studentId of [workerStudentId, idleStudentId]) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId } },
      create: { classId, studentId, status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    })
  }

  // A dedicated assessment so attempt numbering cannot collide with seed data.
  const assessment = await prisma.assessment.create({
    data: {
      benchmark: { connect: { id: benchmarkId } },
      assessmentType: 'PRACTICE',
      title: `${PREFIX}assessment`,
    },
    select: { id: true },
  })
  assessmentId = assessment.id

  // ── Two distinct sessions, hours apart ────────────────────────────────────
  // Session 1: 08:00–08:20. Session 2: 12:00–12:10.
  await touchActivity(workerStudentId, { at: T0, area: 'mission' })
  await touchActivity(workerStudentId, { at: at(10), area: 'mission' })
  await touchActivity(workerStudentId, { at: at(20), area: 'drill' })
  await touchActivity(workerStudentId, { at: at(240), area: 'assessment' })
  await touchActivity(workerStudentId, { at: at(250), area: 'assessment' })

  // Work INSIDE session 1: a submitted attempt + a drill review.
  await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      studentId: workerStudentId,
      attemptNumber: 1,
      startedAt: at(5),
      submittedAt: at(12),
      score: 90,
      passed: true,
      responses: {
        create: [
          { questionId, responseJson: {}, isCorrect: true, pointsAwarded: 1 },
        ],
      },
    },
  })
  await prisma.spacedReviewEvent.create({
    data: {
      studentId: workerStudentId,
      benchmarkId,
      questionId,
      quality: 5,
      isCorrect: true,
      occurredAt: at(18),
    },
  })

  // A VOIDED attempt inside session 1 — must be ignored entirely.
  await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      studentId: workerStudentId,
      attemptNumber: 2,
      startedAt: at(6),
      submittedAt: at(14),
      score: 10,
      passed: false,
      voided: true,
    },
  })

  // Work INSIDE session 2 only.
  await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      studentId: workerStudentId,
      attemptNumber: 3,
      startedAt: at(242),
      submittedAt: at(248),
      score: 75,
      passed: false,
    },
  })
})

afterAll(async () => {
  const sids = [workerStudentId, idleStudentId].filter(Boolean)
  await prisma.studentActivitySession.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.spacedReviewEvent.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.attemptResponse.deleteMany({
    where: { attempt: { studentId: { in: sids } } },
  })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.classEnrollment.deleteMany({
    where: { classId: { in: [classId, otherClassId].filter(Boolean) } },
  })
  await prisma.class.deleteMany({
    where: { id: { in: [classId, otherClassId].filter(Boolean) } },
  })
  await prisma.student.deleteMany({ where: { id: { in: sids } } })
  await prisma.teacher.deleteMany({
    where: { userId: { in: [teacherUserId, otherTeacherUserId].filter(Boolean) } },
  })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

const FULL_RANGE = { from: new Date(T0.getTime() - 86_400_000), to: at(600) }

describe('authorization — roster IDOR guard', () => {
  it('refuses a class the teacher does not own (class activity)', async () => {
    await expect(
      getClassSessionActivity(teacherUserId, otherClassId, FULL_RANGE)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('refuses a class the teacher does not own (live presence)', async () => {
    await expect(
      getLivePresence(teacherUserId, otherClassId)
    ).rejects.toBeInstanceOf(RosterError)
  })

  it('refuses a nonexistent class', async () => {
    await expect(
      getClassSessionActivity(teacherUserId, 'no-such-class', FULL_RANGE)
    ).rejects.toBeInstanceOf(RosterError)
  })

  it('allows the owning teacher', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    expect(report.classInfo.id).toBe(classId)
  })
})

describe('session windows and progress attribution', () => {
  it('splits activity into the correct number of sessions', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const sessions = report.sessionsByStudent[workerStudentId]
    expect(sessions).toHaveLength(2)
    // Newest first.
    expect(sessions[0].startedAt).toEqual(at(240))
    expect(sessions[1].startedAt).toEqual(T0)
  })

  it('attributes work to the session whose window contains it', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const [second, first] = report.sessionsByStudent[workerStudentId]

    // Session 1 (08:00–08:20): the 90% attempt and the drill review.
    expect(first.progress.assessmentsSubmitted).toBe(1)
    expect(first.progress.assessmentScores).toEqual([90])
    expect(first.progress.drillReviews).toBe(1)
    expect(first.progress.drillCorrect).toBe(1)
    expect(first.progress.questionsAnswered).toBe(1)

    // Session 2 (12:00–12:10): only the 75% attempt, and no drill review.
    expect(second.progress.assessmentsSubmitted).toBe(1)
    expect(second.progress.assessmentScores).toEqual([75])
    expect(second.progress.drillReviews).toBe(0)
  })

  it('excludes voided attempts from session progress', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const first = report.sessionsByStudent[workerStudentId][1]
    // Two attempts were submitted inside session 1, but one is voided.
    expect(first.progress.assessmentsSubmitted).toBe(1)
    expect(first.progress.assessmentScores).not.toContain(10)
  })

  it('reports active time below the wall-clock span', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const first = report.sessionsByStudent[workerStudentId][1]
    // 20 minutes of wall clock, but the touches were 10 minutes apart so the
    // bounded delta credits only ~90s each.
    expect(first.spanMinutes).toBe(20)
    expect(first.activeMinutes).toBeLessThan(first.spanMinutes)
  })

  it('breaks time down by app area', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const first = report.sessionsByStudent[workerStudentId][1]
    const areas = first.areas.map((a) => a.area)
    expect(areas).toContain('mission')
  })

  it('excludes sessions outside the requested range', async () => {
    // A window covering only session 2.
    const report = await getClassSessionActivity(teacherUserId, classId, {
      from: at(200),
      to: at(600),
    })
    expect(report.sessionsByStudent[workerStudentId]).toHaveLength(1)
    expect(report.sessionsByStudent[workerStudentId][0].startedAt).toEqual(at(240))
  })
})

describe('class rollup', () => {
  it('keeps a student who never logged on visible, with zeroes', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const idle = report.summaries.find((s) => s.studentId === idleStudentId)
    expect(idle).toBeDefined()
    expect(idle?.sessionCount).toBe(0)
    expect(idle?.totalActiveMinutes).toBe(0)
    expect(idle?.lastActiveAt).toBeNull()
  })

  it('counts students with and without activity', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    expect(report.totals.studentsWithActivity).toBe(1)
    expect(report.totals.studentsWithNoActivity).toBe(1)
    expect(report.totals.sessionCount).toBe(2)
  })

  it('sums per-student progress across sessions', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    const worker = report.summaries.find((s) => s.studentId === workerStudentId)
    expect(worker?.progress.assessmentsSubmitted).toBe(2)
    expect(worker?.progress.drillReviews).toBe(1)
  })

  it('does not leak students from another class', async () => {
    const report = await getClassSessionActivity(teacherUserId, classId, FULL_RANGE)
    expect(report.summaries).toHaveLength(2)
    expect(report.classInfo.studentCount).toBe(2)
  })
})

describe('getStudentSessionHistory', () => {
  it('returns sessions newest first with progress attached', async () => {
    const history = await getStudentSessionHistory(workerStudentId, {
      from: FULL_RANGE.from,
      to: FULL_RANGE.to,
    })
    expect(history).toHaveLength(2)
    expect(history[0].startedAt.getTime()).toBeGreaterThan(
      history[1].startedAt.getTime()
    )
    expect(history[1].progress.drillReviews).toBe(1)
  })

  it('returns an empty array for a student with no sessions', async () => {
    const history = await getStudentSessionHistory(idleStudentId, {
      from: FULL_RANGE.from,
      to: FULL_RANGE.to,
    })
    expect(history).toEqual([])
  })
})

describe('getLivePresence', () => {
  it('classifies a student who just acted as online, with their current area', async () => {
    // A brand-new session has no accumulated area seconds — the live panel must
    // still report where the student is, from the touch itself.
    await touchActivity(workerStudentId, { at: new Date(), area: 'drill' })
    const presence = await getLivePresence(teacherUserId, classId)

    expect(presence.onNow.map((r) => r.studentId)).toContain(workerStudentId)
    const row = presence.onNow.find((r) => r.studentId === workerStudentId)
    expect(row?.currentArea).toEqual({ area: 'drill', label: 'Daily Drill' })
  })

  it('classifies a student with no activity today as offline', async () => {
    const presence = await getLivePresence(teacherUserId, classId)
    expect(presence.offline.map((r) => r.studentId)).toContain(idleStudentId)
    const row = presence.offline.find((r) => r.studentId === idleStudentId)
    expect(row?.lastActiveAt).toBeNull()
    expect(row?.activeMinutes).toBe(0)
  })

  it('places every enrolled student in exactly one bucket', async () => {
    const presence = await getLivePresence(teacherUserId, classId)
    const total =
      presence.onNow.length + presence.idle.length + presence.offline.length
    expect(total).toBe(2)
  })
})
