/**
 * Integration — Lesson media visibility (ADR 0015).
 *
 * Teachers toggle media steps globally (LessonStep.enabled) and per class
 * (ClassLessonStepVisibility). Covers: global toggle + audit log, per-class
 * override resolution (show beats global-off, hide beats global-on), inherit
 * deletes the row, core steps refuse to toggle, foreign classes are
 * roster-guarded, and the lesson seeder preserves overrides across re-seeds
 * while cascade-deleting them with dropped steps.
 *
 * Prefix: test-lmv- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  setGlobalStepEnabled,
  setClassStepVisibility,
  getClassVisibilityMap,
  LessonMediaError,
  LESSON_MEDIA_AUDIT_ACTION,
} from '@/lib/lesson-media'
import { resolveVisibleSteps } from '@/lib/lesson-content'
import { RosterError } from '@/lib/teacher-roster'
import { seedLessonDefs, lessonIdFor, type LessonSeedDef } from '../../seed/lessons/_seeder'

const prisma = new PrismaClient()

const PREFIX = 'test-lmv-'
const TEST_BENCHMARK_CODE = 'TEST.LMV.1'

let teacherUserId: string
let outsiderTeacherUserId: string
let classAId: string
let classBId: string
let foreignClassId: string
let videoStepId: string
let noteStepId: string

const testLessonDef = (steps: LessonSeedDef['steps']): LessonSeedDef => ({
  benchmarkCode: TEST_BENCHMARK_CODE,
  title: 'LMV Test Lesson',
  studentFriendlyTarget: 'I can be a test lesson.',
  body: 'x'.repeat(120),
  steps,
})

const FULL_STEPS: LessonSeedDef['steps'] = [
  { stepType: 'NOTE', title: 'A note', content: 'Core instructional text for the test lesson.' },
  {
    stepType: 'VIDEO',
    title: 'A video',
    content: JSON.stringify({
      youtubeId: 'dQw4w9WgXcQ',
      title: 'Test video',
      description: 'A test video description that is long enough to satisfy the contract.',
    }),
  },
  {
    stepType: 'IMAGE',
    title: 'An image',
    content: JSON.stringify({
      asset: 'svg:crown-vs-law',
      alt: 'test',
      caption: 'test caption',
      credit: 'test',
      license: 'Public domain',
      longDescription: 'A long description of the test image that satisfies the contract.',
    }),
  },
]

async function mkTeacher(suffix: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'Lmv',
      lastName: suffix,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  })
  await prisma.teacher.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  return user.id
}

async function mkClass(teacherUserId_: string, name: string): Promise<string> {
  const teacher = await prisma.teacher.findUniqueOrThrow({
    where: { userId: teacherUserId_ },
    select: { id: true },
  })
  const existing = await prisma.class.findFirst({
    where: { teacherId: teacher.id, name },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.class.create({
    data: { teacherId: teacher.id, name, schoolYear: '2025-2026' },
    select: { id: true },
  })
  return created.id
}

async function cleanup() {
  const lessonId = lessonIdFor(TEST_BENCHMARK_CODE)
  await prisma.classLessonStepVisibility.deleteMany({
    where: { lessonStep: { lessonId } },
  })
  await prisma.lessonStep.deleteMany({ where: { lessonId } })
  await prisma.lesson.deleteMany({ where: { id: lessonId } })
  await prisma.benchmark.deleteMany({ where: { code: TEST_BENCHMARK_CODE } })
  const users = await prisma.user.findMany({
    where: { cleverId: { startsWith: PREFIX } },
    select: { id: true },
  })
  const userIds = users.map((u) => u.id)
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } })
  const teachers = await prisma.teacher.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  })
  const teacherIds = teachers.map((t) => t.id)
  await prisma.class.deleteMany({ where: { teacherId: { in: teacherIds } } })
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}

beforeAll(async () => {
  await cleanup()

  const anyCategory = await prisma.reportingCategory.findFirstOrThrow({ select: { id: true } })
  const anyUnit = await prisma.unit.findFirstOrThrow({ select: { id: true } })
  await prisma.benchmark.create({
    data: {
      code: TEST_BENCHMARK_CODE,
      title: 'LMV test benchmark',
      reportingCategoryId: anyCategory.id,
      unitId: anyUnit.id,
      sequenceOrder: 9999,
    },
  })

  teacherUserId = await mkTeacher('teacher')
  outsiderTeacherUserId = await mkTeacher('outsider')
  classAId = await mkClass(teacherUserId, `${PREFIX}class-a`)
  classBId = await mkClass(teacherUserId, `${PREFIX}class-b`)
  foreignClassId = await mkClass(outsiderTeacherUserId, `${PREFIX}foreign`)

  await seedLessonDefs(prisma, [testLessonDef(FULL_STEPS)], { approvalStatus: 'DRAFT' })
  const steps = await prisma.lessonStep.findMany({
    where: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) },
    orderBy: { sequenceOrder: 'asc' },
  })
  noteStepId = steps[0].id
  videoStepId = steps[1].id
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

async function visibleIdsFor(classId: string): Promise<string[]> {
  const steps = await prisma.lessonStep.findMany({
    where: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) },
    orderBy: { sequenceOrder: 'asc' },
    select: { id: true, enabled: true },
  })
  const overrides = await getClassVisibilityMap(
    classId,
    steps.map((s) => s.id)
  )
  return resolveVisibleSteps(steps, overrides).map((s) => s.id)
}

describe('global toggle', () => {
  it('disables a media step for every class and writes an audit log', async () => {
    await setGlobalStepEnabled(teacherUserId, videoStepId, false)

    const step = await prisma.lessonStep.findUniqueOrThrow({ where: { id: videoStepId } })
    expect(step.enabled).toBe(false)

    expect(await visibleIdsFor(classAId)).not.toContain(videoStepId)
    expect(await visibleIdsFor(classBId)).not.toContain(videoStepId)

    const log = await prisma.auditLog.findFirst({
      where: {
        actorUserId: teacherUserId,
        action: LESSON_MEDIA_AUDIT_ACTION,
        entityId: videoStepId,
      },
      orderBy: { id: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log!.metadataJson).toMatchObject({ scope: 'global', from: true, to: false })
  })

  it('refuses to toggle a core instructional step', async () => {
    await expect(setGlobalStepEnabled(teacherUserId, noteStepId, false)).rejects.toThrow(
      LessonMediaError
    )
    const note = await prisma.lessonStep.findUniqueOrThrow({ where: { id: noteStepId } })
    expect(note.enabled).toBe(true)
  })
})

describe('per-class override', () => {
  it("a 'show' override for class A beats global-off — class B stays hidden", async () => {
    await setClassStepVisibility(teacherUserId, classAId, videoStepId, 'show')

    expect(await visibleIdsFor(classAId)).toContain(videoStepId)
    expect(await visibleIdsFor(classBId)).not.toContain(videoStepId)
  })

  it("'inherit' deletes the override row", async () => {
    await setClassStepVisibility(teacherUserId, classAId, videoStepId, 'inherit')
    const rows = await prisma.classLessonStepVisibility.findMany({
      where: { classId: classAId, lessonStepId: videoStepId },
    })
    expect(rows).toHaveLength(0)
    expect(await visibleIdsFor(classAId)).not.toContain(videoStepId) // back to global-off
  })

  it("a 'hide' override beats global-on", async () => {
    await setGlobalStepEnabled(teacherUserId, videoStepId, true)
    await setClassStepVisibility(teacherUserId, classBId, videoStepId, 'hide')

    expect(await visibleIdsFor(classAId)).toContain(videoStepId)
    expect(await visibleIdsFor(classBId)).not.toContain(videoStepId)
  })

  it('refuses a class the caller does not own (roster guard)', async () => {
    await expect(
      setClassStepVisibility(teacherUserId, foreignClassId, videoStepId, 'hide')
    ).rejects.toThrow(RosterError)
  })

  it('refuses per-class toggles on core steps', async () => {
    await expect(
      setClassStepVisibility(teacherUserId, classAId, noteStepId, 'hide')
    ).rejects.toThrow(LessonMediaError)
  })
})

describe('re-seed interaction (positional ids, ADR 0015)', () => {
  it('overrides survive an identical re-seed (upsert keeps step rows)', async () => {
    const before = await prisma.classLessonStepVisibility.count({
      where: { lessonStep: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) } },
    })
    expect(before).toBeGreaterThan(0)

    await seedLessonDefs(prisma, [testLessonDef(FULL_STEPS)], { approvalStatus: 'DRAFT' })

    const after = await prisma.classLessonStepVisibility.count({
      where: { lessonStep: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) } },
    })
    expect(after).toBe(before)
  })

  it('re-seeding preserves the teacher-set global enabled flag', async () => {
    await setGlobalStepEnabled(teacherUserId, videoStepId, false)
    await seedLessonDefs(prisma, [testLessonDef(FULL_STEPS)], { approvalStatus: 'DRAFT' })
    const step = await prisma.lessonStep.findUniqueOrThrow({ where: { id: videoStepId } })
    expect(step.enabled).toBe(false)
  })

  it('dropping a step from the def cascade-deletes its overrides (no FK error)', async () => {
    // The IMAGE step is last; give it an override, then re-seed without it.
    const imageStep = await prisma.lessonStep.findFirstOrThrow({
      where: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE), stepType: 'IMAGE' },
      select: { id: true },
    })
    await setClassStepVisibility(teacherUserId, classAId, imageStep.id, 'hide')

    await seedLessonDefs(prisma, [testLessonDef(FULL_STEPS.slice(0, 2))], {
      approvalStatus: 'DRAFT',
    })

    expect(
      await prisma.lessonStep.findUnique({ where: { id: imageStep.id } })
    ).toBeNull()
    expect(
      await prisma.classLessonStepVisibility.findMany({
        where: { lessonStepId: imageStep.id },
      })
    ).toHaveLength(0)
  })
})
