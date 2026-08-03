/**
 * Suggestion Box — domain-layer integration (ADR 0019).
 *
 * Exercises createSuggestion / listSuggestionsForTeacher / listSuggestionsForAdmin /
 * updateSuggestionStatus directly, with no HTTP layer in the loop, so the
 * authorization and routing guarantees are proven at the layer that owns them.
 *
 * Prefix: test-sug-
 */

import { PrismaClient } from '@prisma/client'
import {
  createSuggestion,
  listSuggestionsForAdmin,
  listSuggestionsForTeacher,
  updateSuggestionStatus,
  SuggestionError,
  SUGGESTION_MAX_BODY_CHARS,
  SUGGESTION_STATUS_CHANGED,
  SUGGESTION_SUBMITTED,
} from '@/lib/suggestions'

const prisma = new PrismaClient()

const P = 'test-sug-'
const IDS = {
  teacherA: `${P}teacher-a`,
  teacherB: `${P}teacher-b`,
  studentA: `${P}student-a`,
  studentBoth: `${P}student-both`,
  studentSolo: `${P}student-solo`,
  admin: `${P}admin`,
  parent: `${P}parent`,
}

let teacherAUserId: string
let teacherBUserId: string
let teacherAId: string
let teacherBId: string
let classAId: string
let classBId: string
let studentAUserId: string
let studentAId: string
let studentBothUserId: string
let studentBothId: string
let studentSoloUserId: string
let studentSoloId: string
let adminUserId: string
let parentUserId: string

async function upsertUser(
  cleverId: string,
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'PARENT',
  firstName: string
): Promise<string> {
  const u = await prisma.user.upsert({
    where: { cleverId },
    create: {
      cleverId,
      email: `${cleverId}@test.invalid`,
      firstName,
      lastName: 'Tester',
      role,
    },
    update: { role, status: 'ACTIVE' },
    select: { id: true },
  })
  return u.id
}

/** Backdate a suggestion so the 10s submit throttle doesn't block the next create. */
async function clearThrottle(authorUserId: string): Promise<void> {
  await prisma.suggestion.updateMany({
    where: { authorUserId },
    data: { createdAt: new Date(Date.now() - 60 * 60 * 1000) },
  })
}

beforeAll(async () => {
  teacherAUserId = await upsertUser(IDS.teacherA, 'TEACHER', 'Ada')
  teacherBUserId = await upsertUser(IDS.teacherB, 'TEACHER', 'Bo')
  adminUserId = await upsertUser(IDS.admin, 'ADMIN', 'Admin')
  parentUserId = await upsertUser(IDS.parent, 'PARENT', 'Pat')
  studentAUserId = await upsertUser(IDS.studentA, 'STUDENT', 'Sam')
  studentBothUserId = await upsertUser(IDS.studentBoth, 'STUDENT', 'Bea')
  studentSoloUserId = await upsertUser(IDS.studentSolo, 'STUDENT', 'Solo')

  const tA = await prisma.teacher.upsert({
    where: { userId: teacherAUserId },
    create: { userId: teacherAUserId },
    update: {},
    select: { id: true },
  })
  teacherAId = tA.id
  const tB = await prisma.teacher.upsert({
    where: { userId: teacherBUserId },
    create: { userId: teacherBUserId },
    update: {},
    select: { id: true },
  })
  teacherBId = tB.id

  const sA = await prisma.student.upsert({
    where: { userId: studentAUserId },
    create: { userId: studentAUserId },
    update: {},
    select: { id: true },
  })
  studentAId = sA.id
  const sBoth = await prisma.student.upsert({
    where: { userId: studentBothUserId },
    create: { userId: studentBothUserId },
    update: {},
    select: { id: true },
  })
  studentBothId = sBoth.id
  const sSolo = await prisma.student.upsert({
    where: { userId: studentSoloUserId },
    create: { userId: studentSoloUserId },
    update: {},
    select: { id: true },
  })
  studentSoloId = sSolo.id

  const existingA = await prisma.class.findFirst({
    where: { teacherId: teacherAId, name: `${P}class-a` },
    select: { id: true },
  })
  classAId =
    existingA?.id ??
    (
      await prisma.class.create({
        data: { teacherId: teacherAId, name: `${P}class-a`, schoolYear: '2025-2026' },
        select: { id: true },
      })
    ).id

  const existingB = await prisma.class.findFirst({
    where: { teacherId: teacherBId, name: `${P}class-b` },
    select: { id: true },
  })
  classBId =
    existingB?.id ??
    (
      await prisma.class.create({
        data: { teacherId: teacherBId, name: `${P}class-b`, schoolYear: '2025-2026' },
        select: { id: true },
      })
    ).id

  // studentA -> class A only. studentBoth -> class A and class B. studentSolo -> none.
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: classAId, studentId: studentAId } },
    create: { classId: classAId, studentId: studentAId, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: classAId, studentId: studentBothId } },
    create: { classId: classAId, studentId: studentBothId, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: classBId, studentId: studentBothId } },
    create: { classId: classBId, studentId: studentBothId, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  })

  // Start from a clean slate so repeat runs after a crashed teardown are stable.
  const userIds = [
    teacherAUserId,
    teacherBUserId,
    adminUserId,
    parentUserId,
    studentAUserId,
    studentBothUserId,
    studentSoloUserId,
  ]
  await prisma.auditLog.deleteMany({
    where: { actorUserId: { in: userIds }, entityType: 'Suggestion' },
  })
  await prisma.suggestion.deleteMany({ where: { authorUserId: { in: userIds } } })
})

afterAll(async () => {
  const userIds = [
    teacherAUserId,
    teacherBUserId,
    adminUserId,
    parentUserId,
    studentAUserId,
    studentBothUserId,
    studentSoloUserId,
  ]
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } })
  await prisma.suggestion.deleteMany({ where: { authorUserId: { in: userIds } } })
  await prisma.classEnrollment.deleteMany({ where: { classId: { in: [classAId, classBId] } } })
  await prisma.class.deleteMany({ where: { id: { in: [classAId, classBId] } } })
  await prisma.student.deleteMany({
    where: { id: { in: [studentAId, studentBothId, studentSoloId] } },
  })
  await prisma.teacher.deleteMany({ where: { id: { in: [teacherAId, teacherBId] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: Object.values(IDS) } } })
  await prisma.$disconnect()
})

describe('createSuggestion — student routing', () => {
  it('routes to TEACHER, snapshots the recipient, and derives the location server-side', async () => {
    const created = await createSuggestion(studentAUserId, {
      body: 'The mission map is hard to read on my phone.',
      pathname: '/student/mission/SS.7.CG.1.1',
      // A deliberately bogus client label: the server must ignore it, because its
      // own route table matches this path.
      pageLabel: 'TOTALLY WRONG LABEL',
      viewportWidth: 390,
    })

    expect(created.audience).toBe('TEACHER')
    expect(created.status).toBe('NEW')
    expect(created.pageLabel).toBe('Mission page')

    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.authorRole).toBe('STUDENT')
    expect(row.authorStudentId).toBe(studentAId)
    expect(row.teacherId).toBe(teacherAId)
    expect(row.classId).toBe(classAId)
    expect(row.routePattern).toBe('/student/mission/[benchmarkCode]')
    expect(row.pageLabel).toBe('Mission page')
    expect(row.contextJson).toEqual({ viewportWidth: 390 })
  })

  it('writes exactly one audit row, with no body text in the metadata', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { actorUserId: studentAUserId, action: SUGGESTION_SUBMITTED },
    })
    expect(logs).toHaveLength(1)

    const log = logs[0]
    expect(log.entityType).toBe('Suggestion')
    expect(log.entityId).toBeTruthy()

    const meta = log.metadataJson as Record<string, unknown>
    expect(meta.audience).toBe('TEACHER')
    expect(meta.routePattern).toBe('/student/mission/[benchmarkCode]')
    expect(meta.bodyChars).toBe('The mission map is hard to read on my phone.'.length)
    // The prose itself must never be duplicated into the export-friendly audit table.
    expect(JSON.stringify(meta)).not.toContain('hard to read')
    expect(Object.keys(meta)).not.toContain('body')
  })

  it('keeps a client label only when the server route table misses', async () => {
    await clearThrottle(studentAUserId)
    const created = await createSuggestion(studentAUserId, {
      body: 'This brand-new page needs a back button.',
      pathname: '/student/some-future-page',
      pageLabel: 'Some Future Page',
    })
    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.pageLabel).toBe('Some Future Page')
    expect(row.routePattern).toBe('/student/some-future-page')
  })

  it('accepts a student with no active enrollment, leaving teacherId null', async () => {
    const created = await createSuggestion(studentSoloUserId, {
      body: 'I cannot find my class anywhere in here.',
      pathname: '/student/dashboard',
    })
    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.teacherId).toBeNull()
    expect(row.classId).toBeNull()
    expect(row.authorStudentId).toBe(studentSoloId)
  })

  it('creates exactly one row for a multi-class student', async () => {
    const created = await createSuggestion(studentBothUserId, {
      body: 'Daily drill should tell me how many are left.',
      pathname: '/student/daily-drill',
    })
    const count = await prisma.suggestion.count({ where: { authorUserId: studentBothUserId } })
    expect(count).toBe(1)
    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    // Deterministic snapshot: earliest enrolledAt, tiebreak classId.
    expect([classAId, classBId]).toContain(row.classId)
  })
})

describe('createSuggestion — teacher, admin, parent', () => {
  it('routes a teacher to the ADMIN audience and records them as the teacher in the loop', async () => {
    const created = await createSuggestion(teacherAUserId, {
      body: 'The readiness percentage needs a tooltip explaining the range.',
      pathname: '/teacher/eoc-readiness',
    })
    expect(created.audience).toBe('ADMIN')

    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.authorRole).toBe('TEACHER')
    expect(row.teacherId).toBe(teacherAId)
    expect(row.classId).toBeNull()
    expect(row.authorStudentId).toBeNull()
    expect(row.pageLabel).toBe('EOC Readiness')
  })

  it('routes an admin to the ADMIN audience', async () => {
    const created = await createSuggestion(adminUserId, {
      body: 'Retention preview should show the cutoff date inline.',
      pathname: '/admin/retention',
    })
    expect(created.audience).toBe('ADMIN')
    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.authorRole).toBe('ADMIN')
    expect(row.teacherId).toBeNull()
  })

  it('refuses a PARENT author', async () => {
    await expect(
      createSuggestion(parentUserId, { body: 'Please add a Spanish toggle.', pathname: '/parent/dashboard' })
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' })
  })
})

describe('createSuggestion — validation and throttling', () => {
  it('rejects a whitespace-only body at the domain layer', async () => {
    await expect(
      createSuggestion(studentAUserId, { body: '    ', pathname: '/student/dashboard' })
    ).rejects.toMatchObject({ code: 'INVALID_BODY' })
  })

  it('rejects an over-long body at the domain layer', async () => {
    await expect(
      createSuggestion(studentAUserId, {
        body: 'x'.repeat(SUGGESTION_MAX_BODY_CHARS + 1),
        pathname: '/student/dashboard',
      })
    ).rejects.toMatchObject({ code: 'INVALID_BODY' })
  })

  it('rejects a pathname that is not app-relative', async () => {
    await clearThrottle(studentAUserId)
    await expect(
      createSuggestion(studentAUserId, {
        body: 'Off-site link should open in a new tab.',
        pathname: 'https://evil.example.com/phish',
      })
    ).rejects.toMatchObject({ code: 'INVALID_LOCATION' })
  })

  it('rate-limits a second submission inside the minimum interval', async () => {
    await clearThrottle(studentAUserId)
    await createSuggestion(studentAUserId, {
      body: 'First one, right now.',
      pathname: '/student/dashboard',
    })
    await expect(
      createSuggestion(studentAUserId, {
        body: 'Second one, immediately after.',
        pathname: '/student/dashboard',
      })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})

describe('listSuggestionsForTeacher — scope and isolation', () => {
  it('shows teacher A their own student’s suggestions', async () => {
    const result = await listSuggestionsForTeacher(teacherAUserId)
    const bodies = result.items.map((i) => i.body)
    expect(bodies).toContain('The mission map is hard to read on my phone.')
    expect(result.items.every((i) => i.audience === 'TEACHER')).toBe(true)
  })

  it('hides teacher A’s students from teacher B', async () => {
    const result = await listSuggestionsForTeacher(teacherBUserId)
    const bodies = result.items.map((i) => i.body)
    expect(bodies).not.toContain('The mission map is hard to read on my phone.')
  })

  it('never shows a teacher their own (admin-addressed) submissions', async () => {
    for (const uid of [teacherAUserId, teacherBUserId]) {
      const result = await listSuggestionsForTeacher(uid)
      const bodies = result.items.map((i) => i.body)
      expect(bodies).not.toContain(
        'The readiness percentage needs a tooltip explaining the range.'
      )
    }
  })

  it('shows a multi-class student’s single row to BOTH of their teachers', async () => {
    const [a, b] = await Promise.all([
      listSuggestionsForTeacher(teacherAUserId),
      listSuggestionsForTeacher(teacherBUserId),
    ])
    const target = 'Daily drill should tell me how many are left.'
    expect(a.items.map((i) => i.body)).toContain(target)
    expect(b.items.map((i) => i.body)).toContain(target)
  })

  it('surfaces a previously-unenrolled student’s suggestion once they enroll (roster-union fallback)', async () => {
    const before = await listSuggestionsForTeacher(teacherAUserId)
    const target = 'I cannot find my class anywhere in here.'
    expect(before.items.map((i) => i.body)).not.toContain(target)

    await prisma.classEnrollment.create({
      data: { classId: classAId, studentId: studentSoloId, status: 'ACTIVE' },
    })

    const after = await listSuggestionsForTeacher(teacherAUserId)
    expect(after.items.map((i) => i.body)).toContain(target)

    await prisma.classEnrollment.deleteMany({
      where: { classId: classAId, studentId: studentSoloId },
    })
  })

  it('keeps a transferred student’s history with the original teacher (snapshot branch)', async () => {
    // Move studentA out of teacher A's class and into teacher B's.
    await prisma.classEnrollment.updateMany({
      where: { classId: classAId, studentId: studentAId },
      data: { status: 'INACTIVE' },
    })
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: classBId, studentId: studentAId } },
      create: { classId: classBId, studentId: studentAId, status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    })

    const target = 'The mission map is hard to read on my phone.'
    const [a, b] = await Promise.all([
      listSuggestionsForTeacher(teacherAUserId),
      listSuggestionsForTeacher(teacherBUserId),
    ])
    // A keeps it via the stored snapshot; B gains it via the roster branch.
    expect(a.items.map((i) => i.body)).toContain(target)
    expect(b.items.map((i) => i.body)).toContain(target)

    // Restore
    await prisma.classEnrollment.deleteMany({
      where: { classId: classBId, studentId: studentAId },
    })
    await prisma.classEnrollment.updateMany({
      where: { classId: classAId, studentId: studentAId },
      data: { status: 'ACTIVE' },
    })
  })

  it('reports status tallies and top routes', async () => {
    const result = await listSuggestionsForTeacher(teacherAUserId)
    expect(result.countsByStatus.NEW).toBeGreaterThan(0)
    expect(result.topRoutes.length).toBeGreaterThan(0)
    expect(result.topRoutes[0]).toHaveProperty('routePattern')
    expect(result.topRoutes[0]).toHaveProperty('count')
  })

  it('filters by routePattern', async () => {
    const result = await listSuggestionsForTeacher(teacherAUserId, {
      routePattern: '/student/mission',
    })
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((i) => i.routePattern.includes('/student/mission'))).toBe(true)
  })
})

describe('listSuggestionsForAdmin — role gate and audience default', () => {
  it('refuses a teacher, with no HTTP layer involved', async () => {
    await expect(listSuggestionsForAdmin(teacherAUserId)).rejects.toBeInstanceOf(SuggestionError)
    await expect(listSuggestionsForAdmin(teacherAUserId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('refuses a student', async () => {
    await expect(listSuggestionsForAdmin(studentAUserId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('defaults to teacher-authored only', async () => {
    const result = await listSuggestionsForAdmin(adminUserId)
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((i) => i.audience === 'ADMIN')).toBe(true)
    expect(result.items.map((i) => i.body)).toContain(
      'The readiness percentage needs a tooltip explaining the range.'
    )
    expect(result.items.map((i) => i.body)).not.toContain(
      'The mission map is hard to read on my phone.'
    )
  })

  it('includes student-authored suggestions when explicitly asked', async () => {
    const result = await listSuggestionsForAdmin(adminUserId, { includeStudentAudience: true })
    const bodies = result.items.map((i) => i.body)
    expect(bodies).toContain('The mission map is hard to read on my phone.')
    expect(bodies).toContain('The readiness percentage needs a tooltip explaining the range.')
  })
})

describe('updateSuggestionStatus', () => {
  async function newStudentSuggestion(body: string): Promise<string> {
    await clearThrottle(studentBothUserId)
    const created = await createSuggestion(studentBothUserId, {
      body,
      pathname: '/student/badges',
    })
    return created.id
  }

  it('lets the owning teacher advance NEW -> IN_REVIEW and writes an audit row', async () => {
    const id = await newStudentSuggestion('Badges page could show what unlocks next.')
    const result = await updateSuggestionStatus(teacherAUserId, id, { status: 'IN_REVIEW' })
    expect(result.status).toBe('IN_REVIEW')

    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id } })
    expect(row.status).toBe('IN_REVIEW')
    expect(row.reviewedByUserId).toBe(teacherAUserId)
    expect(row.reviewedAt).not.toBeNull()

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: SUGGESTION_STATUS_CHANGED, entityId: id },
    })
    expect(log.metadataJson).toMatchObject({ from: 'NEW', to: 'IN_REVIEW', audience: 'TEACHER' })
  })

  it('stores a reviewer note and does not erase it on a later plain status change', async () => {
    const id = await newStudentSuggestion('Add a dark mode please.')
    await updateSuggestionStatus(teacherAUserId, id, {
      status: 'IN_REVIEW',
      reviewerNote: 'Good idea — raising with the team.',
    })
    await updateSuggestionStatus(teacherAUserId, id, { status: 'RESOLVED' })

    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id } })
    expect(row.status).toBe('RESOLVED')
    expect(row.reviewerNote).toBe('Good idea — raising with the team.')
  })

  it('refuses a teacher who cannot see the suggestion', async () => {
    const id = await newStudentSuggestion('Only teacher A and B should see this one.')
    // studentBoth is in both classes, so use studentSolo (in neither) for isolation.
    await clearThrottle(studentSoloUserId)
    const solo = await createSuggestion(studentSoloUserId, {
      body: 'Nobody currently rosters me.',
      pathname: '/student/dashboard',
    })
    await expect(
      updateSuggestionStatus(teacherAUserId, solo.id, { status: 'IN_REVIEW' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    // Sanity: the visible one still works for teacher A.
    await expect(
      updateSuggestionStatus(teacherAUserId, id, { status: 'DISMISSED' })
    ).resolves.toMatchObject({ status: 'DISMISSED' })
  })

  it('refuses a teacher on an admin-addressed suggestion', async () => {
    const adminAddressed = await prisma.suggestion.findFirstOrThrow({
      where: { authorUserId: teacherAUserId, audience: 'ADMIN' },
      select: { id: true },
    })
    await expect(
      updateSuggestionStatus(teacherBUserId, adminAddressed.id, { status: 'IN_REVIEW' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    // The admin can.
    await expect(
      updateSuggestionStatus(adminUserId, adminAddressed.id, { status: 'IN_REVIEW' })
    ).resolves.toMatchObject({ status: 'IN_REVIEW' })
  })

  it('refuses a student outright', async () => {
    const id = await newStudentSuggestion('Students must not triage.')
    await expect(
      updateSuggestionStatus(studentAUserId, id, { status: 'RESOLVED' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects an illegal transition and a no-op', async () => {
    const id = await newStudentSuggestion('Transition rules should hold.')
    await updateSuggestionStatus(teacherAUserId, id, { status: 'RESOLVED' })

    await expect(
      updateSuggestionStatus(teacherAUserId, id, { status: 'NEW' })
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' })
    await expect(
      updateSuggestionStatus(teacherAUserId, id, { status: 'RESOLVED' })
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' })
    // Reopen is legal.
    await expect(
      updateSuggestionStatus(teacherAUserId, id, { status: 'IN_REVIEW' })
    ).resolves.toMatchObject({ status: 'IN_REVIEW' })
  })

  it('404s on an unknown id', async () => {
    await expect(
      updateSuggestionStatus(adminUserId, 'does-not-exist', { status: 'IN_REVIEW' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('kind — comment vs question', () => {
  it('defaults to COMMENT when the author does not choose', async () => {
    await clearThrottle(studentSoloUserId)
    const created = await createSuggestion(studentSoloUserId, {
      body: 'No kind supplied, so this is a comment.',
      pathname: '/student/dashboard',
    })
    expect(created.kind).toBe('COMMENT')
    const row = await prisma.suggestion.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.kind).toBe('COMMENT')
  })

  it('stores QUESTION when the author toggles to it, and records it in the audit row', async () => {
    await clearThrottle(studentAUserId)
    const created = await createSuggestion(studentAUserId, {
      body: 'Does the Mastery Challenge let me retry if I fail?',
      pathname: '/student/mission/SS.7.CG.1.2',
      kind: 'QUESTION',
    })
    expect(created.kind).toBe('QUESTION')

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: SUGGESTION_SUBMITTED, entityId: created.id },
    })
    expect(log.metadataJson).toMatchObject({ kind: 'QUESTION' })
  })

  it('separates the two teacher queues, so neither tab shows the other', async () => {
    const [comments, questions] = await Promise.all([
      listSuggestionsForTeacher(teacherAUserId, { kind: 'COMMENT' }),
      listSuggestionsForTeacher(teacherAUserId, { kind: 'QUESTION' }),
    ])

    expect(comments.items.length).toBeGreaterThan(0)
    expect(comments.items.every((i) => i.kind === 'COMMENT')).toBe(true)

    expect(questions.items.length).toBeGreaterThan(0)
    expect(questions.items.every((i) => i.kind === 'QUESTION')).toBe(true)
    expect(questions.items.map((i) => i.body)).toContain(
      'Does the Mastery Challenge let me retry if I fail?'
    )
    expect(comments.items.map((i) => i.body)).not.toContain(
      'Does the Mastery Challenge let me retry if I fail?'
    )
  })

  it('reports NEW counts for BOTH kinds regardless of the kind filter (tab badges)', async () => {
    // A teacher standing on the Comments tab must still see that questions are
    // waiting, so the kind tallies deliberately ignore the kind filter.
    const onComments = await listSuggestionsForTeacher(teacherAUserId, { kind: 'COMMENT' })
    const onQuestions = await listSuggestionsForTeacher(teacherAUserId, { kind: 'QUESTION' })

    expect(onComments.newCountsByKind.QUESTION).toBeGreaterThan(0)
    expect(onQuestions.newCountsByKind.COMMENT).toBeGreaterThan(0)
    expect(onComments.newCountsByKind).toEqual(onQuestions.newCountsByKind)
  })

  it('lets an admin filter their own queue by kind', async () => {
    await clearThrottle(teacherAUserId)
    await createSuggestion(teacherAUserId, {
      body: 'How do I reset a student’s mastery attempt?',
      pathname: '/teacher/students',
      kind: 'QUESTION',
    })
    const questions = await listSuggestionsForAdmin(adminUserId, { kind: 'QUESTION' })
    expect(questions.items.every((i) => i.kind === 'QUESTION')).toBe(true)
    expect(questions.items.map((i) => i.body)).toContain(
      'How do I reset a student’s mastery attempt?'
    )
  })
})

describe('write integrity', () => {
  it('rejects an unknown actor without writing anything', async () => {
    const before = await prisma.suggestion.count()
    await expect(
      createSuggestion('no-such-user-id', {
        body: 'This submission should not persist at all.',
        pathname: '/student/dashboard',
      })
    ).rejects.toBeInstanceOf(SuggestionError)

    expect(await prisma.suggestion.count()).toBe(before)
    expect(
      await prisma.suggestion.count({
        where: { body: 'This submission should not persist at all.' },
      })
    ).toBe(0)
  })

  it('pairs every stored suggestion with exactly one SUGGESTION_SUBMITTED audit row', async () => {
    // createSuggestion writes the row and its audit entry in one $transaction, so
    // the two counts must never diverge. A future refactor that splits them (or
    // makes the audit write non-fatal) breaks this.
    const authorUserIds = [
      studentAUserId,
      studentBothUserId,
      studentSoloUserId,
      teacherAUserId,
      adminUserId,
    ]
    const suggestions = await prisma.suggestion.findMany({
      where: { authorUserId: { in: authorUserIds } },
      select: { id: true },
    })
    expect(suggestions.length).toBeGreaterThan(0)

    const submittedLogs = await prisma.auditLog.count({
      where: {
        action: SUGGESTION_SUBMITTED,
        entityType: 'Suggestion',
        entityId: { in: suggestions.map((s) => s.id) },
      },
    })
    expect(submittedLogs).toBe(suggestions.length)
  })
})
