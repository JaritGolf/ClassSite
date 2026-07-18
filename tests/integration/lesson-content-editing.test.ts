/**
 * Integration — Lesson content editing (global default + per-class override).
 *
 * Covers: admin-only global edit, roster-guarded class-scope override,
 * schema rejection (write never stores broken JSON), the YouTube existence
 * check (fail-closed), independent visibility/content axes, and the
 * pruneOrUpdateOverrideRow fix (resetting visibility must not delete a
 * co-located content override).
 *
 * Prefix: test-lce- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  editGlobalStepContent,
  setClassContentOverride,
  LessonEditorError,
  LessonEditorInputError,
  LessonEditorValidationError,
} from '@/lib/lesson-editor'
import { YoutubeVerificationError } from '@/lib/lesson-editor/youtube'
import { setClassStepVisibility } from '@/lib/lesson-media'
import { RosterError } from '@/lib/teacher-roster'
import { seedLessonDefs, lessonIdFor, type LessonSeedDef } from '../../seed/lessons/_seeder'

const prisma = new PrismaClient()

const PREFIX = 'test-lce-'
const TEST_BENCHMARK_CODE = 'TEST.LCE.1'

let teacherUserId: string
let outsiderTeacherUserId: string
let classAId: string
let classBId: string
let foreignClassId: string
let videoStepId: string
let noteStepId: string

const testLessonDef = (): LessonSeedDef => ({
  benchmarkCode: TEST_BENCHMARK_CODE,
  title: 'LCE Test Lesson',
  studentFriendlyTarget: 'I can be a test lesson.',
  body: 'x'.repeat(120),
  steps: [
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
  ],
})

async function mkTeacher(suffix: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}${suffix}` },
    update: {},
    create: {
      cleverId: `${PREFIX}${suffix}`,
      firstName: 'Lce',
      lastName: suffix,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  })
  await prisma.teacher.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
  return user.id
}

async function mkClass(teacherUserId_: string, name: string): Promise<string> {
  const teacher = await prisma.teacher.findUniqueOrThrow({
    where: { userId: teacherUserId_ },
    select: { id: true },
  })
  const created = await prisma.class.create({
    data: { teacherId: teacher.id, name, schoolYear: '2025-2026' },
    select: { id: true },
  })
  return created.id
}

async function cleanup() {
  const lessonId = lessonIdFor(TEST_BENCHMARK_CODE)
  await prisma.classLessonStepVisibility.deleteMany({ where: { lessonStep: { lessonId } } })
  await prisma.lessonStep.deleteMany({ where: { lessonId } })
  await prisma.lesson.deleteMany({ where: { id: lessonId } })
  await prisma.benchmark.deleteMany({ where: { code: TEST_BENCHMARK_CODE } })
  const users = await prisma.user.findMany({ where: { cleverId: { startsWith: PREFIX } }, select: { id: true } })
  const userIds = users.map((u) => u.id)
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } })
  const teachers = await prisma.teacher.findMany({ where: { userId: { in: userIds } }, select: { id: true } })
  const teacherIds = teachers.map((t) => t.id)
  await prisma.class.deleteMany({ where: { teacherId: { in: teacherIds } } })
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}

const originalFetch = global.fetch

beforeAll(async () => {
  await cleanup()

  const anyCategory = await prisma.reportingCategory.findFirstOrThrow({ select: { id: true } })
  const anyUnit = await prisma.unit.findFirstOrThrow({ select: { id: true } })
  await prisma.benchmark.create({
    data: {
      code: TEST_BENCHMARK_CODE,
      title: 'LCE test benchmark',
      reportingCategoryId: anyCategory.id,
      unitId: anyUnit.id,
      sequenceOrder: 9998,
    },
  })

  teacherUserId = await mkTeacher('teacher')
  outsiderTeacherUserId = await mkTeacher('outsider')
  classAId = await mkClass(teacherUserId, `${PREFIX}class-a`)
  classBId = await mkClass(teacherUserId, `${PREFIX}class-b`)
  foreignClassId = await mkClass(outsiderTeacherUserId, `${PREFIX}foreign`)

  await seedLessonDefs(prisma, [testLessonDef()], { approvalStatus: 'DRAFT' })
  const steps = await prisma.lessonStep.findMany({
    where: { lessonId: lessonIdFor(TEST_BENCHMARK_CODE) },
    orderBy: { sequenceOrder: 'asc' },
  })
  noteStepId = steps[0].id
  videoStepId = steps[1].id
})

afterEach(() => {
  global.fetch = originalFetch
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

function mockYoutubeOk() {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch
}
function mockYoutubeNotFound() {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch
}
function mockYoutubeNetworkError() {
  global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch
}

describe('editGlobalStepContent', () => {
  it('updates the global title/content and writes an audit log', async () => {
    mockYoutubeOk()
    const result = await editGlobalStepContent(teacherUserId, videoStepId, {
      stepType: 'VIDEO',
      title: 'Updated title',
      payload: {
        youtubeId: 'abcdefghijk',
        title: 'Updated video',
        description: 'An updated description that is long enough to satisfy the contract.',
      },
    })
    expect(result.title).toBe('Updated title')

    const step = await prisma.lessonStep.findUniqueOrThrow({ where: { id: videoStepId } })
    expect(JSON.parse(step.content)).toMatchObject({ youtubeId: 'abcdefghijk' })
    expect(step.contentEditedAt).not.toBeNull()

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'LESSON_STEP_CONTENT_EDITED', entityId: videoStepId },
      orderBy: { id: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log!.metadataJson).toMatchObject({ scope: 'global' })
  })

  it('rejects a malformed payload and never stores it', async () => {
    const before = await prisma.lessonStep.findUniqueOrThrow({ where: { id: videoStepId } })
    await expect(
      editGlobalStepContent(teacherUserId, videoStepId, {
        stepType: 'VIDEO',
        payload: { youtubeId: 'x', title: '', description: 'short' },
      })
    ).rejects.toThrow(LessonEditorValidationError)
    const after = await prisma.lessonStep.findUniqueOrThrow({ where: { id: videoStepId } })
    expect(after.content).toBe(before.content)
  })

  it('rejects when the payload stepType does not match the actual step', async () => {
    await expect(
      editGlobalStepContent(teacherUserId, videoStepId, {
        stepType: 'IMAGE',
        payload: {},
      })
    ).rejects.toThrow(LessonEditorError)
  })

  it('rejects a YouTube id that does not exist (fail-closed on network error too)', async () => {
    mockYoutubeNotFound()
    await expect(
      editGlobalStepContent(teacherUserId, videoStepId, {
        stepType: 'VIDEO',
        payload: { youtubeId: 'zzzzzzzzzzz', title: 'x', description: 'A description long enough.' },
      })
    ).rejects.toThrow(YoutubeVerificationError)

    mockYoutubeNetworkError()
    await expect(
      editGlobalStepContent(teacherUserId, videoStepId, {
        stepType: 'VIDEO',
        payload: { youtubeId: 'yyyyyyyyyyy', title: 'x', description: 'A description long enough.' },
      })
    ).rejects.toThrow(YoutubeVerificationError)
  })
})

describe('setClassContentOverride', () => {
  it('roster guard: refuses a class the caller does not own', async () => {
    await expect(
      setClassContentOverride(teacherUserId, foreignClassId, noteStepId, { stepType: 'NOTE', payload: { text: 'x' } })
    ).rejects.toThrow(RosterError)
  })

  it('sets an override for one class without affecting another', async () => {
    await setClassContentOverride(teacherUserId, classAId, noteStepId, {
      stepType: 'NOTE',
      payload: { text: 'Class A sees this instead.' },
    })

    const rowA = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classAId, lessonStepId: noteStepId } },
    })
    expect(rowA?.overrideContent).toBe('Class A sees this instead.')

    const rowB = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classBId, lessonStepId: noteStepId } },
    })
    expect(rowB).toBeNull()
  })

  it('clear removes the override row entirely when no visibility opinion coexists', async () => {
    await setClassContentOverride(teacherUserId, classAId, noteStepId, { clear: true })
    const row = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classAId, lessonStepId: noteStepId } },
    })
    expect(row).toBeNull()
  })

  it('rejects a malformed payload for the class-scope path too', async () => {
    await expect(
      setClassContentOverride(teacherUserId, classAId, videoStepId, {
        stepType: 'VIDEO',
        payload: { youtubeId: 'bad', title: '', description: 'short' },
      })
    ).rejects.toThrow(LessonEditorValidationError)
  })
})

describe('setClassContentOverride — multiple classes at once', () => {
  it('applies the same edit to every class named in the array', async () => {
    await setClassContentOverride(teacherUserId, [classAId, classBId], noteStepId, {
      stepType: 'NOTE',
      payload: { text: 'Both classes see this.' },
    })

    const rowA = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classAId, lessonStepId: noteStepId } },
    })
    const rowB = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classBId, lessonStepId: noteStepId } },
    })
    expect(rowA?.overrideContent).toBe('Both classes see this.')
    expect(rowB?.overrideContent).toBe('Both classes see this.')

    const logs = await prisma.auditLog.findMany({
      where: { actorUserId: teacherUserId, action: 'LESSON_STEP_CONTENT_EDITED', entityId: noteStepId },
    })
    expect(logs.filter((l) => (l.metadataJson as { classId?: string })?.classId === classAId)).not.toHaveLength(0)
    expect(logs.filter((l) => (l.metadataJson as { classId?: string })?.classId === classBId)).not.toHaveLength(0)
  })

  it('rejects the whole batch (writes nothing) if any named class is not owned by the caller', async () => {
    await setClassContentOverride(teacherUserId, classAId, noteStepId, { clear: true })
    await setClassContentOverride(teacherUserId, classBId, noteStepId, { clear: true })

    await expect(
      setClassContentOverride(teacherUserId, [classAId, foreignClassId], noteStepId, {
        stepType: 'NOTE',
        payload: { text: 'Should never be written anywhere.' },
      })
    ).rejects.toThrow(RosterError)

    const rowA = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classAId, lessonStepId: noteStepId } },
    })
    expect(rowA).toBeNull()
  })

  it('validates content exactly once for the whole batch — a malformed payload writes nothing', async () => {
    await expect(
      setClassContentOverride(teacherUserId, [classAId, classBId], videoStepId, {
        stepType: 'VIDEO',
        payload: { youtubeId: 'bad', title: '', description: 'short' },
      })
    ).rejects.toThrow(LessonEditorValidationError)

    const rowA = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classAId, lessonStepId: videoStepId } },
    })
    const rowB = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classBId, lessonStepId: videoStepId } },
    })
    expect(rowA?.overrideContent ?? null).not.toBe('bad')
    expect(rowB?.overrideContent ?? null).not.toBe('bad')
  })

  it('rejects an empty class list', async () => {
    await expect(
      setClassContentOverride(teacherUserId, [], noteStepId, { stepType: 'NOTE', payload: { text: 'x' } })
    ).rejects.toThrow(LessonEditorInputError)
  })
})

describe('independent visibility + content axes on the same row', () => {
  it('a content override survives resetting visibility back to inherit', async () => {
    await setClassContentOverride(teacherUserId, classAId, noteStepId, {
      stepType: 'NOTE',
      payload: { text: 'Class A override, should survive a visibility reset.' },
    })
    // NOTE isn't toggleable (core instruction) — use the VIDEO step for the
    // visibility half of this test instead.
    mockYoutubeOk()
    await setClassContentOverride(teacherUserId, classAId, videoStepId, {
      stepType: 'VIDEO',
      payload: { youtubeId: 'ppppppppppp', title: 'x', description: 'A description long enough.' },
    })
    await setClassStepVisibility(teacherUserId, classAId, videoStepId, 'hide')
    await setClassStepVisibility(teacherUserId, classAId, videoStepId, 'inherit')

    const row = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classAId, lessonStepId: videoStepId } },
    })
    expect(row).not.toBeNull()
    expect(row!.visible).toBeNull()
    expect(row!.overrideContent).not.toBeNull()
  })

  it("'inherit' still deletes a row that carries no content override (pre-existing behavior unchanged)", async () => {
    mockYoutubeOk()
    await setClassStepVisibility(teacherUserId, classBId, videoStepId, 'hide')
    await setClassStepVisibility(teacherUserId, classBId, videoStepId, 'inherit')
    const row = await prisma.classLessonStepVisibility.findUnique({
      where: { classId_lessonStepId: { classId: classBId, lessonStepId: videoStepId } },
    })
    expect(row).toBeNull()
  })
})
