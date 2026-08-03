/**
 * Integration — assessment integrity (Focus Mode records).
 *
 * The client is untrusted, so the value of this feature rests entirely on the
 * server-side guards. These tests exercise each one, plus the two-gate
 * resolution and the teacher-facing surfacing.
 *
 * Prefix: test-integrity- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  recordIntegrityEvents,
  getIntegrityEventsForAttempt,
  resolveSecureMode,
  resolveSecureModeForStudent,
  isSecureAssessmentEnabled,
  MAX_EVENTS_PER_ATTEMPT,
} from '@/lib/assessment-integrity'
import { getStudentProfileForTeacher } from '@/lib/student-profile'
import { enrollStudentWithTeacher, cleanupTestRoster } from '../helpers/roster'

const prisma = new PrismaClient()

const PREFIX = 'test-integrity-'

let teacherUserId: string
let studentId: string
let otherStudentId: string
let assessmentId: string
let attemptId: string
let classId: string

const ORIGINAL_FLAG = process.env.FEATURE_SECURE_ASSESSMENT

async function makeStudent(suffix: string): Promise<string> {
  const u = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'Integrity',
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

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}teacher` },
    update: {},
    create: {
      cleverId: `${PREFIX}teacher`,
      firstName: 'Integrity',
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

  studentId = await makeStudent('student')
  otherStudentId = await makeStudent('other')
  const enrolled = await enrollStudentWithTeacher(prisma, teacherUserId, studentId)
  classId = enrolled.classId

  const benchmark = await prisma.benchmark.findFirstOrThrow({
    where: { code: 'SS.7.CG.1.1' },
    select: { id: true },
  })

  const assessment = await prisma.assessment.create({
    data: {
      title: `${PREFIX}mastery`,
      assessmentType: 'MASTERY_CHALLENGE',
      benchmarkId: benchmark.id,
      masteryThreshold: 0.8,
    },
    select: { id: true },
  })
  assessmentId = assessment.id

  const attempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 1 },
    select: { id: true },
  })
  attemptId = attempt.id
})

afterAll(async () => {
  if (ORIGINAL_FLAG === undefined) delete process.env.FEATURE_SECURE_ASSESSMENT
  else process.env.FEATURE_SECURE_ASSESSMENT = ORIGINAL_FLAG

  const sids = [studentId, otherStudentId].filter(Boolean)
  // Children first — the attempt FK is RESTRICT.
  await prisma.attemptIntegrityEvent.deleteMany({
    where: { attempt: { studentId: { in: sids } } },
  })
  await prisma.attemptResponse.deleteMany({
    where: { attempt: { studentId: { in: sids } } },
  })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId: { in: sids } } })
  // Delete by title, not by this run's id: a crashed run must not leak a row
  // that FK-blocks the next one (the audit11/eoc-analytics teardown lesson).
  await prisma.assessmentQuestion.deleteMany({
    where: { assessment: { title: { startsWith: PREFIX } } },
  })
  await prisma.assessment.deleteMany({ where: { title: { startsWith: PREFIX } } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await cleanupTestRoster(prisma, teacherUserId)
  await prisma.student.deleteMany({
    where: { user: { cleverId: { startsWith: PREFIX } } },
  })
  await prisma.teacher.deleteMany({
    where: { user: { cleverId: { startsWith: PREFIX } } },
  })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

afterEach(async () => {
  await prisma.attemptIntegrityEvent.deleteMany({ where: { attemptId } })
})

// ── Recording guards ──────────────────────────────────────────────────────────

describe('recordIntegrityEvents guards', () => {
  it('records events for the owning student', async () => {
    const res = await recordIntegrityEvents(attemptId, studentId, [
      { eventType: 'VISIBILITY_HIDDEN', durationMs: 3000 },
      { eventType: 'COPY_BLOCKED' },
    ])
    expect(res.recorded).toBe(2)
    expect(res.skipped).toBe(0)

    const rows = await getIntegrityEventsForAttempt(attemptId)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.eventType).sort()).toEqual([
      'COPY_BLOCKED',
      'VISIBILITY_HIDDEN',
    ])
  })

  it('stamps recordedAt from the SERVER clock, not the client', async () => {
    const before = new Date()
    await recordIntegrityEvents(attemptId, studentId, [{ eventType: 'BLUR' }])
    const after = new Date()

    const [row] = await getIntegrityEventsForAttempt(attemptId)
    expect(row.recordedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    expect(row.recordedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
  })

  it('refuses another student\'s attempt (IDOR) and writes nothing', async () => {
    await expect(
      recordIntegrityEvents(attemptId, otherStudentId, [{ eventType: 'BLUR' }])
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    expect(await prisma.attemptIntegrityEvent.count({ where: { attemptId } })).toBe(0)
  })

  it('throws NOT_FOUND for an attempt that does not exist', async () => {
    await expect(
      recordIntegrityEvents('clzzzzzzz0000nonexistent001', studentId, [
        { eventType: 'BLUR' },
      ])
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('refuses a submitted attempt — a finished test cannot be re-narrated', async () => {
    const submitted = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        studentId,
        attemptNumber: 99,
        submittedAt: new Date(),
        score: 1,
        passed: true,
      },
      select: { id: true },
    })

    await expect(
      recordIntegrityEvents(submitted.id, studentId, [{ eventType: 'BLUR' }])
    ).rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' })

    expect(
      await prisma.attemptIntegrityEvent.count({ where: { attemptId: submitted.id } })
    ).toBe(0)
    await prisma.assessmentAttempt.delete({ where: { id: submitted.id } })
  })

  it('caps rows per attempt so a hostile client cannot flood the table', async () => {
    const batch = Array.from({ length: MAX_EVENTS_PER_ATTEMPT }, () => ({
      eventType: 'BLUR' as const,
    }))
    const first = await recordIntegrityEvents(attemptId, studentId, batch)
    expect(first.recorded).toBe(MAX_EVENTS_PER_ATTEMPT)

    const second = await recordIntegrityEvents(attemptId, studentId, [
      { eventType: 'BLUR' },
      { eventType: 'BLUR' },
    ])
    expect(second.recorded).toBe(0)
    expect(second.skipped).toBe(2)
    expect(await prisma.attemptIntegrityEvent.count({ where: { attemptId } })).toBe(
      MAX_EVENTS_PER_ATTEMPT
    )
  }, 30000)

  it('clamps an absurd duration at the domain layer too, not only in zod', async () => {
    await recordIntegrityEvents(attemptId, studentId, [
      { eventType: 'BLUR', durationMs: Number.MAX_SAFE_INTEGER },
    ])
    const [row] = await getIntegrityEventsForAttempt(attemptId)
    expect(row.durationMs).toBe(60 * 60 * 1000)
  })
})

// ── Two-gate resolution ───────────────────────────────────────────────────────

describe('secure mode resolution', () => {
  afterEach(async () => {
    await prisma.class.update({
      where: { id: classId },
      data: { secureAssessmentMode: false },
    })
  })

  it('is OFF when the feature flag is unset, even with the class opted in', async () => {
    delete process.env.FEATURE_SECURE_ASSESSMENT
    await prisma.class.update({
      where: { id: classId },
      data: { secureAssessmentMode: true },
    })
    expect(isSecureAssessmentEnabled()).toBe(false)
    expect(await resolveSecureModeForStudent(studentId)).toBe(false)
    expect(await resolveSecureMode(studentId, 'MASTERY_CHALLENGE')).toBe(false)
  })

  it('is OFF when the flag is on but the class has not opted in', async () => {
    process.env.FEATURE_SECURE_ASSESSMENT = 'true'
    expect(await resolveSecureMode(studentId, 'MASTERY_CHALLENGE')).toBe(false)
  })

  it('is ON only when both gates pass AND the type is secure', async () => {
    process.env.FEATURE_SECURE_ASSESSMENT = 'true'
    await prisma.class.update({
      where: { id: classId },
      data: { secureAssessmentMode: true },
    })
    expect(await resolveSecureMode(studentId, 'MASTERY_CHALLENGE')).toBe(true)
    expect(await resolveSecureMode(studentId, 'READINESS_CHECK')).toBe(true)
    // Practice is never secured — students get feedback there by design.
    expect(await resolveSecureMode(studentId, 'PRACTICE')).toBe(false)
  })

  it('is OFF for a student with no class, regardless of flag', async () => {
    process.env.FEATURE_SECURE_ASSESSMENT = 'true'
    expect(await resolveSecureMode(otherStudentId, 'MASTERY_CHALLENGE')).toBe(false)
  })
})

// ── Teacher surfacing ─────────────────────────────────────────────────────────

describe('teacher student profile surfacing', () => {
  it('attaches a summary to the attempt, and null when nothing was recorded', async () => {
    const clean = await getStudentProfileForTeacher(teacherUserId, studentId)
    const cleanRow = clean.attempts.find((a) => a.id === attemptId)
    expect(cleanRow?.integrity).toBeNull()

    await recordIntegrityEvents(attemptId, studentId, [
      { eventType: 'VISIBILITY_HIDDEN', durationMs: 40_000 },
    ])

    const flagged = await getStudentProfileForTeacher(teacherUserId, studentId)
    const flaggedRow = flagged.attempts.find((a) => a.id === attemptId)
    expect(flaggedRow?.integrity).toMatchObject({
      focusLossCount: 1,
      totalAwayMs: 40_000,
      level: 'notable',
    })
  })

  it('does NOT alter score, passed, or voided — the app flags, it never grades', async () => {
    await recordIntegrityEvents(attemptId, studentId, [
      { eventType: 'BLUR', durationMs: 60_000 },
      { eventType: 'BLUR', durationMs: 60_000 },
      { eventType: 'BLUR', durationMs: 60_000 },
      { eventType: 'COPY_BLOCKED' },
    ])

    const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: { score: true, passed: true, voided: true },
    })
    expect(attempt.score).toBeNull()
    expect(attempt.passed).toBeNull()
    expect(attempt.voided).toBe(false)
  })
})
