/**
 * Daily Drill and Republic Challenge — stateless server paths against the
 * seeded database. No answer key before submission, Mastery Challenge
 * questions never exposed, only server-issued sessions gradable, and nothing
 * written.
 */

import { PrismaClient } from '@prisma/client'
import { getDrillItems, DRILL_CAP } from '@/lib/spaced-retrieval/drill-stateless'
import {
  gradeRcSession,
  signSession,
  startRcSession,
  verifySession,
  RepublicChallengeError,
} from '@/lib/republic-challenge/stateless'

const prisma = new PrismaClient()
const CLASS = {
  rcSessionLengthOverride: null,
  rcStaminaOverride: null,
  featureEocReviewEnabled: true,
  schoolYear: '2026-2027',
}
const START = { dueBenchmarkCodes: [] as string[], missedQuestionIds: [] as string[] }

async function tableCounts() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public' order by 1`
  const out: Record<string, number> = {}
  for (const { tablename } of tables) {
    const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`select count(*) as n from "${tablename}"`)
    out[tablename] = Number(rows[0].n)
  }
  return out
}

let before: Record<string, number>
let masteryIds: Set<string>

beforeAll(async () => {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-for-signing-0123456789'
  before = await tableCounts()
  masteryIds = new Set(
    (
      await prisma.assessmentQuestion.findMany({
        where: { assessment: { assessmentType: 'MASTERY_CHALLENGE' } },
        select: { questionId: true },
      })
    ).map((r) => r.questionId)
  )
})

afterAll(async () => {
  expect(await tableCounts()).toEqual(before)
  await prisma.$disconnect()
})

describe('Daily Drill items', () => {
  it('returns one keyless, non-Mastery question per due benchmark', async () => {
    const items = await getDrillItems({
      benchmarkCodes: ['SS.7.CG.1.1', 'SS.7.CG.1.2', 'SS.7.CG.1.1'],
      seenQuestionIds: [],
    })
    expect(items.map((i) => i.benchmarkCode)).toEqual(['SS.7.CG.1.1', 'SS.7.CG.1.2'])
    expect(JSON.stringify(items)).not.toMatch(/isCorrect|feedback/)
    for (const item of items) {
      expect(masteryIds.has(item.questionId)).toBe(false)
      expect(item.options.length).toBeGreaterThan(1)
    }
  })

  it('prefers a question the device has not seen', async () => {
    const all = await prisma.question.findMany({
      where: { benchmark: { code: 'SS.7.CG.1.1' }, approvalStatus: 'APPROVED', active: true },
      select: { id: true },
    })
    const eligible = all.map((q) => q.id).filter((id) => !masteryIds.has(id))
    const keep = eligible[0]
    const [item] = await getDrillItems({
      benchmarkCodes: ['SS.7.CG.1.1'],
      seenQuestionIds: eligible.filter((id) => id !== keep),
    })
    expect(item.questionId).toBe(keep)
  })

  it('caps the drill and ignores unknown benchmarks', async () => {
    const many = Array.from({ length: 40 }, (_, i) => `SS.7.CG.9.${i}`)
    expect(await getDrillItems({ benchmarkCodes: many, seenQuestionIds: [] })).toEqual([])
    expect(DRILL_CAP).toBe(15)
  })
})

describe('Republic Challenge sessions', () => {
  it('delivers a keyless set with no Mastery Challenge question in it', async () => {
    const session = await startRcSession({ mode: 'MIXED_MISSION', ...START }, CLASS)
    expect(session.questions.length).toBeGreaterThan(0)
    expect(JSON.stringify(session)).not.toMatch(/isCorrect|feedback/)
    for (const q of session.questions) expect(masteryIds.has(q.questionId)).toBe(false)
  })

  it('grades the issued set, requires confidence, and reveals right/wrong only', async () => {
    const session = await startRcSession({ mode: 'MIXED_MISSION', ...START }, CLASS)
    const questionIds = session.questions.map((q) => q.questionId)
    const key = new Map(
      (
        await prisma.questionOption.findMany({
          where: { questionId: { in: questionIds }, isCorrect: true },
          select: { questionId: true, id: true },
        })
      ).map((o) => [o.questionId, o.id])
    )
    const responses = questionIds.map((id) => ({
      questionId: id,
      selectedOptionId: key.get(id)!,
      confidence: 2 as const,
    }))
    const base = { mode: 'MIXED_MISSION' as const, sessionToken: session.sessionToken, questionIds }

    const graded = await gradeRcSession({ ...base, responses })
    expect(graded).toMatchObject({ score: 1, passed: true, correctCount: questionIds.length })
    expect(Object.keys(graded.results[0]).sort()).toEqual(['isCorrect', 'questionId'])

    await expect(
      gradeRcSession({ ...base, responses: responses.map(({ confidence: _c, ...r }) => r) })
    ).rejects.toMatchObject({ code: 'CONFIDENCE_REQUIRED' })

    // Unanswered questions count against the score.
    expect((await gradeRcSession({ ...base, responses: responses.slice(0, 1) })).score).toBeCloseTo(
      1 / questionIds.length
    )
  })

  it('refuses to grade a question set the server did not issue', async () => {
    const session = await startRcSession({ mode: 'MIXED_MISSION', ...START }, CLASS)
    const questionIds = session.questions.map((q) => q.questionId)
    const smuggled = [...masteryIds][0]

    await expect(
      gradeRcSession({
        mode: 'MIXED_MISSION',
        sessionToken: session.sessionToken,
        questionIds: [...questionIds, smuggled],
        responses: [],
      })
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' })

    await expect(
      gradeRcSession({ mode: 'QUICK_REVIEW', sessionToken: session.sessionToken, questionIds, responses: [] })
    ).rejects.toBeInstanceOf(RepublicChallengeError)

    await expect(
      gradeRcSession({
        mode: 'MIXED_MISSION',
        sessionToken: session.sessionToken,
        questionIds,
        responses: [{ questionId: smuggled, selectedOptionId: 'x', confidence: 1 }],
      })
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  })

  it('session tokens are order-independent, tamper-evident and short-lived', () => {
    const now = new Date('2026-09-14T15:00:00Z')
    const token = signSession('MIXED_MISSION', ['b', 'a'], now)
    expect(verifySession(token, 'MIXED_MISSION', ['a', 'b'], now)).toBe(true)
    expect(verifySession(token, 'MIXED_MISSION', ['a', 'c'], now)).toBe(false)
    expect(verifySession(token, 'MIXED_MISSION', ['a', 'b'], new Date('2026-09-18T15:00:00Z'))).toBe(false)
  })

  it('Mistake Replay uses the ids the device sends, drops unknown and Mastery ids', async () => {
    const pool = await prisma.question.findMany({
      where: { approvalStatus: 'APPROVED', active: true },
      select: { id: true },
      take: 60,
    })
    const mine = pool.map((q) => q.id).filter((id) => !masteryIds.has(id)).slice(0, 3)
    const session = await startRcSession(
      { mode: 'MISTAKE_REPLAY', dueBenchmarkCodes: [], missedQuestionIds: [...mine, 'does-not-exist', [...masteryIds][0]] },
      CLASS
    )
    const ids = session.questions.map((q) => q.questionId)
    for (const id of mine) expect(ids).toContain(id)
    for (const id of ids) expect(masteryIds.has(id)).toBe(false)

    await expect(startRcSession({ mode: 'MISTAKE_REPLAY', ...START }, CLASS)).rejects.toMatchObject({
      code: 'EMPTY_POOL',
    })
  })

  it('honours the class switch and the Final Trial window, server-side', async () => {
    await expect(
      startRcSession({ mode: 'MIXED_MISSION', ...START }, { ...CLASS, featureEocReviewEnabled: false })
    ).rejects.toMatchObject({ code: 'FEATURE_DISABLED' })
    await expect(
      startRcSession({ mode: 'FINAL_REPUBLIC_TRIAL', ...START }, CLASS, new Date('2026-09-14T15:00:00Z'))
    ).rejects.toMatchObject({ code: 'TRIAL_NOT_OPEN' })
    await expect(startRcSession({ mode: 'CATEGORY_CHALLENGE', ...START }, CLASS)).rejects.toMatchObject({
      code: 'CATEGORY_NOT_FOUND',
    })
    await expect(startRcSession({ mode: 'SOURCE_SPRINT', ...START }, CLASS)).rejects.toMatchObject({
      code: 'STIMULUS_TYPE_REQUIRED',
    })
  })
})
