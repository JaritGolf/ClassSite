/**
 * Progress rules — pure functions over device-local progress.
 *
 * Every function takes a LocalProgress and returns a new one; nothing here
 * touches storage, the network, the clock (callers pass `now`) or the DOM, so
 * all of it is unit-tested directly. The mastery, unlock, off-ramp and SM-2
 * rules are the same ones the server engine used to apply — they are reused
 * from src/lib/mastery/availability-core and src/lib/spaced-retrieval/sm2.
 *
 * What the SERVER still decides: whether an answer is right, the score, and
 * whether the 80% threshold was met (rule #1). What the DEVICE now decides:
 * what to remember about those results.
 */

import {
  computeAvailability,
  isOffRampConditionMet,
  pickCurrentMissionId,
  pickMasteryFormIndex,
  TERMINAL_STATUSES,
  type MissionAvailability,
} from '@/lib/mastery/availability-core'
import {
  computeDueAt,
  computeNextState,
  computeQuality,
  halveInterval,
  INITIAL_SM2_STATE,
  type Confidence,
} from '@/lib/spaced-retrieval/sm2'
import { applyActivity } from '@/lib/streak/core'
import {
  emptyMissionRecord,
  type CalibrationTotals,
  type LastActivityRecord,
  type LocalProgress,
  type LocalSettings,
  type MissionFlowState,
  type MissionRecord,
} from './types'

/** Curriculum facts the rules need. Comes from the server; says nothing about anyone. */
export interface MissionCatalogEntry {
  code: string
  title: string
  playable: boolean
  unitId: string
  reportingCategory: string
}

const MAX_REMEMBERED_QUESTIONS = 400

// ── Missions ────────────────────────────────────────────────────────────────

function missionOf(progress: LocalProgress, code: string): MissionRecord {
  return progress.missions[code] ?? emptyMissionRecord()
}

function withMission(
  progress: LocalProgress,
  code: string,
  change: (m: MissionRecord) => MissionRecord
): LocalProgress {
  return {
    ...progress,
    missions: { ...progress.missions, [code]: change(missionOf(progress, code)) },
  }
}

/** What each map node shows and whether it opens, keyed by benchmark code. */
export function missionAvailability(
  catalog: MissionCatalogEntry[],
  progress: LocalProgress
): Map<string, MissionAvailability> {
  return computeAvailability({
    ordered: catalog.map((m) => ({ id: m.code, playable: m.playable })),
    progressRows: Object.entries(progress.missions).map(([code, m]) => ({
      benchmarkId: code,
      status: m.status,
    })),
  })
}

export function currentMissionCode(
  catalog: MissionCatalogEntry[],
  progress: LocalProgress
): string | null {
  return pickCurrentMissionId(missionAvailability(catalog, progress))
}

/** Opening a mission marks it in progress; it never downgrades a later status. */
export function markMissionOpened(progress: LocalProgress, code: string): LocalProgress {
  const current = progress.missions[code]
  if (current && current.status !== 'NOT_STARTED') return progress
  return withMission(progress, code, (m) => ({ ...m, status: 'IN_PROGRESS' }))
}

export function saveMissionFlow(
  progress: LocalProgress,
  code: string,
  flow: MissionFlowState
): LocalProgress {
  return withMission(progress, code, (m) => ({
    ...m,
    status: m.status === 'NOT_STARTED' ? 'IN_PROGRESS' : m.status,
    flow,
  }))
}

/** A passed Readiness Check opens the Mastery Challenge. */
export function recordReadinessPassed(
  progress: LocalProgress,
  code: string,
  readinessToken: string | null,
  now: Date
): LocalProgress {
  return withMission(progress, code, (m) => ({
    ...m,
    readinessPassedAt: m.readinessPassedAt ?? now.toISOString(),
    readinessToken: readinessToken ?? m.readinessToken,
    status:
      m.status === 'NOT_STARTED' || m.status === 'IN_PROGRESS' ? 'READY_FOR_MASTERY' : m.status,
  }))
}

export function submittedMasteryAttempts(progress: LocalProgress, code: string): number {
  return missionOf(progress, code).masteryAttempts.length
}

/** Which rotating Mastery form to serve next (ids sorted the same way every time). */
export function pickMasteryForm(
  formIds: string[],
  progress: LocalProgress,
  code: string
): string | null {
  const index = pickMasteryFormIndex(formIds.length, submittedMasteryAttempts(progress, code))
  return index >= 0 ? formIds[index] : null
}

export type MasteryOutcome = 'MASTERED' | 'NEEDS_REMEDIATION' | 'OFF_RAMP'

export interface MasteryAttemptInput {
  code: string
  formId: string
  /** Score and pass/fail exactly as the server graded them. */
  score: number
  passed: boolean
  completionCode: string | null
  /** Remediation the server suggested for the questions that were missed. */
  remediation: { itemId: string; title: string }[]
  now: Date
}

/**
 * Record a graded Mastery Challenge.
 *
 *   pass → MASTERED (which is what opens the next mission), and the benchmark
 *          enters spaced review, due tomorrow.
 *   fail → off-ramp if the rule is met (3 fails + a completed remediation +
 *          7 days): EXPOSURE_COMPLETE, next mission opens, review interval
 *          halved. Otherwise NEEDS_REMEDIATION and the remediation is assigned.
 *
 * A Mastery re-attempt never resets SM-2 state (known pitfall).
 */
export function recordMasteryAttempt(
  progress: LocalProgress,
  input: MasteryAttemptInput
): { progress: LocalProgress; outcome: MasteryOutcome } {
  const { code, now } = input
  const iso = now.toISOString()
  const before = missionOf(progress, code)
  const attempts = [
    ...before.masteryAttempts,
    { at: iso, score: input.score, passed: input.passed, formId: input.formId },
  ]

  if (input.passed) {
    let next = withMission(progress, code, (m) => ({
      ...m,
      status: 'MASTERED',
      masteryScore: input.score,
      // First mastery date is kept — a later pass must not re-stamp it.
      masteredAt: m.masteredAt ?? iso,
      completionCode: input.completionCode ?? m.completionCode,
      masteryAttempts: attempts,
    }))
    if (!next.review[code]) {
      next = {
        ...next,
        review: {
          ...next.review,
          [code]: {
            ...INITIAL_SM2_STATE,
            dueAt: computeDueAt(1, now).toISOString(),
            lastReviewedAt: null,
            lastQuality: null,
          },
        },
      }
    }
    return { progress: next, outcome: 'MASTERED' }
  }

  const failed = attempts.filter((a) => !a.passed)
  const completedRemediations = progress.remediations.filter(
    (r) => r.benchmarkCode === code && r.completedAt !== null
  ).length
  const offRamp =
    before.offRampAt === null &&
    !TERMINAL_STATUSES.has(before.status) &&
    isOffRampConditionMet(failed.length, completedRemediations, new Date(failed[0].at), now)

  if (offRamp) {
    let next = withMission(progress, code, (m) => ({
      ...m,
      status: 'EXPOSURE_COMPLETE',
      offRampAt: iso,
      masteryAttempts: attempts,
    }))
    const existing = next.review[code]
    next = {
      ...next,
      review: {
        ...next.review,
        // Off-ramp increases review frequency: interval halved, or started.
        [code]: existing
          ? { ...existing, intervalDays: halveInterval(existing.intervalDays) }
          : {
              ...INITIAL_SM2_STATE,
              dueAt: computeDueAt(1, now).toISOString(),
              lastReviewedAt: null,
              lastQuality: null,
            },
      },
    }
    return { progress: next, outcome: 'OFF_RAMP' }
  }

  // A mission already finished stays finished; only the attempt is logged.
  if (TERMINAL_STATUSES.has(before.status)) {
    return {
      progress: withMission(progress, code, (m) => ({ ...m, masteryAttempts: attempts })),
      outcome: 'NEEDS_REMEDIATION',
    }
  }

  const open = new Set(
    progress.remediations.filter((r) => r.completedAt === null).map((r) => r.itemId)
  )
  const newRemediations = input.remediation
    .filter((r) => !open.has(r.itemId))
    .map((r) => ({
      itemId: r.itemId,
      benchmarkCode: code,
      title: r.title,
      assignedAt: iso,
      completedAt: null,
    }))

  const next = withMission(
    { ...progress, remediations: [...progress.remediations, ...newRemediations] },
    code,
    (m) => ({ ...m, status: 'NEEDS_REMEDIATION', masteryAttempts: attempts })
  )
  return { progress: next, outcome: 'NEEDS_REMEDIATION' }
}

// ── Remediation ─────────────────────────────────────────────────────────────

export function openRemediations(progress: LocalProgress) {
  return progress.remediations.filter((r) => r.completedAt === null)
}

/** Assign remediation outside a Mastery fail (e.g. the Practice Arena escalation). */
export function assignRemediations(
  progress: LocalProgress,
  code: string,
  items: { itemId: string; title: string }[],
  now: Date
): LocalProgress {
  const open = new Set(openRemediations(progress).map((r) => r.itemId))
  const added = items
    .filter((r) => !open.has(r.itemId))
    .map((r) => ({
      itemId: r.itemId,
      benchmarkCode: code,
      title: r.title,
      assignedAt: now.toISOString(),
      completedAt: null,
    }))
  if (added.length === 0) return progress
  return { ...progress, remediations: [...progress.remediations, ...added] }
}

/**
 * Finish one remediation. When none remain for that mission and the mission
 * was waiting on remediation, it becomes REMEDIATION_COMPLETE (second chance).
 */
export function completeRemediation(
  progress: LocalProgress,
  itemId: string,
  now: Date
): LocalProgress {
  const target = progress.remediations.find((r) => r.itemId === itemId && r.completedAt === null)
  if (!target) return progress
  const remediations = progress.remediations.map((r) =>
    r === target ? { ...r, completedAt: now.toISOString() } : r
  )
  let next: LocalProgress = { ...progress, remediations }
  const stillOpen = remediations.some(
    (r) => r.benchmarkCode === target.benchmarkCode && r.completedAt === null
  )
  if (!stillOpen && missionOf(next, target.benchmarkCode).status === 'NEEDS_REMEDIATION') {
    next = withMission(next, target.benchmarkCode, (m) => ({ ...m, status: 'REMEDIATION_COMPLETE' }))
  }
  return next
}

// ── Spaced review (SM-2) ────────────────────────────────────────────────────

/** Benchmark codes due for the Daily Drill, oldest first. */
export function dueReviewCodes(progress: LocalProgress, now: Date): string[] {
  return Object.entries(progress.review)
    .filter(([, r]) => new Date(r.dueAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
    .map(([code]) => code)
}

export interface DrillReviewOutcome {
  quality: number
  newIntervalDays: number
  dueAt: string
  offRampRecovered: boolean
}

/**
 * Apply one Daily Drill answer. Correctness comes from the server; the SM-2
 * arithmetic (rule #5) and the off-ramp interval rules run here.
 */
export function applyDrillReview(
  progress: LocalProgress,
  code: string,
  answer: { isCorrect: boolean; confidence: Confidence; questionId: string },
  now: Date
): { progress: LocalProgress; outcome: DrillReviewOutcome | null } {
  const current = progress.review[code]
  if (!current) return { progress, outcome: null }

  const quality = computeQuality(answer.isCorrect, answer.confidence)
  const nextState = computeNextState(
    {
      repetitionCount: current.repetitionCount,
      easinessFactor: current.easinessFactor,
      intervalDays: current.intervalDays,
    },
    quality
  )

  let intervalDays = nextState.intervalDays
  let offRampRecovered = false
  const mission = missionOf(progress, code)

  if (mission.status === 'EXPOSURE_COMPLETE') {
    const twoInARow = quality >= 3 && (current.lastQuality ?? -1) >= 3
    if (twoInARow) {
      offRampRecovered = true
    } else {
      intervalDays = halveInterval(nextState.intervalDays)
    }
  }
  const dueAt = computeDueAt(intervalDays, now).toISOString()
  const next: LocalProgress = {
    ...progress,
    review: {
      ...progress.review,
      [code]: {
        repetitionCount: nextState.repetitionCount,
        easinessFactor: nextState.easinessFactor,
        intervalDays,
        dueAt,
        lastReviewedAt: now.toISOString(),
        lastQuality: quality,
      },
    },
    reviewCount: progress.reviewCount + 1,
  }

  return {
    progress: noteQuestions(next, [answer.questionId], answer.isCorrect ? [] : [answer.questionId]),
    outcome: { quality, newIntervalDays: intervalDays, dueAt, offRampRecovered },
  }
}

// ── Small counters ──────────────────────────────────────────────────────────

function capped(list: string[]): string[] {
  const unique = Array.from(new Set(list))
  return unique.slice(Math.max(0, unique.length - MAX_REMEMBERED_QUESTIONS))
}

/** Remember which questions were seen / missed (ids only, capped). */
export function noteQuestions(
  progress: LocalProgress,
  seen: string[],
  missed: string[]
): LocalProgress {
  if (seen.length === 0 && missed.length === 0) return progress
  const missedSet = new Set(missed)
  // A question answered correctly later leaves the "missed" pile.
  const stillMissed = progress.missedQuestionIds.filter(
    (id) => !seen.includes(id) || missedSet.has(id)
  )
  return {
    ...progress,
    seenQuestionIds: capped([...progress.seenQuestionIds, ...seen]),
    missedQuestionIds: capped([...stillMissed, ...missed]),
  }
}

export function recordStreakActivity(progress: LocalProgress, now: Date): LocalProgress {
  return { ...progress, streak: applyActivity(progress.streak, now) }
}

export function addCalibration(
  progress: LocalProgress,
  delta: CalibrationTotals | null | undefined
): LocalProgress {
  if (!delta) return progress
  const add = (k: keyof CalibrationTotals) => ({
    correct: progress.calibration[k].correct + delta[k].correct,
    incorrect: progress.calibration[k].incorrect + delta[k].incorrect,
  })
  return { ...progress, calibration: { high: add('high'), medium: add('medium'), low: add('low') } }
}

export function recordStrategyUse(progress: LocalProgress, missionCode: string, now: Date): LocalProgress {
  const current = progress.strategy[missionCode] ?? { useCount: 0, completedAt: null }
  return {
    ...progress,
    strategy: {
      ...progress.strategy,
      [missionCode]: {
        useCount: current.useCount + 1,
        completedAt: current.completedAt ?? now.toISOString(),
      },
    },
  }
}

/** Source Decoder levels unlock in order; completing one twice is a no-op. */
export function completeSourceDecoderLevel(
  progress: LocalProgress,
  level: number,
  now: Date
): LocalProgress {
  if (!Number.isInteger(level) || level < 1 || level > 4) return progress
  if (level > 1 && !progress.sourceDecoder[String(level - 1)]) return progress
  if (progress.sourceDecoder[String(level)]) return progress
  return {
    ...progress,
    sourceDecoder: { ...progress.sourceDecoder, [String(level)]: now.toISOString() },
  }
}

export function markStorySceneRead(progress: LocalProgress, key: string): LocalProgress {
  if (progress.storyScenesRead.includes(key)) return progress
  return { ...progress, storyScenesRead: [...progress.storyScenesRead, key] }
}

export function setLastActivity(
  progress: LocalProgress,
  activity: Omit<LastActivityRecord, 'at'>,
  now: Date
): LocalProgress {
  return { ...progress, lastActivity: { ...activity, at: now.toISOString() } }
}

export function updateSettings(progress: LocalProgress, patch: Partial<LocalSettings>): LocalProgress {
  return { ...progress, settings: { ...progress.settings, ...patch } }
}

// ── Badges ──────────────────────────────────────────────────────────────────

export interface BadgeCatalogEntry {
  name: string
  criteria: unknown
}

interface BadgeCriteria {
  event?: string
  count?: number
  tags?: string[]
  tag?: string
  unitCode?: string
  category?: string
  threshold?: number
  level?: number
  missionCode?: string
}

function masteredCodes(progress: LocalProgress): Set<string> {
  return new Set(
    Object.entries(progress.missions)
      .filter(([, m]) => m.status === 'MASTERED')
      .map(([code]) => code)
  )
}

function criteriaMet(
  c: BadgeCriteria,
  progress: LocalProgress,
  catalog: MissionCatalogEntry[],
  strategyRequired: number
): boolean {
  const mastered = masteredCodes(progress)
  const allMastered = (codes: string[]) => codes.length > 0 && codes.every((x) => mastered.has(x))
  switch (c.event) {
    case 'benchmark_mastered':
      // Tag-scoped variants have no data source — never met, never faked.
      if (c.tags && c.tags.length > 0) return false
      return mastered.size >= (c.count ?? 1)
    case 'unit_complete':
      if (!c.unitCode) return false
      return allMastered(
        catalog.filter((m) => m.unitId === c.unitCode && m.playable).map((m) => m.code)
      )
    case 'reporting_category_mastered':
      if (!c.category) return false
      return allMastered(
        catalog.filter((m) => m.reportingCategory === c.category && m.playable).map((m) => m.code)
      )
    case 'mastery_score_above': {
      if (c.tag || c.threshold === undefined) return false
      const threshold = c.threshold
      return Object.values(progress.missions).some((m) =>
        m.masteryAttempts.some((a) => a.passed && a.score >= threshold)
      )
    }
    case 'streak_days':
      return (
        Math.max(progress.streak.currentLength, progress.streak.longestLength) >= (c.count ?? 1)
      )
    case 'drill_complete':
      return progress.reviewCount >= (c.count ?? 1)
    case 'source_decoder_level':
      return c.level !== undefined && Boolean(progress.sourceDecoder[String(c.level)])
    case 'strategy_mission':
      return Boolean(c.missionCode && progress.strategy[c.missionCode]?.completedAt)
    case 'strategy_track_complete': {
      const need = Math.max(strategyRequired, 1)
      const met = Object.values(progress.strategy).filter(
        (s) => s.completedAt && s.useCount >= need
      ).length
      return met >= (c.count ?? 7)
    }
    default:
      return false
  }
}

/**
 * Award every badge whose criteria are now met. Idempotent: a badge already
 * earned keeps its original date. Returns the names newly earned this call.
 */
export function evaluateBadges(
  progress: LocalProgress,
  badges: BadgeCatalogEntry[],
  catalog: MissionCatalogEntry[],
  now: Date,
  strategyRequired = 0
): { progress: LocalProgress; newlyEarned: string[] } {
  const newlyEarned: string[] = []
  const earned = { ...progress.badges }
  for (const badge of badges) {
    if (earned[badge.name]) continue
    const c = (badge.criteria ?? {}) as BadgeCriteria
    if (criteriaMet(c, progress, catalog, strategyRequired)) {
      earned[badge.name] = now.toISOString()
      newlyEarned.push(badge.name)
    }
  }
  if (newlyEarned.length === 0) return { progress, newlyEarned }
  return { progress: { ...progress, badges: earned }, newlyEarned }
}

// ── Summary numbers ─────────────────────────────────────────────────────────

export function masteredCount(progress: LocalProgress): number {
  return masteredCodes(progress).size
}

/** Missions finished either way (mastered or off-ramped). */
export function finishedCount(progress: LocalProgress): number {
  return Object.values(progress.missions).filter((m) => TERMINAL_STATUSES.has(m.status)).length
}

/** Strategy uses still owed against a per-strategy target. */
export function strategyOwed(
  progress: LocalProgress,
  missionCodes: string[],
  required: number
): number {
  if (required <= 0) return 0
  return missionCodes.reduce(
    (sum, code) => sum + Math.max(0, required - (progress.strategy[code]?.useCount ?? 0)),
    0
  )
}
