/**
 * Validation for progress read back from localStorage or from an imported
 * file. Anything that does not parse is treated as "no progress" rather than
 * trusted: a hand-edited or truncated file must never crash the student area.
 *
 * `.strip()` (zod's default) drops unknown keys, so an imported file cannot
 * smuggle extra fields — such as a name — into what the app stores.
 */

import { z } from 'zod'
import { DEFAULT_SETTINGS, PROGRESS_VERSION, emptyProgress, type LocalProgress } from './types'

const iso = z.string().max(40)
const code = z.string().max(40)

const MissionRecordSchema = z.object({
  status: z.enum([
    'NOT_STARTED',
    'IN_PROGRESS',
    'READY_FOR_MASTERY',
    'NEEDS_REMEDIATION',
    'REMEDIATION_COMPLETE',
    'MASTERED',
    'EXPOSURE_COMPLETE',
  ]),
  masteryScore: z.number().min(0).max(1).nullable().default(null),
  masteredAt: iso.nullable().default(null),
  readinessPassedAt: iso.nullable().default(null),
  readinessToken: z.string().max(200).nullable().default(null),
  masteryAttempts: z
    .array(
      z.object({
        at: iso,
        score: z.number().min(0).max(1),
        passed: z.boolean(),
        formId: z.string().max(60),
      })
    )
    .max(200)
    .default([]),
  offRampAt: iso.nullable().default(null),
  completionCode: z.string().max(80).nullable().default(null),
  flow: z
    .object({
      step: z.string().max(40),
      completed: z.array(z.string().max(40)).max(30),
      trainingIndex: z.number().int().min(0).max(500),
      trainingStepId: z.string().max(60).optional(),
    })
    .nullable()
    .default(null),
})

const TallySchema = z.object({
  correct: z.number().int().min(0),
  incorrect: z.number().int().min(0),
})

const SettingsSchema = z.object({
  highContrast: z.boolean().default(DEFAULT_SETTINGS.highContrast),
  largeText: z.boolean().default(DEFAULT_SETTINGS.largeText),
  reduceMotion: z.boolean().default(DEFAULT_SETTINGS.reduceMotion),
  sentenceChunking: z.boolean().default(DEFAULT_SETTINGS.sentenceChunking),
  readAloud: z.boolean().default(DEFAULT_SETTINGS.readAloud),
  extraTime: z.boolean().default(DEFAULT_SETTINGS.extraTime),
  glossLanguage: z.enum(['es', 'ht']).nullable().default(null),
  skipStoryScenes: z.boolean().default(DEFAULT_SETTINGS.skipStoryScenes),
  pauseMinutes: z.number().int().min(5).max(180).default(DEFAULT_SETTINGS.pauseMinutes),
})

export const LocalProgressSchema = z.object({
  v: z.literal(PROGRESS_VERSION),
  missions: z.record(code, MissionRecordSchema).default({}),
  remediations: z
    .array(
      z.object({
        itemId: z.string().max(60),
        benchmarkCode: code,
        title: z.string().max(300),
        assignedAt: iso,
        completedAt: iso.nullable().default(null),
      })
    )
    .max(500)
    .default([]),
  review: z
    .record(
      code,
      z.object({
        repetitionCount: z.number().int().min(0),
        easinessFactor: z.number().min(1.3).max(5),
        intervalDays: z.number().int().min(1).max(3650),
        dueAt: iso,
        lastReviewedAt: iso.nullable().default(null),
        lastQuality: z.number().int().min(0).max(5).nullable().default(null),
      })
    )
    .default({}),
  reviewCount: z.number().int().min(0).default(0),
  seenQuestionIds: z.array(z.string().max(60)).max(1000).default([]),
  missedQuestionIds: z.array(z.string().max(60)).max(1000).default([]),
  streak: z
    .object({
      currentLength: z.number().int().min(0),
      longestLength: z.number().int().min(0),
      lastActiveDate: z.string().max(10).nullable(),
      freezeTokens: z.number().int().min(0).max(3),
      freezeTokensGrantedWeek: z.string().max(10).nullable(),
    })
    .default(emptyProgress().streak),
  badges: z.record(z.string().max(120), iso).default({}),
  strategy: z
    .record(
      z.string().max(60),
      z.object({ useCount: z.number().int().min(0), completedAt: iso.nullable() })
    )
    .default({}),
  sourceDecoder: z.record(z.string().max(4), iso).default({}),
  storyScenesRead: z.array(z.string().max(60)).max(500).default([]),
  calibration: z
    .object({ high: TallySchema, medium: TallySchema, low: TallySchema })
    .default(emptyProgress().calibration),
  finalTrialTakenAt: iso.nullable().default(null),
  lastActivity: z
    .object({
      label: z.string().max(200),
      subLabel: z.string().max(200),
      href: z.string().max(200).regex(/^\/student\//),
      icon: z.string().max(20),
      at: iso,
    })
    .nullable()
    .default(null),
  settings: SettingsSchema.default(DEFAULT_SETTINGS),
})

/** Parse untrusted JSON-ish input. Returns null when it is not valid progress. */
export function parseProgress(input: unknown): LocalProgress | null {
  const result = LocalProgressSchema.safeParse(input)
  return result.success ? (result.data as LocalProgress) : null
}
