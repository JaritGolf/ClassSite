/**
 * Stateless assessment delivery + grading against the real (seeded) database.
 *
 * Proves, for the code path every student request takes:
 *   - the answer key is not in what is delivered (rule #2)
 *   - grading is server-side and cannot be steered by the payload (rule #1)
 *   - the readiness gate holds without any stored attempt
 *   - NOTHING is written: every table has the same row count afterwards
 */

import { PrismaClient } from '@prisma/client'
import { deliverAssessment, gradeSubmission, AssessmentError } from '@/lib/assessment'
import { gradeSingleAnswer, SingleAnswerError } from '@/lib/assessment/single-answer'
import { getPracticeItem } from '@/lib/adaptive-difficulty/stateless'
import { initialState } from '@/lib/adaptive-difficulty/transitions'
import { verifyReadinessToken } from '@/lib/completion-codes/readiness-token'

const prisma = new PrismaClient()
const CODE = 'SS.7.CG.1.1'

async function tableCounts(): Promise<Record<string, number>> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public' order by 1`
  const out: Record<string, number> = {}
  for (const { tablename } of tables) {
    const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`select count(*) as n from "${tablename}"`)
    out[tablename] = Number(rows[0].n)
  }
  return out
}

async function assessmentOf(type: string) {
  const a = await prisma.assessment.findFirstOrThrow({
    where: { assessmentType: type as never, approvalStatus: 'APPROVED', benchmark: { code: CODE } },
    orderBy: { title: 'asc' },
    select: { id: true },
  })
  return a.id
}

async function answersFor(assessmentId: string, correct: boolean, confidence?: 0 | 1 | 2) {
  const rows = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    select: { question: { select: { id: true, options: { select: { id: true, isCorrect: true } } } } },
  })
  return rows.map((r) => ({
    questionId: r.question.id,
    selectedOptionId: r.question.options.find((o) => o.isCorrect === correct)!.id,
    ...(confidence !== undefined ? { confidence } : {}),
  }))
}

let before: Record<string, number>

beforeAll(async () => {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-for-signing-0123456789'
  before = await tableCounts()
})

afterAll(async () => {
  // The whole suite — delivery, grading, practice — must have written nothing.
  expect(await tableCounts()).toEqual(before)
  await prisma.$disconnect()
})

describe('delivery never carries the answer key', () => {
  it.each(['PRE_CHECK', 'VOCAB_CHECK', 'READINESS_CHECK'])('%s', async (type) => {
    const delivered = await deliverAssessment(await assessmentOf(type))
    expect(delivered.questions.length).toBeGreaterThan(0)
    const json = JSON.stringify(delivered)
    expect(json).not.toMatch(/isCorrect|is_correct|"feedback"|"correct"/)
    for (const q of delivered.questions) {
      for (const o of q.options) expect(Object.keys(o).sort()).toEqual(['id', 'optionText', 'position'])
    }
  })

  it('does not always put the right answer first', async () => {
    const id = await assessmentOf('READINESS_CHECK')
    const key = new Set((await answersFor(id, true)).map((a) => a.selectedOptionId))
    let firstIsCorrect = 0
    let total = 0
    for (let i = 0; i < 6; i++) {
      for (const q of (await deliverAssessment(id)).questions) {
        total++
        if (key.has(q.options[0].id)) firstIsCorrect++
      }
    }
    expect(firstIsCorrect).toBeLessThan(total)
  })

  it('404s an unknown assessment', async () => {
    await expect(deliverAssessment('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('readiness gate without stored attempts', () => {
  it('refuses a Mastery Challenge with no token, a forged token, or another benchmark\'s token', async () => {
    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    await expect(deliverAssessment(mastery)).rejects.toMatchObject({ code: 'READINESS_REQUIRED' })
    await expect(deliverAssessment(mastery, { readinessToken: `R1~${CODE}~20260914~AAAAAAAAAAAAAAAA` })).rejects.toBeInstanceOf(AssessmentError)

    const other = await gradeSubmission(
      (await prisma.assessment.findFirstOrThrow({
        where: { assessmentType: 'READINESS_CHECK', approvalStatus: 'APPROVED', benchmark: { code: 'SS.7.CG.1.2' } },
        select: { id: true },
      })).id,
      { responses: [] }
    )
    expect(other.readinessToken).toBeNull() // failed → no token at all
  })

  it('a passed Readiness Check issues a token that opens and grades the Mastery Challenge', async () => {
    const readiness = await assessmentOf('READINESS_CHECK')
    const passed = await gradeSubmission(readiness, { responses: await answersFor(readiness, true) })
    expect(passed.passed).toBe(true)
    expect(passed.readinessToken).toBeTruthy()
    expect(verifyReadinessToken(passed.readinessToken, CODE)).toBe(true)
    expect(verifyReadinessToken(passed.readinessToken, 'SS.7.CG.1.2')).toBe(false)

    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    const delivered = await deliverAssessment(mastery, { readinessToken: passed.readinessToken })
    expect(JSON.stringify(delivered)).not.toMatch(/isCorrect|"feedback"/)

    await expect(
      gradeSubmission(mastery, { responses: await answersFor(mastery, true, 2) })
    ).rejects.toMatchObject({ code: 'READINESS_REQUIRED' })

    const graded = await gradeSubmission(mastery, {
      responses: await answersFor(mastery, true, 2),
      readinessToken: passed.readinessToken,
    })
    expect(graded).toMatchObject({ passed: true, score: 1 })
    // Secure type: right/wrong only — no key, no explanations.
    expect(graded.results.every((r) => r.feedback === null && r.correctOptionText === null)).toBe(true)
    expect(graded.calibration?.high.correct).toBe(graded.totalQuestions)
  })

  it('a failed Readiness Check returns review topics and no token', async () => {
    const readiness = await assessmentOf('READINESS_CHECK')
    const failed = await gradeSubmission(readiness, { responses: await answersFor(readiness, false) })
    expect(failed.passed).toBe(false)
    expect(failed.readinessToken).toBeNull()
    expect(failed.reviewTopics?.length).toBeGreaterThan(0)
  })
})

describe('grading is server-side', () => {
  async function token() {
    const readiness = await assessmentOf('READINESS_CHECK')
    return (await gradeSubmission(readiness, { responses: await answersFor(readiness, true) })).readinessToken!
  }

  it('a failed Mastery Challenge suggests remediation and reveals nothing', async () => {
    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    const graded = await gradeSubmission(mastery, {
      responses: await answersFor(mastery, false, 2),
      readinessToken: await token(),
    })
    expect(graded).toMatchObject({ passed: false, score: 0 })
    expect(graded.remediation.length).toBeGreaterThan(0)
    expect(JSON.stringify(graded)).not.toMatch(/correctOptionId/)
  })

  it('leaving questions out can only lower the score (denominator = every question)', async () => {
    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    const all = await answersFor(mastery, true, 2)
    const graded = await gradeSubmission(mastery, { responses: all.slice(0, 1), readinessToken: await token() })
    expect(graded.score).toBeCloseTo(1 / all.length)
    expect(graded.passed).toBe(false)
  })

  it('requires a confidence rating on every Mastery Challenge answer (rule #6)', async () => {
    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    await expect(
      gradeSubmission(mastery, { responses: await answersFor(mastery, true), readinessToken: await token() })
    ).rejects.toMatchObject({ code: 'CONFIDENCE_REQUIRED' })
  })

  it('rejects answers for questions that are not on the assessment, and duplicates', async () => {
    const pre = await assessmentOf('PRE_CHECK')
    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    const foreign = await answersFor(mastery, true)
    await expect(gradeSubmission(pre, { responses: foreign })).rejects.toMatchObject({ code: 'INVALID_SUBMISSION' })
    const own = await answersFor(pre, true)
    await expect(gradeSubmission(pre, { responses: [own[0], own[0]] })).rejects.toMatchObject({
      code: 'INVALID_SUBMISSION',
    })
  })
})

describe('single-answer grading and practice', () => {
  it('refuses to act as an answer oracle for Mastery Challenge questions', async () => {
    const mastery = await assessmentOf('MASTERY_CHALLENGE')
    const [first] = await answersFor(mastery, false)
    await expect(gradeSingleAnswer(first.questionId, first.selectedOptionId)).rejects.toBeInstanceOf(SingleAnswerError)
  })

  it('never serves a Mastery Challenge question in the Practice Arena', async () => {
    const practice = await assessmentOf('PRACTICE')
    const masteryIds = new Set(
      (
        await prisma.assessmentQuestion.findMany({
          where: { assessment: { assessmentType: 'MASTERY_CHALLENGE', benchmark: { code: CODE } } },
          select: { questionId: true },
        })
      ).map((r) => r.questionId)
    )
    const seen: string[] = []
    for (let i = 0; i < 40; i++) {
      const item = await getPracticeItem({ assessmentId: practice, state: initialState, seenQuestionIds: seen })
      if (!item || item.payload.type !== 'QUESTION') break
      expect(masteryIds.has(item.payload.question.id)).toBe(false)
      expect(JSON.stringify(item.payload)).not.toMatch(/isCorrect|feedback/)
      seen.push(item.payload.question.id)
    }
    expect(seen.length).toBeGreaterThan(3)
  })

  it('grades a practice answer and explains it afterwards', async () => {
    const practice = await assessmentOf('PRACTICE')
    const item = await getPracticeItem({ assessmentId: practice, state: initialState, seenQuestionIds: [] })
    if (!item || item.payload.type !== 'QUESTION') throw new Error('no practice item')
    const q = item.payload.question
    const correct = await prisma.questionOption.findFirstOrThrow({ where: { questionId: q.id, isCorrect: true } })
    const wrong = q.options.find((o) => o.id !== correct.id)!
    expect((await gradeSingleAnswer(q.id, correct.id)).isCorrect).toBe(true)
    const miss = await gradeSingleAnswer(q.id, wrong.id, { withRemediation: true })
    expect(miss).toMatchObject({ isCorrect: false, correctOptionText: correct.optionText, benchmarkCode: CODE })
  })
})
