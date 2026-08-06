/**
 * The next-step loader, against the real database.
 *
 * `rank.test.ts` proves the ranking rule from fixtures. This proves the OTHER
 * half — that the loader feeds it the truth: the same current mission the map
 * would draw, a real assigned remediation, a real due-item count, and a
 * readiness signal derived from actual attempts.
 *
 * That split matters here specifically: the bug this module replaces was the
 * dashboard running its own progress query and linking to a mission the map drew
 * as locked. A pure test cannot catch a loader that asks the wrong question.
 */

import { PrismaClient } from '@prisma/client'
import { getStudentPlan, loadRankInputs } from '@/lib/student-next-step'
import { getMissionAvailability, pickCurrentMissionId } from '@/lib/mastery'

const prisma = new PrismaClient()

const CLEVER_ID = 'test-next-step-001'
let studentId: string

/** First two playable benchmarks in course order, for unlock sequencing. */
let firstBenchmarkId: string
let firstBenchmarkCode: string

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: {
      cleverId: CLEVER_ID,
      firstName: 'NextStep',
      lastName: 'TestStudent',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id

  // Whatever the availability rule says is the student's first mission is the
  // benchmark this suite works with — deriving it rather than hardcoding a code
  // keeps the suite correct as content is seeded.
  const availability = await getMissionAvailability(studentId)
  const currentId = pickCurrentMissionId(availability)
  expect(currentId).not.toBeNull()
  firstBenchmarkId = currentId!
  const bm = await prisma.benchmark.findUnique({
    where: { id: firstBenchmarkId },
    select: { code: true },
  })
  firstBenchmarkCode = bm!.code
})

/** Remove anything a test created, leaving the shared dev DB as we found it. */
async function resetStudentState() {
  await prisma.studentRemediation.deleteMany({ where: { studentId } })
  await prisma.spacedReviewState.deleteMany({ where: { studentId } })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.studentLastActivity.deleteMany({ where: { studentId } })
  await prisma.attemptResponse.deleteMany({ where: { attempt: { studentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
}

afterEach(resetStudentState)

afterAll(async () => {
  await resetStudentState()
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('a brand-new student', () => {
  it('is given exactly one thing to do: start their first mission', async () => {
    const plan = await getStudentPlan(studentId)
    expect(plan.primary.kind).toBe('MISSION_START')
    expect(plan.primary.href).toBe(`/student/mission/${firstBenchmarkCode}`)
  })

  it('agrees with the Mission Map about which mission that is', async () => {
    // The exact disagreement that motivated this module.
    const availability = await getMissionAvailability(studentId)
    const mapCurrent = pickCurrentMissionId(availability)
    const inputs = await loadRankInputs(studentId)
    expect(mapCurrent).toBe(firstBenchmarkId)
    expect(inputs.mission?.benchmarkCode).toBe(firstBenchmarkCode)
    expect(availability.get(firstBenchmarkId)?.openable).toBe(true)
  })

  it('is not offered cumulative review before mastering anything', async () => {
    const plan = await getStudentPlan(studentId)
    const kinds = [plan.primary.kind, ...plan.then.map((s) => s.kind)]
    expect(kinds).not.toContain('REPUBLIC_CHALLENGE')
  })
})

describe('assigned remediation', () => {
  it('outranks everything else and links to the actual assignment', async () => {
    // This is the dead end the module exists to remove: a failed Mastery
    // Challenge assigned this row, and the completion screen used to offer a
    // link to the Mission Map instead of to it.
    const item = await prisma.remediationItem.findFirst({
      where: { benchmarkId: firstBenchmarkId },
      select: { id: true, title: true },
    })
    expect(item).not.toBeNull()

    const assigned = await prisma.studentRemediation.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        remediationItemId: item!.id,
        status: 'ASSIGNED',
      },
      select: { id: true },
    })

    const plan = await getStudentPlan(studentId)
    expect(plan.primary.kind).toBe('REMEDIATION')
    expect(plan.primary.href).toBe(`/student/remediation/${assigned.id}`)
    expect(plan.primary.label).toBe(item!.title)
  })

  it('picks the longest-waiting assignment when several are open', async () => {
    const items = await prisma.remediationItem.findMany({
      where: { benchmarkId: firstBenchmarkId },
      select: { id: true },
      take: 2,
    })
    if (items.length < 2) return // not enough seeded content to exercise this

    const older = await prisma.studentRemediation.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        remediationItemId: items[0].id,
        status: 'ASSIGNED',
        assignedAt: new Date('2026-01-01T00:00:00Z'),
      },
      select: { id: true },
    })
    await prisma.studentRemediation.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        remediationItemId: items[1].id,
        status: 'ASSIGNED',
        assignedAt: new Date('2026-06-01T00:00:00Z'),
      },
    })

    const plan = await getStudentPlan(studentId)
    expect(plan.primary.href).toBe(`/student/remediation/${older.id}`)
  })

  it('is ignored once completed', async () => {
    const item = await prisma.remediationItem.findFirst({
      where: { benchmarkId: firstBenchmarkId },
      select: { id: true },
    })
    await prisma.studentRemediation.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        remediationItemId: item!.id,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    const plan = await getStudentPlan(studentId)
    expect(plan.primary.kind).not.toBe('REMEDIATION')
  })
})

describe('the daily drill', () => {
  it('appears with the real due count and drops out when nothing is due', async () => {
    const before = await getStudentPlan(studentId)
    expect([before.primary, ...before.then].map((s) => s.kind)).not.toContain('DRILL')

    await prisma.spacedReviewState.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        dueAt: new Date(Date.now() - 60_000),
        intervalDays: 1,
        easinessFactor: 2.5,
        repetitionCount: 1,
      },
    })

    const after = await getStudentPlan(studentId)
    const drill = [after.primary, ...after.then].find((s) => s.kind === 'DRILL')
    expect(drill?.count).toBe(1)
    expect(drill?.href).toBe('/student/daily-drill')
  })

  it('does not count items that are not due yet', async () => {
    await prisma.spacedReviewState.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        intervalDays: 7,
        easinessFactor: 2.5,
        repetitionCount: 2,
      },
    })

    const inputs = await loadRankInputs(studentId)
    expect(inputs.drillDueCount).toBe(0)
  })
})

describe('mid-mission state', () => {
  it('reads a passed readiness check as "the Mastery Challenge is open"', async () => {
    const readiness = await prisma.assessment.findFirst({
      where: { benchmarkId: firstBenchmarkId, assessmentType: 'READINESS_CHECK' },
      select: { id: true },
    })
    if (!readiness) return // benchmark has no readiness check seeded

    await prisma.assessmentAttempt.create({
      data: {
        assessmentId: readiness.id,
        studentId,
        attemptNumber: 1,
        score: 0.9,
        passed: true,
        submittedAt: new Date(),
      },
    })

    const inputs = await loadRankInputs(studentId)
    expect(inputs.mission?.readinessPassed).toBe(true)

    const plan = await getStudentPlan(studentId)
    expect(plan.primary.subLabel).toMatch(/mastery challenge/i)
  })

  it('ignores a VOIDED readiness pass — a teacher reset must re-close the gate', async () => {
    const readiness = await prisma.assessment.findFirst({
      where: { benchmarkId: firstBenchmarkId, assessmentType: 'READINESS_CHECK' },
      select: { id: true },
    })
    if (!readiness) return

    await prisma.assessmentAttempt.create({
      data: {
        assessmentId: readiness.id,
        studentId,
        attemptNumber: 1,
        score: 0.9,
        passed: true,
        submittedAt: new Date(),
        voided: true,
      },
    })

    const inputs = await loadRankInputs(studentId)
    expect(inputs.mission?.readinessPassed).toBe(false)
  })
})

describe('the plan is always answerable', () => {
  it('never returns a primary step without a destination', async () => {
    const plan = await getStudentPlan(studentId)
    expect(plan.primary).toBeDefined()
    expect(plan.primary.href).toMatch(/^\/student\//)
    expect(plan.primary.ctaLabel.length).toBeGreaterThan(0)
  })

  it('never repeats the primary step inside the shortlist', async () => {
    await prisma.spacedReviewState.create({
      data: {
        studentId,
        benchmarkId: firstBenchmarkId,
        dueAt: new Date(Date.now() - 60_000),
        intervalDays: 1,
        easinessFactor: 2.5,
        repetitionCount: 1,
      },
    })
    const plan = await getStudentPlan(studentId)
    expect(plan.then.map((s) => s.href)).not.toContain(plan.primary.href)
  })
})
