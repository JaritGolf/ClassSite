/**
 * Seed-guard regression (lesson content editor): `npm run db:seed` must
 * never clobber content a human has hand-edited via the content editor.
 *
 * Two guards in seed/lessons/_seeder.ts:
 *   - coarse (lesson-level): once Lesson.structureEditedAt is set (an admin
 *     added/removed/reordered a step), the seeder skips the whole lesson's
 *     step reconciliation forever.
 *   - fine-grained (per-step): a step with LessonStep.contentEditedAt set
 *     keeps its title/content/stepType even on an otherwise-unedited lesson,
 *     while sibling un-edited steps still pick up a legitimate seed update.
 *
 * Prefix: test-lsg- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import { seedLessonDefs, lessonIdFor, type LessonSeedDef } from '../../../seed/lessons/_seeder'
import { addLessonStep } from '@/lib/lesson-editor'

const prisma = new PrismaClient()

const PREFIX = 'test-lsg-'
const TEST_BENCHMARK_CODE = 'TEST.LSG.1'
const NEVER_SEEDED_BENCHMARK_CODE = 'TEST.LSG.2'
const ACTOR_ID_PREFIX = 'test-lsg-actor'

let actorUserId: string

const originalDef = (): LessonSeedDef => ({
  benchmarkCode: TEST_BENCHMARK_CODE,
  title: 'LSG Test Lesson',
  studentFriendlyTarget: 'I can be a test lesson.',
  body: 'x'.repeat(120),
  steps: [
    { stepType: 'NOTE', title: 'Original step one', content: 'Original content one.' },
    { stepType: 'NOTE', title: 'Original step two', content: 'Original content two.' },
  ],
})

const revisedDef = (): LessonSeedDef => ({
  ...originalDef(),
  steps: [
    { stepType: 'NOTE', title: 'REVISED step one', content: 'REVISED content one.' },
    { stepType: 'NOTE', title: 'REVISED step two', content: 'REVISED content two.' },
  ],
})

const neverSeededDef = (): LessonSeedDef => ({
  benchmarkCode: NEVER_SEEDED_BENCHMARK_CODE,
  title: 'LSG Never-Seeded Lesson',
  studentFriendlyTarget: 'I can be a brand new lesson.',
  body: 'y'.repeat(120),
  steps: [{ stepType: 'NOTE', title: 'Brand new step', content: 'Brand new content.' }],
})

async function cleanupBenchmark(code: string) {
  const lessonId = lessonIdFor(code)
  await prisma.classLessonStepVisibility.deleteMany({ where: { lessonStep: { lessonId } } })
  await prisma.lessonStep.deleteMany({ where: { lessonId } })
  await prisma.lesson.deleteMany({ where: { id: lessonId } })
  await prisma.benchmark.deleteMany({ where: { code } })
}

async function cleanup() {
  await cleanupBenchmark(TEST_BENCHMARK_CODE)
  await cleanupBenchmark(NEVER_SEEDED_BENCHMARK_CODE)
  const users = await prisma.user.findMany({ where: { cleverId: { startsWith: PREFIX } }, select: { id: true } })
  const userIds = users.map((u) => u.id)
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: ACTOR_ID_PREFIX } })
}

beforeAll(async () => {
  await cleanup()
  const anyCategory = await prisma.reportingCategory.findFirstOrThrow({ select: { id: true } })
  const anyUnit = await prisma.unit.findFirstOrThrow({ select: { id: true } })
  await prisma.benchmark.create({
    data: {
      code: TEST_BENCHMARK_CODE,
      title: 'LSG test benchmark',
      reportingCategoryId: anyCategory.id,
      unitId: anyUnit.id,
      sequenceOrder: 9996,
    },
  })
  await prisma.benchmark.create({
    data: {
      code: NEVER_SEEDED_BENCHMARK_CODE,
      title: 'LSG never-seeded benchmark',
      reportingCategoryId: anyCategory.id,
      unitId: anyUnit.id,
      sequenceOrder: 9995,
    },
  })

  const actor = await prisma.user.upsert({
    where: { cleverId: ACTOR_ID_PREFIX },
    update: {},
    create: { cleverId: ACTOR_ID_PREFIX, firstName: 'Lsg', lastName: 'Admin', role: 'ADMIN', status: 'ACTIVE' },
  })
  actorUserId = actor.id
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

async function orderedSteps(code: string) {
  return prisma.lessonStep.findMany({
    where: { lessonId: lessonIdFor(code) },
    orderBy: { sequenceOrder: 'asc' },
  })
}

describe('per-step guard (fine-grained, no structural edit)', () => {
  it('a hand-edited step keeps its content on reseed while its un-edited sibling still updates', async () => {
    await seedLessonDefs(prisma, [originalDef()], { approvalStatus: 'DRAFT' })
    const steps = await orderedSteps(TEST_BENCHMARK_CODE)

    await prisma.lessonStep.update({
      where: { id: steps[0].id },
      data: { title: 'HAND-EDITED title', content: 'HAND-EDITED content', contentEditedAt: new Date() },
    })

    await seedLessonDefs(prisma, [revisedDef()], { approvalStatus: 'DRAFT' })

    const after = await orderedSteps(TEST_BENCHMARK_CODE)
    expect(after[0].title).toBe('HAND-EDITED title')
    expect(after[0].content).toBe('HAND-EDITED content')
    expect(after[1].title).toBe('REVISED step two')
    expect(after[1].content).toBe('REVISED content two.')
  })
})

describe('lesson-level guard (coarse, structural edit)', () => {
  it('an admin-added step survives a reseed, and every other step in the lesson is left untouched too', async () => {
    await prisma.lessonStep.deleteMany({ where: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) } })
    await prisma.lesson.deleteMany({ where: { id: lessonIdFor(TEST_BENCHMARK_CODE) } })
    await seedLessonDefs(prisma, [originalDef()], { approvalStatus: 'DRAFT' })

    const lessonId = lessonIdFor(TEST_BENCHMARK_CODE)
    await addLessonStep(actorUserId, {
      lessonId,
      stepType: 'NOTE',
      title: 'Admin-added step',
      payload: { text: 'Admin-added content.' },
    })

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } })
    expect(lesson.structureEditedAt).not.toBeNull()

    await seedLessonDefs(prisma, [revisedDef()], { approvalStatus: 'DRAFT' })

    const after = await orderedSteps(TEST_BENCHMARK_CODE)
    // The def's revised titles must NOT have overwritten the original
    // seed-authored steps once the lesson is structurally frozen.
    expect(after.map((s) => s.title)).toEqual(
      expect.arrayContaining(['Original step one', 'Original step two', 'Admin-added step'])
    )
    expect(after.map((s) => s.title)).not.toEqual(
      expect.arrayContaining(['REVISED step one', 'REVISED step two'])
    )
  })
})

describe('never-seeded benchmark', () => {
  it('seeds successfully end-to-end (the guards do not block genuinely new content)', async () => {
    const count = await seedLessonDefs(prisma, [neverSeededDef()], { approvalStatus: 'DRAFT' })
    expect(count).toBe(1)
    const steps = await orderedSteps(NEVER_SEEDED_BENCHMARK_CODE)
    expect(steps).toHaveLength(1)
    expect(steps[0].title).toBe('Brand new step')
  })
})
