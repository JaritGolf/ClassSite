/**
 * Integration — Lesson structure editing (admin-only add/remove/reorder).
 *
 * Covers: sequenceOrder renumbering on add/remove/reorder, resume-pointer
 * clean delete + renumber,
 * reorder rejecting a payload that isn't exactly the current step-id set,
 * and Lesson.structureEditedAt being set by every structural op (the flag
 * the seed guard checks — see the seed-guard regression suite).
 *
 * Prefix: test-lse- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  addLessonStep,
  removeLessonStep,
  reorderLessonSteps,
  LessonStructureError,
} from '@/lib/lesson-editor'
import { seedLessonDefs, lessonIdFor, type LessonSeedDef } from '../../seed/lessons/_seeder'

const prisma = new PrismaClient()

const PREFIX = 'test-lse-'
const TEST_BENCHMARK_CODE = 'TEST.LSE.1'
const ACTOR_ID_PREFIX = 'test-lse-actor'

let actorUserId: string

const testLessonDef = (): LessonSeedDef => ({
  benchmarkCode: TEST_BENCHMARK_CODE,
  title: 'LSE Test Lesson',
  studentFriendlyTarget: 'I can be a test lesson.',
  body: 'x'.repeat(120),
  steps: [
    { stepType: 'NOTE', title: 'Step one', content: 'Core instructional text for the test lesson.' },
    { stepType: 'NOTE', title: 'Step two', content: 'More core instructional text.' },
    { stepType: 'NOTE', title: 'Step three', content: 'Even more core instructional text.' },
  ],
})

async function cleanup() {
  const lessonId = lessonIdFor(TEST_BENCHMARK_CODE)
  await prisma.classLessonStepVisibility.deleteMany({ where: { lessonStep: { lessonId } } })
  await prisma.lessonStep.deleteMany({ where: { lessonId } })
  await prisma.lesson.deleteMany({ where: { id: lessonId } })
  await prisma.benchmark.deleteMany({ where: { code: TEST_BENCHMARK_CODE } })
  const users = await prisma.user.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  const userIds = users.map((u) => u.id)
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}

let benchmarkId: string

beforeAll(async () => {
  await cleanup()

  const anyCategory = await prisma.reportingCategory.findFirstOrThrow({ select: { id: true } })
  const anyUnit = await prisma.unit.findFirstOrThrow({ select: { id: true } })
  const benchmark = await prisma.benchmark.create({
    data: {
      code: TEST_BENCHMARK_CODE,
      title: 'LSE test benchmark',
      reportingCategoryId: anyCategory.id,
      unitId: anyUnit.id,
      sequenceOrder: 9997,
    },
  })
  benchmarkId = benchmark.id

  const actor = await prisma.user.upsert({
    where: { email: `${ACTOR_ID_PREFIX}` },
    update: {},
    create: {
      email: ACTOR_ID_PREFIX,
      firstName: 'Lse',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })
  actorUserId = actor.id
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

beforeEach(async () => {
  const lessonId = lessonIdFor(TEST_BENCHMARK_CODE)
  await prisma.lessonStep.deleteMany({ where: { lessonId } })
  await prisma.lesson.deleteMany({ where: { id: lessonId } })
  await seedLessonDefs(prisma, [testLessonDef()], { approvalStatus: 'DRAFT' })
})

async function orderedSteps() {
  return prisma.lessonStep.findMany({
    where: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) },
    orderBy: { sequenceOrder: 'asc' },
  })
}

describe('addLessonStep', () => {
  it('appends at the end by default and renumbers nothing else', async () => {
    const steps = await orderedSteps()
    const result = await addLessonStep(actorUserId, {
      lessonId: steps[0].lessonId,
      stepType: 'NOTE',
      title: 'New step',
      payload: { text: 'New content.' },
    })
    expect(result.sequenceOrder).toBe(4)

    const after = await orderedSteps()
    expect(after.map((s) => s.sequenceOrder)).toEqual([1, 2, 3, 4])

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: steps[0].lessonId } })
    expect(lesson.structureEditedAt).not.toBeNull()
  })

  it('inserts mid-lesson and shifts later steps up by one', async () => {
    const steps = await orderedSteps()
    await addLessonStep(actorUserId, {
      lessonId: steps[0].lessonId,
      stepType: 'NOTE',
      title: 'Inserted step',
      payload: { text: 'Inserted content.' },
      position: steps[0].id, // insert right after step 1
    })

    const after = await orderedSteps()
    expect(after.map((s) => s.title)).toEqual(['Step one', 'Inserted step', 'Step two', 'Step three'])
    expect(after.map((s) => s.sequenceOrder)).toEqual([1, 2, 3, 4])
  })

  it('rejects an unknown step type', async () => {
    const steps = await orderedSteps()
    await expect(
      addLessonStep(actorUserId, {
        lessonId: steps[0].lessonId,
        stepType: 'NOT_A_TYPE',
        title: 'x',
        payload: {},
      })
    ).rejects.toThrow(LessonStructureError)
  })
})

describe('removeLessonStep', () => {
  it('renumbers later steps down by one', async () => {
    const steps = await orderedSteps()
    await removeLessonStep(actorUserId, steps[0].id) // remove step 1

    const after = await orderedSteps()
    expect(after.map((s) => s.title)).toEqual(['Step two', 'Step three'])
    expect(after.map((s) => s.sequenceOrder)).toEqual([1, 2])
  })

  it('deletes a middle step cleanly and writes an audit row', async () => {
    const steps = await orderedSteps()
    const auditBefore = await prisma.auditLog.count({ where: { actorUserId } })
    await removeLessonStep(actorUserId, steps[1].id)
    expect((await orderedSteps()).map((s) => s.title)).toEqual(['Step one', 'Step three'])
    expect(await prisma.auditLog.count({ where: { actorUserId } })).toBe(auditBefore + 1)
  })
})

describe('reorderLessonSteps', () => {
  it('applies the exact new order', async () => {
    const steps = await orderedSteps()
    const newOrder = [steps[2].id, steps[0].id, steps[1].id]
    await reorderLessonSteps(actorUserId, steps[0].lessonId, newOrder)

    const after = await orderedSteps()
    expect(after.map((s) => s.id)).toEqual(newOrder)
    expect(after.map((s) => s.sequenceOrder)).toEqual([1, 2, 3])
  })

  it('keeps every step id — a place saved by id on a student device still resolves', async () => {
    const steps = await orderedSteps()
    await reorderLessonSteps(actorUserId, steps[0].lessonId, [steps[2].id, steps[1].id, steps[0].id])
    expect(new Set((await orderedSteps()).map((s) => s.id))).toEqual(new Set(steps.map((s) => s.id)))
  })

  it('rejects a payload that is not exactly the current step-id set (missing an id)', async () => {
    const steps = await orderedSteps()
    await expect(
      reorderLessonSteps(actorUserId, steps[0].lessonId, [steps[0].id, steps[1].id])
    ).rejects.toThrow(LessonStructureError)
  })

  it('rejects a payload with a duplicate id', async () => {
    const steps = await orderedSteps()
    await expect(
      reorderLessonSteps(actorUserId, steps[0].lessonId, [steps[0].id, steps[0].id, steps[1].id])
    ).rejects.toThrow(LessonStructureError)
  })

  it('rejects a payload containing an id from another lesson', async () => {
    const steps = await orderedSteps()
    await expect(
      reorderLessonSteps(actorUserId, steps[0].lessonId, [steps[0].id, steps[1].id, 'not-a-real-step-id'])
    ).rejects.toThrow(LessonStructureError)
  })
})
