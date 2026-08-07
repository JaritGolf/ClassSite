/**
 * Integration — class-scoped lesson module authoring (ADR 0023).
 *
 * The claims that matter: a teacher's modules and arrangement reach ONLY their
 * own classes, built-in content is never mutated, the roster guard holds, and
 * a re-seed neither destroys teacher content nor strands it at the end of the
 * lesson.
 *
 * Prefix: test-cla- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  addClassModule,
  deleteClassModule,
  editClassModule,
  reorderClassPlan,
  resetClassPlanOrder,
  setClassModuleVisibility,
  ClassStructureError,
} from '@/lib/lesson-editor'
import { LessonEditorValidationError } from '@/lib/lesson-editor'
import { getClassLessonLayer } from '@/lib/lesson-media'
import {
  resolveClassLessonSteps,
  toClassStepViewId,
  type StepOverride,
} from '@/lib/lesson-content'
import { RosterError } from '@/lib/teacher-roster'
import { seedLessonDefs, lessonIdFor, type LessonSeedDef } from '../../seed/lessons/_seeder'

const prisma = new PrismaClient()

const PREFIX = 'test-cla-'
const TEST_BENCHMARK_CODE = 'TEST.CLA.1'
const LESSON_ID = lessonIdFor(TEST_BENCHMARK_CODE)
const NO_OVERRIDES: ReadonlyMap<string, StepOverride> = new Map()

let teacherUserId: string
let outsiderUserId: string
let classAId: string
let classBId: string
let foreignClassId: string
let stepIds: string[] = []

const NOTE = (title: string, content: string) =>
  ({ stepType: 'NOTE', title, content }) as LessonSeedDef['steps'][number]

const baseSteps = (): LessonSeedDef['steps'] => [
  NOTE('Step one', 'Core instructional text for the first step of the test lesson.'),
  NOTE('Step two', 'Core instructional text for the second step of the test lesson.'),
  NOTE('Step three', 'Core instructional text for the third step of the test lesson.'),
]

const lessonDef = (steps: LessonSeedDef['steps']): LessonSeedDef => ({
  benchmarkCode: TEST_BENCHMARK_CODE,
  title: 'CLA Test Lesson',
  studentFriendlyTarget: 'I can be a test lesson.',
  body: 'x'.repeat(120),
  steps,
})

const NOTE_PAYLOAD = { text: 'A module the teacher wrote for their own class.' }

/** What a student in this class would actually see, end to end. */
async function effectiveIdsFor(classId: string): Promise<string[]> {
  const builtInSteps = await prisma.lessonStep.findMany({
    where: { lessonId: LESSON_ID },
    orderBy: { sequenceOrder: 'asc' },
    select: {
      id: true,
      stepType: true,
      title: true,
      content: true,
      sequenceOrder: true,
      required: true,
      enabled: true,
    },
  })
  const layer = await getClassLessonLayer(classId, LESSON_ID)
  return resolveClassLessonSteps({
    builtInSteps,
    overrides: NO_OVERRIDES,
    classSteps: layer.classSteps,
    savedOrder: layer.savedOrder,
  }).map((s) => s.id)
}

async function mkTeacher(suffix: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'Cla',
      lastName: suffix,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  })
  await prisma.teacher.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
  return user.id
}

async function mkClass(ownerUserId: string, name: string): Promise<string> {
  const teacher = await prisma.teacher.findUniqueOrThrow({
    where: { userId: ownerUserId },
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

async function clearAuthoring() {
  await prisma.classLessonStep.deleteMany({ where: { lessonId: LESSON_ID } })
  await prisma.classLessonOutline.deleteMany({ where: { lessonId: LESSON_ID } })
}

async function cleanup() {
  await clearAuthoring()
  await prisma.classLessonStepVisibility.deleteMany({ where: { lessonStep: { lessonId: LESSON_ID } } })
  await prisma.lessonStep.deleteMany({ where: { lessonId: LESSON_ID } })
  await prisma.lesson.deleteMany({ where: { id: LESSON_ID } })
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

async function reloadStepIds() {
  const steps = await prisma.lessonStep.findMany({
    where: { lessonId: LESSON_ID },
    orderBy: { sequenceOrder: 'asc' },
    select: { id: true },
  })
  stepIds = steps.map((s) => s.id)
}

beforeAll(async () => {
  await cleanup()

  const anyCategory = await prisma.reportingCategory.findFirstOrThrow({ select: { id: true } })
  const anyUnit = await prisma.unit.findFirstOrThrow({ select: { id: true } })
  await prisma.benchmark.create({
    data: {
      code: TEST_BENCHMARK_CODE,
      title: 'CLA test benchmark',
      reportingCategoryId: anyCategory.id,
      unitId: anyUnit.id,
      sequenceOrder: 9998,
    },
  })

  teacherUserId = await mkTeacher('teacher')
  outsiderUserId = await mkTeacher('outsider')
  classAId = await mkClass(teacherUserId, `${PREFIX}class-a`)
  classBId = await mkClass(teacherUserId, `${PREFIX}class-b`)
  foreignClassId = await mkClass(outsiderUserId, `${PREFIX}foreign`)

  await seedLessonDefs(prisma, [lessonDef(baseSteps())], { approvalStatus: 'DRAFT' })
  await reloadStepIds()
})

afterEach(async () => {
  await clearAuthoring()
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('adding a module', () => {
  it('places it where the teacher asked, for that class only', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'My warm-up',
      payload: NOTE_PAYLOAD,
      placement: { position: 'after', itemId: stepIds[0] },
    })

    expect(await effectiveIdsFor(classAId)).toEqual([
      stepIds[0],
      toClassStepViewId(created[0].id),
      stepIds[1],
      stepIds[2],
    ])
    // Class B and the shared curriculum are untouched.
    expect(await effectiveIdsFor(classBId)).toEqual(stepIds)
    expect(await prisma.lessonStep.count({ where: { lessonId: LESSON_ID } })).toBe(3)
  })

  it('adds to several classes at once under one sibling group', async () => {
    const { siblingGroupId, created } = await addClassModule(teacherUserId, {
      classIds: [classAId, classBId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Shared module',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })
    expect(created).toHaveLength(2)

    const rows = await prisma.classLessonStep.findMany({ where: { siblingGroupId } })
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((r) => r.classId))).toEqual(new Set([classAId, classBId]))

    for (const classId of [classAId, classBId]) {
      const ids = await effectiveIdsFor(classId)
      expect(ids[0]).toMatch(/^cstep:/)
      expect(ids.slice(1)).toEqual(stepIds)
    }
  })

  it('never gates progression — teacher modules are always optional', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Optional by construction',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })
    const row = await prisma.classLessonStep.findUniqueOrThrow({ where: { id: created[0].id } })
    expect(row.required).toBe(false)
  })

  it('rejects malformed content instead of storing it', async () => {
    await expect(
      addClassModule(teacherUserId, {
        classIds: [classAId],
        lessonId: LESSON_ID,
        stepType: 'INTERACTIVE_CHECK',
        title: 'Broken check',
        payload: { question: 'Q?', options: [{ text: 'only one', correct: true, feedback: 'x' }] },
        placement: { position: 'start' },
      })
    ).rejects.toThrow(LessonEditorValidationError)
    expect(await prisma.classLessonStep.count({ where: { lessonId: LESSON_ID } })).toBe(0)
  })

  it('refuses a class the caller does not own, before writing anything', async () => {
    await expect(
      addClassModule(teacherUserId, {
        classIds: [classAId, foreignClassId],
        lessonId: LESSON_ID,
        stepType: 'NOTE',
        title: 'Should not exist',
        payload: NOTE_PAYLOAD,
        placement: { position: 'start' },
      })
    ).rejects.toThrow(RosterError)
    // Atomic: the class the teacher DOES own got nothing either.
    expect(await prisma.classLessonStep.count({ where: { lessonId: LESSON_ID } })).toBe(0)
  })

  it("refuses an anchor that is not in this class's lesson", async () => {
    await expect(
      addClassModule(teacherUserId, {
        classIds: [classAId],
        lessonId: LESSON_ID,
        stepType: 'NOTE',
        title: 'Bad anchor',
        payload: NOTE_PAYLOAD,
        placement: { position: 'after', itemId: 'not-a-real-step' },
      })
    ).rejects.toMatchObject({ code: 'ANCHOR_NOT_FOUND' })
  })
})

describe('editing and deleting', () => {
  it('edits every sibling by default', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId, classBId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Before',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })

    const { updatedCount } = await editClassModule(teacherUserId, created[0].id, {
      stepType: 'NOTE',
      title: 'After',
      payload: { text: 'Rewritten body text for the module.' },
    })
    expect(updatedCount).toBe(2)

    const rows = await prisma.classLessonStep.findMany({ where: { lessonId: LESSON_ID } })
    expect(rows.every((r) => r.title === 'After')).toBe(true)
  })

  it('refuses an edit submitted for the wrong module type', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'A note',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })
    await expect(
      editClassModule(teacherUserId, created[0].id, { stepType: 'IMAGE', payload: NOTE_PAYLOAD })
    ).rejects.toMatchObject({ code: 'STEP_TYPE_MISMATCH' })
  })

  it('deletes the module and drops it from the saved order in one go', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Temporary',
      payload: NOTE_PAYLOAD,
      placement: { position: 'after', itemId: stepIds[1] },
    })

    await deleteClassModule(teacherUserId, created[0].id)

    expect(await effectiveIdsFor(classAId)).toEqual(stepIds)
    const outline = await prisma.classLessonOutline.findUnique({
      where: { classId_lessonId: { classId: classAId, lessonId: LESSON_ID } },
      select: { orderedItemIds: true },
    })
    expect(outline?.orderedItemIds).toEqual(stepIds)
  })

  it('hides a module without deleting it', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Hidden one',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })
    await setClassModuleVisibility(teacherUserId, created[0].id, false)

    expect(await effectiveIdsFor(classAId)).toEqual(stepIds)
    expect(await prisma.classLessonStep.count({ where: { id: created[0].id } })).toBe(1)
  })

  it("refuses to edit another teacher's module", async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Mine',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })
    await expect(
      editClassModule(outsiderUserId, created[0].id, { stepType: 'NOTE', payload: NOTE_PAYLOAD })
    ).rejects.toThrow(RosterError)
  })
})

describe('reordering', () => {
  it("rewrites one class's order and leaves the other class and the global order alone", async () => {
    const reversed = [...stepIds].reverse()
    await reorderClassPlan(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      orderedItemIds: reversed,
    })

    expect(await effectiveIdsFor(classAId)).toEqual(reversed)
    expect(await effectiveIdsFor(classBId)).toEqual(stepIds)

    const globalOrder = await prisma.lessonStep.findMany({
      where: { lessonId: LESSON_ID },
      orderBy: { sequenceOrder: 'asc' },
      select: { id: true },
    })
    expect(globalOrder.map((s) => s.id)).toEqual(stepIds)
  })

  it('translates a shared module to each class’s own row', async () => {
    await addClassModule(teacherUserId, {
      classIds: [classAId, classBId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Shared',
      payload: NOTE_PAYLOAD,
      placement: { position: 'start' },
    })

    const aOrder = await effectiveIdsFor(classAId)
    // Move the shared module from the front to the back, for BOTH classes.
    const moved = [...aOrder.slice(1), aOrder[0]]
    await reorderClassPlan(teacherUserId, {
      classIds: [classAId, classBId],
      lessonId: LESSON_ID,
      orderedItemIds: moved,
    })

    for (const classId of [classAId, classBId]) {
      const ids = await effectiveIdsFor(classId)
      expect(ids.slice(0, 3)).toEqual(stepIds)
      expect(ids[3]).toMatch(/^cstep:/)
    }
    // Each class points at its OWN row, not a shared one.
    const aIds = await effectiveIdsFor(classAId)
    const bIds = await effectiveIdsFor(classBId)
    expect(aIds[3]).not.toEqual(bIds[3])
  })

  it('rejects an order that does not match the current module set', async () => {
    await expect(
      reorderClassPlan(teacherUserId, {
        classIds: [classAId],
        lessonId: LESSON_ID,
        orderedItemIds: [stepIds[0], stepIds[1]], // one short
      })
    ).rejects.toMatchObject({ code: 'PLAN_OUT_OF_DATE' })
  })

  it('reset restores the curriculum order but keeps the teacher’s modules', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Survives the reset',
      payload: NOTE_PAYLOAD,
      placement: { position: 'after', itemId: stepIds[0] },
    })
    await reorderClassPlan(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      orderedItemIds: [...stepIds].reverse().concat(toClassStepViewId(created[0].id)),
    })

    await resetClassPlanOrder(teacherUserId, [classAId], LESSON_ID)

    // Built-ins back in curriculum order; the teacher's module re-splices at
    // the anchor it was created against.
    expect(await effectiveIdsFor(classAId)).toEqual([
      stepIds[0],
      toClassStepViewId(created[0].id),
      stepIds[1],
      stepIds[2],
    ])
  })
})

describe('re-seed interaction', () => {
  it('leaves teacher modules and their order untouched on an identical re-seed', async () => {
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Survives reseed',
      payload: NOTE_PAYLOAD,
      placement: { position: 'after', itemId: stepIds[0] },
    })
    const before = await effectiveIdsFor(classAId)

    await seedLessonDefs(prisma, [lessonDef(baseSteps())], { approvalStatus: 'DRAFT' })

    expect(await prisma.classLessonStep.count({ where: { id: created[0].id } })).toBe(1)
    expect(await effectiveIdsFor(classAId)).toEqual(before)
  })

  it('keeps a teacher module when the seeder drops its anchor step', async () => {
    // SET NULL, not CASCADE: the seeder's delete-dropped-steps pass must never
    // take a teacher's own content with it.
    const { created } = await addClassModule(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      stepType: 'NOTE',
      title: 'Anchored to a doomed step',
      payload: NOTE_PAYLOAD,
      placement: { position: 'after', itemId: stepIds[2] },
    })

    await seedLessonDefs(prisma, [lessonDef(baseSteps().slice(0, 2))], {
      approvalStatus: 'DRAFT',
    })

    const row = await prisma.classLessonStep.findUnique({ where: { id: created[0].id } })
    expect(row).not.toBeNull()
    expect(row!.anchorLessonStepId).toBeNull()
    expect(await effectiveIdsFor(classAId)).toContain(toClassStepViewId(created[0].id))

    // Restore the fixture for any later test.
    await seedLessonDefs(prisma, [lessonDef(baseSteps())], { approvalStatus: 'DRAFT' })
    await reloadStepIds()
  })

  it('re-inserts a newly seeded MID-LESSON step in the middle of the teacher order', async () => {
    await reorderClassPlan(teacherUserId, {
      classIds: [classAId],
      lessonId: LESSON_ID,
      orderedItemIds: stepIds,
    })

    const withExtra = baseSteps()
    withExtra.splice(1, 0, NOTE('Brand new', 'Newly authored content in the middle of the lesson.'))
    await seedLessonDefs(prisma, [lessonDef(withExtra)], { approvalStatus: 'DRAFT' })

    const after = await effectiveIdsFor(classAId)
    const globalOrder = await prisma.lessonStep.findMany({
      where: { lessonId: LESSON_ID },
      orderBy: { sequenceOrder: 'asc' },
      select: { id: true },
    })
    expect(after).toHaveLength(4)
    // The new step must NOT have been dumped at the end.
    expect(after[after.length - 1]).toBe(globalOrder[globalOrder.length - 1].id)
    expect(after).toEqual(globalOrder.map((s) => s.id))

    await seedLessonDefs(prisma, [lessonDef(baseSteps())], { approvalStatus: 'DRAFT' })
    await reloadStepIds()
  })
})
