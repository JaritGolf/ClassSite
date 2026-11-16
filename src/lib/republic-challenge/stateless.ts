/**
 * Republic Challenge — stateless sessions.
 *
 * A session used to be an ephemeral Assessment row plus an attempt for one
 * student. Now the server PICKS questions and GRADES answers and stores
 * neither. What ties the two requests together is a signed session token:
 *
 *   start  → questions (no key) + token = HMAC(mode, date, sorted question ids)
 *   submit → the same token + answers; the server grades exactly the question
 *            set the token names, and nothing else.
 *
 * Without the token, "grade these answers" would be a right/wrong oracle for
 * any question in the bank. With it, only a set the server itself chose can be
 * graded — and Mastery Challenge questions are never in any Republic Challenge
 * pool, so they cannot be probed this way at all.
 *
 * The request may carry benchmark codes that are due for review and ids of
 * questions the device has seen missed (Quick Review, Mistake Replay). Those
 * describe curriculum items, not a person, and they are not kept.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { StimulusType } from '@prisma/client'
import { deliverQuestions, type DeliveredQuestion } from '@/lib/assessment/stateless'
import { masteryFormQuestionIds } from '@/lib/assessment/single-answer'
import { gradeResponses, computeScore } from '@/lib/assessment/grader'
import { computeCalibrationBreakdown, type CalibrationBreakdown } from '@/lib/metacognition/breakdown'
import { ConfidenceValueSchema } from '@/lib/assessment/wire'
import { schoolDateStamp, signMessage, signaturesMatch } from '@/lib/completion-codes/signing'
import { allocateByBlueprint } from './blueprint'
import { REPORTING_CATEGORY_WEIGHTS } from './weights'
import { resolveSessionLength, type ClassConfig, type Mode } from './stamina'
import { isFinalTrialWindowOpen } from './final-trial-window'

export class RepublicChallengeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'EMPTY_POOL'
      | 'FEATURE_DISABLED'
      | 'CATEGORY_NOT_FOUND'
      | 'STIMULUS_TYPE_REQUIRED'
      | 'TRIAL_NOT_OPEN'
      | 'INVALID_SESSION'
      | 'CONFIDENCE_REQUIRED'
  ) {
    super(message)
    this.name = 'RepublicChallengeError'
  }
}

export const RC_ERROR_STATUS: Record<RepublicChallengeError['code'], number> = {
  EMPTY_POOL: 422,
  FEATURE_DISABLED: 403,
  CATEGORY_NOT_FOUND: 404,
  STIMULUS_TYPE_REQUIRED: 400,
  TRIAL_NOT_OPEN: 403,
  INVALID_SESSION: 400,
  CONFIDENCE_REQUIRED: 422,
}

const MODES = [
  'QUICK_REVIEW',
  'CATEGORY_CHALLENGE',
  'MIXED_MISSION',
  'MISTAKE_REPLAY',
  'SOURCE_SPRINT',
  'ENDURANCE_TRIAL',
  'FINAL_REPUBLIC_TRIAL',
] as const

const Id = z.string().min(1).max(60)

export const RcStartSchema = z.object({
  mode: z.enum(MODES),
  reportingCategoryId: Id.optional(),
  stimulusType: z.string().max(30).optional(),
  /** Benchmarks the device says are due for review (Quick Review). */
  dueBenchmarkCodes: z.array(z.string().max(30)).max(60).default([]),
  /** Questions the device remembers missing (Quick Review, Mistake Replay). */
  missedQuestionIds: z.array(Id).max(400).default([]),
})

export const RcSubmitSchema = z.object({
  mode: z.enum(MODES),
  sessionToken: z.string().min(10).max(80),
  questionIds: z.array(Id).min(1).max(120),
  responses: z
    .array(z.object({ questionId: Id, selectedOptionId: Id, confidence: ConfidenceValueSchema.optional() }))
    .max(120),
})

export interface RcClassConfig extends ClassConfig {
  featureEocReviewEnabled: boolean
  schoolYear: string
}

const APPROVED = { active: true, approvalStatus: 'APPROVED' as const }
const SIG_LENGTH = 20
/** A session can be submitted on the day it was started or the day after. */
const TOKEN_PREFIX = 'RC1'

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

function sessionMessage(mode: string, dateStamp: string, questionIds: string[]): string {
  return `rc|v1|${mode}|${dateStamp}|${[...questionIds].sort().join(',')}`
}

export function signSession(
  mode: string,
  questionIds: string[],
  now: Date = new Date(),
  env: Record<string, string | undefined> = process.env
): string {
  const date = schoolDateStamp(now)
  return `${TOKEN_PREFIX}.${date}.${signMessage(sessionMessage(mode, date, questionIds), SIG_LENGTH, env)}`
}

export function verifySession(
  token: string,
  mode: string,
  questionIds: string[],
  now: Date = new Date(),
  env: Record<string, string | undefined> = process.env
): boolean {
  const [prefix, date, sig] = token.split('.')
  if (prefix !== TOKEN_PREFIX || !date || !sig) return false
  const today = schoolDateStamp(now)
  const yesterday = schoolDateStamp(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  if (date !== today && date !== yesterday) return false
  try {
    return signaturesMatch(sig, signMessage(sessionMessage(mode, date, questionIds), SIG_LENGTH, env))
  } catch {
    return false
  }
}

// ── Pickers (read-only) ─────────────────────────────────────────────────────

async function poolIds(where: object, exclude: Set<string>): Promise<string[]> {
  const rows = await prisma.question.findMany({ where: { ...APPROVED, ...where }, select: { id: true } })
  return shuffle(rows.map((r) => r.id).filter((id) => !exclude.has(id)))
}

/** Blueprint-weighted across the four EOC reporting categories, backfilled if a category is thin. */
async function pickBlueprintWeighted(length: number, levelMin: number, exclude: Set<string>): Promise<string[]> {
  const categories = await prisma.reportingCategory.findMany({ select: { id: true, name: true } })
  const allocation = allocateByBlueprint(length, REPORTING_CATEGORY_WEIGHTS)
  const picked: string[] = []
  for (const { name, count } of allocation.ordered) {
    if (count <= 0) continue
    const category = categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))
    if (!category) continue
    const ids = await poolIds(
      { reportingCategoryId: category.id, readingLoadLevel: { gte: levelMin } },
      exclude
    )
    picked.push(...ids.slice(0, count))
  }
  if (picked.length < length) {
    const taken = new Set([...exclude, ...picked])
    const extras = await poolIds({ readingLoadLevel: { gte: levelMin } }, taken)
    picked.push(...extras.slice(0, length - picked.length))
  }
  return picked
}

/** Approved, non-Mastery questions among ids the device sent. Unknown ids are dropped. */
async function validIds(ids: string[], exclude: Set<string>): Promise<{ id: string; benchmarkId: string }[]> {
  if (ids.length === 0) return []
  const rows = await prisma.question.findMany({
    where: { ...APPROVED, id: { in: ids } },
    select: { id: true, benchmarkId: true },
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Keep the device's order (most recent last → reverse for "most recent first").
  return ids
    .filter((id) => byId.has(id) && !exclude.has(id))
    .reverse()
    .map((id) => byId.get(id)!)
}

async function pickQuestionIds(
  input: z.infer<typeof RcStartSchema>,
  length: number,
  exclude: Set<string>
): Promise<string[]> {
  switch (input.mode) {
    case 'QUICK_REVIEW': {
      const picked: string[] = []
      const usedBenchmarks = new Set<string>()
      for (const code of input.dueBenchmarkCodes) {
        if (picked.length >= length) break
        const [id] = await poolIds({ benchmark: { code } }, new Set([...exclude, ...picked]))
        if (id) picked.push(id)
      }
      for (const q of await validIds(input.missedQuestionIds, exclude)) {
        if (picked.length >= length) break
        if (picked.includes(q.id) || usedBenchmarks.has(q.benchmarkId)) continue
        picked.push(q.id)
        usedBenchmarks.add(q.benchmarkId)
      }
      if (picked.length < length) {
        const filler = await poolIds({}, new Set([...exclude, ...picked]))
        picked.push(...filler.slice(0, length - picked.length))
      }
      return picked
    }
    case 'CATEGORY_CHALLENGE': {
      if (!input.reportingCategoryId) {
        throw new RepublicChallengeError('Pick a reporting category.', 'CATEGORY_NOT_FOUND')
      }
      const category = await prisma.reportingCategory.findUnique({
        where: { id: input.reportingCategoryId },
        select: { id: true },
      })
      if (!category) throw new RepublicChallengeError('Unknown reporting category.', 'CATEGORY_NOT_FOUND')
      return (await poolIds({ reportingCategoryId: category.id }, exclude)).slice(0, length)
    }
    case 'MISTAKE_REPLAY': {
      const missed = await validIds(input.missedQuestionIds, exclude)
      const picked = missed.slice(0, length).map((q) => q.id)
      if (picked.length > 0 && picked.length < length) {
        const benchmarkIds = [...new Set(missed.map((q) => q.benchmarkId))]
        const alternates = await poolIds(
          { benchmarkId: { in: benchmarkIds } },
          new Set([...exclude, ...picked])
        )
        picked.push(...alternates.slice(0, length - picked.length))
      }
      return picked
    }
    case 'SOURCE_SPRINT': {
      if (!input.stimulusType) {
        throw new RepublicChallengeError('Pick a source type.', 'STIMULUS_TYPE_REQUIRED')
      }
      return (
        await poolIds(
          {
            stimulus: {
              is: { stimulusType: input.stimulusType as StimulusType, approvalStatus: 'APPROVED' },
            },
          },
          exclude
        )
      ).slice(0, length)
    }
    case 'MIXED_MISSION':
    case 'ENDURANCE_TRIAL':
      return pickBlueprintWeighted(length, 1, exclude)
    case 'FINAL_REPUBLIC_TRIAL':
      return pickBlueprintWeighted(length, 2, exclude)
  }
}

const TITLES: Record<Mode, string> = {
  QUICK_REVIEW: 'Quick Review',
  CATEGORY_CHALLENGE: 'Category Challenge',
  MIXED_MISSION: 'Mixed Mission',
  MISTAKE_REPLAY: 'Mistake Replay',
  SOURCE_SPRINT: 'Source Sprint',
  ENDURANCE_TRIAL: 'Endurance Trial',
  FINAL_REPUBLIC_TRIAL: 'Final Republic Trial',
}

export interface RcSession {
  mode: Mode
  title: string
  assessmentType: 'REPUBLIC_CHALLENGE' | 'FINAL_TRIAL'
  masteryThreshold: number
  sessionToken: string
  questions: DeliveredQuestion[]
}

export async function startRcSession(
  input: z.infer<typeof RcStartSchema>,
  classConfig: RcClassConfig | null,
  now: Date = new Date()
): Promise<RcSession> {
  if (classConfig && !classConfig.featureEocReviewEnabled) {
    throw new RepublicChallengeError('Republic Challenge is switched off.', 'FEATURE_DISABLED')
  }
  if (
    input.mode === 'FINAL_REPUBLIC_TRIAL' &&
    !isFinalTrialWindowOpen(classConfig?.schoolYear, now)
  ) {
    throw new RepublicChallengeError('The Final Republic Trial opens in April.', 'TRIAL_NOT_OPEN')
  }

  const length = resolveSessionLength(classConfig, input.mode, now)
  // Mastery Challenge questions are never in a Republic Challenge pool.
  const exclude = await masteryFormQuestionIds()
  const ids = [...new Set(await pickQuestionIds(input, length, exclude))].slice(0, length)

  if (ids.length === 0) {
    throw new RepublicChallengeError(
      input.mode === 'MISTAKE_REPLAY'
        ? 'No missed questions are saved on this device yet.'
        : 'No questions are available for this mode yet.',
      'EMPTY_POOL'
    )
  }

  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      prompt: true,
      itemType: true,
      benchmarkId: true,
      // id + text only — the key is never loaded on this path.
      options: { select: { id: true, optionText: true }, orderBy: { id: 'asc' } },
    },
  })
  const byId = new Map(rows.map((q) => [q.id, q]))
  const ordered = ids.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q))

  return {
    mode: input.mode,
    title: TITLES[input.mode],
    assessmentType: input.mode === 'FINAL_REPUBLIC_TRIAL' ? 'FINAL_TRIAL' : 'REPUBLIC_CHALLENGE',
    masteryThreshold: 0.8,
    sessionToken: signSession(input.mode, ordered.map((q) => q.id), now),
    questions: await deliverQuestions(ordered),
  }
}

export interface RcGrade {
  assessmentType: 'REPUBLIC_CHALLENGE' | 'FINAL_TRIAL'
  score: number
  passed: boolean
  totalQuestions: number
  correctCount: number
  /** Right/wrong only — a Republic Challenge never reveals the key. */
  results: { questionId: string; isCorrect: boolean }[]
  calibration: CalibrationBreakdown
}

export async function gradeRcSession(
  input: z.infer<typeof RcSubmitSchema>,
  now: Date = new Date()
): Promise<RcGrade> {
  const questionIds = [...new Set(input.questionIds)]
  if (!verifySession(input.sessionToken, input.mode, questionIds, now)) {
    throw new RepublicChallengeError('This session is not valid or has expired.', 'INVALID_SESSION')
  }

  const inSession = new Set(questionIds)
  const seen = new Set<string>()
  for (const r of input.responses) {
    if (!inSession.has(r.questionId) || seen.has(r.questionId)) {
      throw new RepublicChallengeError('Answers do not match this session.', 'INVALID_SESSION')
    }
    seen.add(r.questionId)
  }
  // Rule #6: confidence is required on every Republic Challenge answer.
  if (input.responses.some((r) => r.confidence === undefined)) {
    throw new RepublicChallengeError('A confidence rating is required on every answer.', 'CONFIDENCE_REQUIRED')
  }

  const options = await prisma.questionOption.findMany({
    where: { questionId: { in: questionIds }, isCorrect: true },
    select: { questionId: true, id: true },
  })
  const correctOptions = new Map(options.map((o) => [o.questionId, o.id]))
  const pointsMap = new Map(questionIds.map((id) => [id, 1]))

  const grades = gradeResponses(input.responses, correctOptions, pointsMap)
  const { score, passed } = computeScore(grades, pointsMap, 0.8)

  return {
    assessmentType: input.mode === 'FINAL_REPUBLIC_TRIAL' ? 'FINAL_TRIAL' : 'REPUBLIC_CHALLENGE',
    score,
    passed,
    totalQuestions: questionIds.length,
    correctCount: grades.filter((g) => g.isCorrect).length,
    results: grades.map((g) => ({ questionId: g.questionId, isCorrect: g.isCorrect })),
    calibration: computeCalibrationBreakdown(grades),
  }
}

// ── Hub configuration (curriculum facts only) ───────────────────────────────

export async function getBlueprintCoverage(levelMin = 2): Promise<{ covered: number; total: number }> {
  const [categories, withPool] = await Promise.all([
    prisma.reportingCategory.findMany({ select: { id: true } }),
    prisma.question.groupBy({
      by: ['reportingCategoryId'],
      where: { readingLoadLevel: { gte: levelMin }, ...APPROVED },
      _count: { _all: true },
    }),
  ])
  const covered = new Set(withPool.map((r) => r.reportingCategoryId))
  return { covered: categories.filter((c) => covered.has(c.id)).length, total: categories.length }
}
