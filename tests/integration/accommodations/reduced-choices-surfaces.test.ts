/**
 * ACC-REDUCED-CHOICES on the three surfaces that were still un-accommodated.
 *
 * `tests/integration/reduced-choices.test.ts` covers the assessment path. This
 * covers the Daily Drill, the Practice Arena and remediation alternates — which
 * between them are where a student spends most of their practice time, and which
 * kept serving four choices to a student whose IEP called for three.
 *
 * The assertion that matters most in every block is the same one: the correct
 * answer must still be among the choices served. Dropping it would hand a
 * student with an IEP an item that cannot be answered correctly.
 */

import { PrismaClient } from '@prisma/client'
import { getDrillQueue } from '@/lib/spaced-retrieval/drill'
import { getNextItem } from '@/lib/adaptive-difficulty'
import { fetchAlternateQuestions } from '@/lib/remediation/questions'
import { REDUCED_CHOICE_COUNT } from '@/lib/reading-load'

const prisma = new PrismaClient()
const PREFIX = 'test-rc-surfaces'

let withAccId: string
let withoutAccId: string
let benchmarkId: string
let practiceAssessmentId: string
let masteryAssessmentId: string

async function makeStudent(tag: string): Promise<string> {
  const user = await prisma.user.create({
    data: { role: 'STUDENT', firstName: PREFIX, lastName: tag, cleverId: `${PREFIX}-${tag}` },
  })
  const student = await prisma.student.create({ data: { userId: user.id, gradeLevel: 7 } })
  return student.id
}

/** Start a real attempt so the practice path has something to serve against. */
async function startAttempt(studentId: string, assessmentId: string): Promise<string> {
  const attempt = await prisma.assessmentAttempt.create({
    data: { studentId, assessmentId, attemptNumber: 1 },
  })
  return attempt.id
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { firstName: PREFIX },
    select: { id: true, student: { select: { id: true } } },
  })
  for (const u of users) {
    if (u.student) {
      const sid = u.student.id
      const attempts = await prisma.assessmentAttempt.findMany({
        where: { studentId: sid },
        select: { id: true },
      })
      const attemptIds = attempts.map((a) => a.id)
      if (attemptIds.length > 0) {
        await prisma.adaptiveSessionState.deleteMany({
          where: { attemptId: { in: attemptIds } },
        })
        await prisma.attemptResponse.deleteMany({ where: { attemptId: { in: attemptIds } } })
      }
      await prisma.assessmentAttempt.deleteMany({ where: { studentId: sid } })
      await prisma.spacedReviewState.deleteMany({ where: { studentId: sid } })
      await prisma.studentAccommodation.deleteMany({ where: { studentId: sid } })
      await prisma.student.deleteMany({ where: { id: sid } })
    }
    await prisma.user.deleteMany({ where: { id: u.id } })
  }
}

/** Every option the question actually has, including the correct one. */
async function trueOptionCount(questionId: string): Promise<number> {
  return prisma.questionOption.count({ where: { questionId } })
}

async function correctOptionId(questionId: string): Promise<string> {
  const opt = await prisma.questionOption.findFirst({
    where: { questionId, isCorrect: true },
    select: { id: true },
  })
  if (!opt) throw new Error(`Question ${questionId} has no correct option`)
  return opt.id
}

beforeAll(async () => {
  await cleanup()

  withAccId = await makeStudent('with')
  withoutAccId = await makeStudent('without')

  const acc = await prisma.accommodation.findUnique({
    where: { code: 'ACC-REDUCED-CHOICES' },
    select: { id: true },
  })
  if (!acc) throw new Error('ACC-REDUCED-CHOICES not seeded — run npm run db:seed')
  await prisma.studentAccommodation.create({
    data: { studentId: withAccId, accommodationId: acc.id, grantedBy: 'test', active: true },
  })

  // A benchmark with a real 4-option question bank.
  const practice = await prisma.assessment.findFirst({
    where: { assessmentType: 'PRACTICE', benchmarkId: { not: null } },
    select: { id: true, benchmarkId: true },
  })
  if (!practice?.benchmarkId) throw new Error('No seeded PRACTICE assessment — run npm run db:seed')
  practiceAssessmentId = practice.id
  benchmarkId = practice.benchmarkId

  const mastery = await prisma.assessment.findFirst({
    where: { assessmentType: 'MASTERY_CHALLENGE', benchmarkId },
    select: { id: true },
  })
  if (!mastery) throw new Error('No seeded MASTERY_CHALLENGE — run npm run db:seed')
  masteryAssessmentId = mastery.id

  // Make the drill have something due for both students.
  for (const studentId of [withAccId, withoutAccId]) {
    await prisma.spacedReviewState.create({
      data: {
        studentId,
        benchmarkId,
        dueAt: new Date(Date.now() - 60_000),
        intervalDays: 1,
        easinessFactor: 2.5,
        repetitionCount: 1,
      },
    })
  }
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('Daily Drill', () => {
  it('serves reduced choices, keeping the correct answer', async () => {
    const queue = await getDrillQueue(withAccId)
    expect(queue.length).toBeGreaterThan(0)

    let actuallyReduced = 0
    for (const item of queue) {
      const total = await trueOptionCount(item.questionId)
      if (total <= REDUCED_CHOICE_COUNT) continue // nothing safe to drop
      expect(item.options).toHaveLength(REDUCED_CHOICE_COUNT)
      expect(item.options.map((o) => o.id)).toContain(await correctOptionId(item.questionId))
      actuallyReduced++
    }
    // Without this the block above passes vacuously if every seeded question
    // happens to have three or fewer options.
    expect(actuallyReduced).toBeGreaterThan(0)
  })

  it('leaves a student without the accommodation on the full option set', async () => {
    const queue = await getDrillQueue(withoutAccId)
    expect(queue.length).toBeGreaterThan(0)
    for (const item of queue) {
      expect(item.options).toHaveLength(await trueOptionCount(item.questionId))
    }
  })

  it('does not leak the answer key', async () => {
    const queue = await getDrillQueue(withAccId)
    expect(JSON.stringify(queue)).not.toContain('isCorrect')
  })
})

describe('Practice Arena', () => {
  it('serves reduced choices on a PRACTICE attempt, keeping the correct answer', async () => {
    const attemptId = await startAttempt(withAccId, practiceAssessmentId)
    const payload = await getNextItem(attemptId, withAccId)

    expect(payload.type).toBe('QUESTION')
    if (payload.type !== 'QUESTION') return

    const total = await trueOptionCount(payload.question.id)
    // The seeded banks are 4-option; assert that rather than branching on it,
    // so this cannot quietly stop testing anything.
    expect(total).toBeGreaterThan(REDUCED_CHOICE_COUNT)
    expect(payload.question.options).toHaveLength(REDUCED_CHOICE_COUNT)
    expect(payload.question.options.map((o) => o.id)).toContain(
      await correctOptionId(payload.question.id)
    )
    expect(JSON.stringify(payload)).not.toContain('isCorrect')
  })

  it('does NOT reduce on a Mastery Challenge attempt for the same student', async () => {
    // The type gate, not the grant, is what protects this — the student holds
    // the accommodation in both cases.
    const attemptId = await startAttempt(withAccId, masteryAssessmentId)
    const payload = await getNextItem(attemptId, withAccId)

    if (payload.type !== 'QUESTION') return
    expect(payload.question.options).toHaveLength(
      await trueOptionCount(payload.question.id)
    )
  })

  it('leaves a student without the accommodation on the full option set', async () => {
    const attemptId = await startAttempt(withoutAccId, practiceAssessmentId)
    const payload = await getNextItem(attemptId, withoutAccId)

    if (payload.type !== 'QUESTION') return
    expect(payload.question.options).toHaveLength(
      await trueOptionCount(payload.question.id)
    )
  })
})

describe('Remediation alternates', () => {
  it('serves reduced choices, keeping the correct answer', async () => {
    const questions = await fetchAlternateQuestions(practiceAssessmentId, withAccId)
    expect(questions.length).toBeGreaterThan(0)

    let actuallyReduced = 0
    for (const q of questions) {
      const total = await trueOptionCount(q.id)
      if (total <= REDUCED_CHOICE_COUNT) continue
      expect(q.options).toHaveLength(REDUCED_CHOICE_COUNT)
      expect(q.options.map((o) => o.id)).toContain(await correctOptionId(q.id))
      actuallyReduced++
    }
    expect(actuallyReduced).toBeGreaterThan(0)
  })

  it('leaves a student without the accommodation on the full option set', async () => {
    const questions = await fetchAlternateQuestions(practiceAssessmentId, withoutAccId)
    expect(questions.length).toBeGreaterThan(0)
    for (const q of questions) {
      expect(q.options).toHaveLength(await trueOptionCount(q.id))
    }
  })

  it('does not leak the answer key', async () => {
    const questions = await fetchAlternateQuestions(practiceAssessmentId, withAccId)
    expect(JSON.stringify(questions)).not.toContain('isCorrect')
  })
})
