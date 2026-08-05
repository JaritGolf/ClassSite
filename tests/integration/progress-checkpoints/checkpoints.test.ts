/**
 * Progress checkpoints — configuration, authorization, point-in-time levels, locking.
 *
 * Covers:
 *   - config round-trip and the stage-2 (DB-dependent) validation rules
 *   - the roster IDOR guard living in the domain layer
 *   - levels computed as-of a closed checkpoint's cutoff, not "now"
 *   - lock idempotency and the frozen targetsJson
 *   - catch-up surfacing without mutating a locked level
 *
 * Prefix: test-cpt- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  getProgressPlanForClass,
  saveProgressTargets,
  getStudentCheckpoints,
  ProgressCheckpointError,
  PROGRESS_CHECKPOINT_AUDIT_ACTIONS,
} from '@/lib/progress-checkpoints'
import { enrollStudentWithTeacher, cleanupTestRoster } from '../../helpers/roster'

const prisma = new PrismaClient()
const PREFIX = 'test-cpt-'
const TEACHER_CLEVER_ID = `${PREFIX}teacher-001`
const STUDENT_CLEVER_ID = `${PREFIX}student-001`
const OUTSIDER_TEACHER_CLEVER_ID = `${PREFIX}teacher-outsider`

let teacherUserId: string
let outsiderTeacherUserId: string
let studentId: string
let classId: string
let outsiderClassId: string

const bmIdByCode = new Map<string, string>()
const bmSeqByCode = new Map<string, number>()

function bm(code: string): string {
  const id = bmIdByCode.get(code)
  if (!id) throw new Error(`Seeded benchmark ${code} not found — run npm run db:seed`)
  return id
}

async function makeTeacher(cleverId: string): Promise<{ userId: string; teacherId: string }> {
  const user = await prisma.user.upsert({
    where: { cleverId },
    update: {},
    create: {
      cleverId,
      email: `${cleverId}@test.invalid`,
      firstName: 'Cpt',
      lastName: 'Teacher',
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  })
  const teacher = await prisma.teacher.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, schoolId: 'test-school-cpt' },
  })
  return { userId: user.id, teacherId: teacher.id }
}

beforeAll(async () => {
  const teacher = await makeTeacher(TEACHER_CLEVER_ID)
  teacherUserId = teacher.userId

  const outsider = await makeTeacher(OUTSIDER_TEACHER_CLEVER_ID)
  outsiderTeacherUserId = outsider.userId
  const outsiderClass = await prisma.class.create({
    data: {
      teacherId: outsider.teacherId,
      name: `${PREFIX}outsider-class`,
      schoolYear: '2025-2026',
    },
    select: { id: true },
  })
  outsiderClassId = outsiderClass.id

  const studentUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVER_ID },
    update: {},
    create: {
      cleverId: STUDENT_CLEVER_ID,
      email: `${STUDENT_CLEVER_ID}@test.invalid`,
      firstName: 'Cpt',
      lastName: 'Student',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, gradeLevel: 7 },
  })
  studentId = student.id
  ;({ classId } = await enrollStudentWithTeacher(prisma, teacherUserId, studentId))

  const benchmarks = await prisma.benchmark.findMany({
    where: { code: { startsWith: 'SS.7.CG.' } },
    select: { id: true, code: true, sequenceOrder: true },
  })
  for (const b of benchmarks) {
    bmIdByCode.set(b.code, b.id)
    bmSeqByCode.set(b.code, b.sequenceOrder)
  }
})

afterAll(async () => {
  // FK order: snapshots -> targets/checkpoints (cascade from plan) -> plans
  await prisma.studentCheckpointLevel.deleteMany({ where: { studentId } })
  await prisma.class.updateMany({
    where: { id: { in: [classId, outsiderClassId] } },
    data: { progressPlanId: null },
  })
  await prisma.progressPlan.deleteMany({
    where: { teacher: { user: { cleverId: { startsWith: PREFIX } } } },
  })
  await prisma.auditLog.deleteMany({
    where: { actorUserId: { in: [teacherUserId, outsiderTeacherUserId] } },
  })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.classEnrollment.deleteMany({ where: { classId: outsiderClassId } })
  await prisma.class.deleteMany({ where: { id: outsiderClassId } })
  await cleanupTestRoster(prisma, teacherUserId)
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.teacher.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

/** Reset config + progress + audit rows between tests so each starts clean. */
beforeEach(async () => {
  await prisma.studentCheckpointLevel.deleteMany({ where: { studentId } })
  await prisma.progressPlan.deleteMany({
    where: { teacher: { user: { cleverId: { startsWith: PREFIX } } } },
  })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.auditLog.deleteMany({
    where: { actorUserId: { in: [teacherUserId, outsiderTeacherUserId] } },
  })
})

/** A valid two-checkpoint config using seeded, completable missions. */
function validConfig() {
  return [
    {
      checkpointNumber: 1,
      endsOn: '2026-10-17',
      targets: [
        { level: 1, benchmarkId: bm('SS.7.CG.1.1') },
        { level: 2, benchmarkId: bm('SS.7.CG.1.2') },
        { level: 3, benchmarkId: bm('SS.7.CG.1.3') },
        { level: 4, benchmarkId: bm('SS.7.CG.1.4') },
      ],
    },
    {
      checkpointNumber: 2,
      endsOn: '2026-12-19',
      targets: [
        { level: 1, benchmarkId: bm('SS.7.CG.1.5') },
        { level: 2, benchmarkId: bm('SS.7.CG.1.6') },
      ],
    },
  ]
}

/** Mark a benchmark cleared for the test student at a given time. */
async function clearMission(code: string, masteredAt: Date) {
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId: bm(code) } },
    create: { studentId, benchmarkId: bm(code), status: 'MASTERED', masteredAt },
    update: { status: 'MASTERED', masteredAt },
  })
}

// ── Configuration ─────────────────────────────────────────────────────────────

describe('getProgressPlanForClass', () => {
  it('returns four empty checkpoints before anything is configured', async () => {
    const view = await getProgressPlanForClass(teacherUserId, classId)
    expect(view.planId).toBeNull()
    expect(view.checkpoints).toHaveLength(4)
    expect(view.checkpoints.map((c) => c.checkpointNumber)).toEqual([1, 2, 3, 4])
    expect(view.checkpoints.every((c) => c.endsOn === null && c.targets.length === 0)).toBe(true)
  })

  it('reports mission eligibility with a reason, and does not hide ineligible ones', async () => {
    const view = await getProgressPlanForClass(teacherUserId, classId)
    expect(view.totalCount).toBe(36)
    expect(view.eligibleCount).toBeGreaterThan(0)
    expect(view.eligibleCount).toBeLessThan(view.totalCount)

    const noContent = view.targetOptions.find((o) => o.code === 'SS.7.CG.1.9')!
    expect(noContent.eligible).toBe(false)
    expect(noContent.unavailableReason).toBe('No Mastery Challenge authored yet')

    const inactiveUnit = view.targetOptions.find((o) => o.code === 'SS.7.CG.2.1')!
    expect(inactiveUnit.eligible).toBe(false)
    expect(inactiveUnit.unavailableReason).toMatch(/no content yet/)
  })
})

describe('saveProgressTargets', () => {
  it('round-trips a configuration', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())

    const view = await getProgressPlanForClass(teacherUserId, classId)
    expect(view.planId).not.toBeNull()
    const cp1 = view.checkpoints.find((c) => c.checkpointNumber === 1)!
    expect(cp1.endsOn).toBe('2026-10-17')
    expect(cp1.targets).toEqual([
      { level: 1, benchmarkId: bm('SS.7.CG.1.1') },
      { level: 2, benchmarkId: bm('SS.7.CG.1.2') },
      { level: 3, benchmarkId: bm('SS.7.CG.1.3') },
      { level: 4, benchmarkId: bm('SS.7.CG.1.4') },
    ])
    const cp2 = view.checkpoints.find((c) => c.checkpointNumber === 2)!
    expect(cp2.targets).toHaveLength(2)
    // Unconfigured checkpoints stay empty rather than being invented.
    expect(view.checkpoints.find((c) => c.checkpointNumber === 3)!.endsOn).toBeNull()
  })

  it('writes one audit row with before/after', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    const logs = await prisma.auditLog.findMany({
      where: {
        actorUserId: teacherUserId,
        action: PROGRESS_CHECKPOINT_AUDIT_ACTIONS.PROGRESS_TARGETS_UPDATED,
      },
    })
    expect(logs).toHaveLength(1)
    const meta = logs[0].metadataJson as { before: unknown[]; after: unknown[]; classId: string }
    expect(meta.classId).toBe(classId)
    expect(meta.before).toEqual([])
    expect(meta.after).toHaveLength(2)
  })

  it('re-saving replaces targets rather than accumulating them', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await saveProgressTargets(teacherUserId, classId, [
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [{ level: 1, benchmarkId: bm('SS.7.CG.1.1') }],
      },
    ])
    const view = await getProgressPlanForClass(teacherUserId, classId)
    expect(view.checkpoints.find((c) => c.checkpointNumber === 1)!.targets).toHaveLength(1)
  })

  it('clearing a checkpoint (endsOn null) removes it', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await saveProgressTargets(teacherUserId, classId, [
      { checkpointNumber: 1, endsOn: null, targets: [] },
    ])
    const view = await getProgressPlanForClass(teacherUserId, classId)
    expect(view.checkpoints.find((c) => c.checkpointNumber === 1)!.endsOn).toBeNull()
  })
})

describe('saveProgressTargets — stage-2 validation', () => {
  async function expectRejected(config: Parameters<typeof saveProgressTargets>[2]) {
    await expect(saveProgressTargets(teacherUserId, classId, config)).rejects.toThrow(
      ProgressCheckpointError
    )
  }

  it('rejects targets that do not advance along the map', async () => {
    await expectRejected([
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [
          { level: 1, benchmarkId: bm('SS.7.CG.1.4') },
          { level: 2, benchmarkId: bm('SS.7.CG.1.2') },
        ],
      },
    ])
  })

  it('rejects two levels pointing at the same mission', async () => {
    await expectRejected([
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [
          { level: 1, benchmarkId: bm('SS.7.CG.1.1') },
          { level: 2, benchmarkId: bm('SS.7.CG.1.1') },
        ],
      },
    ])
  })

  it('rejects a target on a mission with no Mastery Challenge', async () => {
    await expectRejected([
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [{ level: 1, benchmarkId: bm('SS.7.CG.1.9') }],
      },
    ])
  })

  it('rejects a target in an inactive unit', async () => {
    await expectRejected([
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [{ level: 1, benchmarkId: bm('SS.7.CG.2.1') }],
      },
    ])
  })

  it('rejects a later checkpoint that starts before an earlier one ended', async () => {
    await expectRejected([
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [{ level: 1, benchmarkId: bm('SS.7.CG.1.5') }],
      },
      {
        checkpointNumber: 2,
        endsOn: '2026-12-19',
        targets: [{ level: 1, benchmarkId: bm('SS.7.CG.1.2') }],
      },
    ])
  })

  it('reports problems with plain-language messages', async () => {
    try {
      await saveProgressTargets(teacherUserId, classId, [
        {
          checkpointNumber: 1,
          endsOn: '2026-10-17',
          targets: [{ level: 1, benchmarkId: bm('SS.7.CG.1.9') }],
        },
      ])
      throw new Error('expected a rejection')
    } catch (e) {
      expect(e).toBeInstanceOf(ProgressCheckpointError)
      const err = e as ProgressCheckpointError
      expect(err.code).toBe('INVALID_TARGETS')
      expect(err.problems.length).toBeGreaterThan(0)
      expect(err.problems[0].message).toMatch(/Mastery Challenge/)
    }
  })

  it('nothing is written when validation fails', async () => {
    await expectRejected([
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [{ level: 1, benchmarkId: bm('SS.7.CG.1.9') }],
      },
    ])
    const plans = await prisma.progressPlan.count({
      where: { teacher: { user: { cleverId: TEACHER_CLEVER_ID } } },
    })
    expect(plans).toBe(0)
  })
})

// ── Authorization ─────────────────────────────────────────────────────────────

describe('roster authorization is enforced in the domain layer', () => {
  it('reading another teacher’s class is FORBIDDEN', async () => {
    await expect(getProgressPlanForClass(teacherUserId, outsiderClassId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('writing another teacher’s class is FORBIDDEN', async () => {
    await expect(
      saveProgressTargets(teacherUserId, outsiderClassId, validConfig())
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('the owning teacher can read their own class', async () => {
    const view = await getProgressPlanForClass(teacherUserId, classId)
    expect(view.checkpoints).toHaveLength(4)
  })
})

// ── Levels: live, point-in-time, and locking ──────────────────────────────────

describe('student levels', () => {
  const beforeCheckpoint1 = new Date('2026-09-15T12:00:00.000Z')

  it('an open checkpoint is computed live', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))
    await clearMission('SS.7.CG.1.2', new Date('2026-09-02T12:00:00.000Z'))

    const { current } = await getStudentCheckpoints(studentId, beforeCheckpoint1)
    expect(current!.checkpointNumber).toBe(1)
    expect(current!.isClosed).toBe(false)
    expect(current!.level).toBe(2)
    expect(current!.nextLevel).toBe(3)
    expect(current!.missionsToNextLevel).toBe(1)
    expect(current!.caughtUpLevel).toBeNull()
  })

  it('applies the prefix rule — skipping ahead does not award the level', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))
    await clearMission('SS.7.CG.1.3', new Date('2026-09-03T12:00:00.000Z'))
    await clearMission('SS.7.CG.1.4', new Date('2026-09-04T12:00:00.000Z'))

    const { current } = await getStudentCheckpoints(studentId, beforeCheckpoint1)
    expect(current!.level).toBe(1)
  })

  it('a closed checkpoint uses progress AS OF its end date, not now', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    // Two cleared before the Oct 17 checkpoint...
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))
    await clearMission('SS.7.CG.1.2', new Date('2026-09-02T12:00:00.000Z'))
    // ...and two more only in November, after it closed.
    await clearMission('SS.7.CG.1.3', new Date('2026-11-03T12:00:00.000Z'))
    await clearMission('SS.7.CG.1.4', new Date('2026-11-04T12:00:00.000Z'))

    const november = new Date('2026-11-10T12:00:00.000Z')
    const { checkpoints } = await getStudentCheckpoints(studentId, november)
    const cp1 = checkpoints.find((c) => c.checkpointNumber === 1)!

    expect(cp1.isClosed).toBe(true)
    expect(cp1.level).toBe(2) // as of Oct 17
    expect(cp1.caughtUpLevel).toBe(4) // has since reached Level 4
  })

  it('locks the level and freezes the targets that produced it', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))

    const november = new Date('2026-11-10T12:00:00.000Z')
    await getStudentCheckpoints(studentId, november)

    const locked = await prisma.studentCheckpointLevel.findMany({ where: { studentId } })
    // Both checkpoint 1 (Oct 17) and 2 (Dec 19)? Only those already closed.
    const cp1Row = locked.find((r) => r.level === 1)
    expect(cp1Row).toBeDefined()
    expect(cp1Row!.missionsCleared).toBe(1)
    const frozen = cp1Row!.targetsJson as { level: number; benchmarkId: string }[]
    expect(frozen).toHaveLength(4)
    expect(frozen[0].benchmarkId).toBe(bm('SS.7.CG.1.1'))
  })

  it('a locked level does not change when the teacher later edits the targets', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))
    await clearMission('SS.7.CG.1.2', new Date('2026-09-02T12:00:00.000Z'))

    const november = new Date('2026-11-10T12:00:00.000Z')
    const first = await getStudentCheckpoints(studentId, november)
    expect(first.checkpoints.find((c) => c.checkpointNumber === 1)!.level).toBe(2)

    // Teacher moves Level 2 to a later mission — the locked value must stand.
    await saveProgressTargets(teacherUserId, classId, [
      {
        checkpointNumber: 1,
        endsOn: '2026-10-17',
        targets: [
          { level: 1, benchmarkId: bm('SS.7.CG.1.1') },
          { level: 2, benchmarkId: bm('SS.7.CG.1.6') },
        ],
      },
    ])

    const second = await getStudentCheckpoints(studentId, november)
    expect(second.checkpoints.find((c) => c.checkpointNumber === 1)!.level).toBe(2)
  })

  it('locking is idempotent — repeated reads do not duplicate rows', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))

    const november = new Date('2026-11-10T12:00:00.000Z')
    await getStudentCheckpoints(studentId, november)
    await getStudentCheckpoints(studentId, november)
    await getStudentCheckpoints(studentId, november)

    const rows = await prisma.studentCheckpointLevel.findMany({ where: { studentId } })
    const keys = new Set(rows.map((r) => `${r.checkpointId}:${r.studentId}`))
    expect(keys.size).toBe(rows.length)
  })

  it('nothing is locked while a checkpoint is still open', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))

    await getStudentCheckpoints(studentId, beforeCheckpoint1)
    const rows = await prisma.studentCheckpointLevel.count({ where: { studentId } })
    expect(rows).toBe(0)
  })

  it('off-ramped missions count toward a level', async () => {
    await saveProgressTargets(teacherUserId, classId, validConfig())
    await clearMission('SS.7.CG.1.1', new Date('2026-09-01T12:00:00.000Z'))
    await prisma.studentProgress.upsert({
      where: { studentId_benchmarkId: { studentId, benchmarkId: bm('SS.7.CG.1.2') } },
      create: {
        studentId,
        benchmarkId: bm('SS.7.CG.1.2'),
        status: 'EXPOSURE_COMPLETE',
        offRampTriggeredAt: new Date('2026-09-05T12:00:00.000Z'),
      },
      update: {
        status: 'EXPOSURE_COMPLETE',
        offRampTriggeredAt: new Date('2026-09-05T12:00:00.000Z'),
      },
    })

    const { current } = await getStudentCheckpoints(studentId, beforeCheckpoint1)
    expect(current!.level).toBe(2)
  })

  it('a student with no configured plan gets no checkpoints, not an error', async () => {
    const { checkpoints, current } = await getStudentCheckpoints(studentId, beforeCheckpoint1)
    expect(checkpoints).toEqual([])
    expect(current).toBeNull()
  })
})
