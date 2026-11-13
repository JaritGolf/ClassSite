/**
 * Device-local student progress — the shape of everything the app remembers
 * about a student's work.
 *
 * This lives ONLY in the student's browser (localStorage) and in a file the
 * student chooses to save. It is never sent to the server and the server has
 * nowhere to put it. It deliberately contains no name, no email, no class and
 * no identifier of any kind: nothing here says whose progress it is.
 *
 * Missions are keyed by benchmark CODE (e.g. "SS.7.CG.1.1"), not by a database
 * id, so a saved file still makes sense after the curriculum is re-seeded.
 */

import type { MissionProgressStatus } from '@/lib/mastery/availability-core'
import type { StreakData } from '@/lib/streak/core'

export const PROGRESS_VERSION = 1

/** One submitted Mastery Challenge, kept so off-ramp and form rotation work. */
export interface MasteryAttemptRecord {
  at: string
  score: number
  passed: boolean
  /** Which rotating form was served (assessment id). */
  formId: string
}

/** Where a student is inside a mission, for "pick up where you left off". */
export interface MissionFlowState {
  step: string
  completed: string[]
  trainingIndex: number
  trainingStepId?: string
}

export interface MissionRecord {
  status: MissionProgressStatus
  masteryScore: number | null
  masteredAt: string | null
  readinessPassedAt: string | null
  /** Server-signed proof the Readiness Check was passed; carries no identity. */
  readinessToken: string | null
  masteryAttempts: MasteryAttemptRecord[]
  offRampAt: string | null
  /** Signed completion code to paste into Google Classroom. */
  completionCode: string | null
  flow: MissionFlowState | null
}

export interface RemediationRecord {
  /** The curriculum remediation item (not a per-student row — none exists). */
  itemId: string
  benchmarkCode: string
  title: string
  assignedAt: string
  completedAt: string | null
}

/** SM-2 state for one benchmark (non-negotiable rule #5). */
export interface ReviewRecord {
  repetitionCount: number
  easinessFactor: number
  intervalDays: number
  dueAt: string
  lastReviewedAt: string | null
  lastQuality: number | null
}

export interface ConfidenceTally {
  correct: number
  incorrect: number
}

export interface CalibrationTotals {
  high: ConfidenceTally
  medium: ConfidenceTally
  low: ConfidenceTally
}

export interface StrategyRecord {
  useCount: number
  completedAt: string | null
}

export interface LastActivityRecord {
  label: string
  subLabel: string
  href: string
  icon: string
  at: string
}

/**
 * Display options ANY student can switch on. They are not accommodations in
 * the record-keeping sense: nothing labels them, nobody grants them, and the
 * server never learns which ones are on.
 */
export interface LocalSettings {
  highContrast: boolean
  largeText: boolean
  reduceMotion: boolean
  /** Break long passages into one sentence per line by default. */
  sentenceChunking: boolean
  /** Show the read-aloud control already expanded/ready on passages. */
  readAloud: boolean
  /** Turns off break reminders; nothing in the app is timed either way. */
  extraTime: boolean
  /** Glossary language chosen by the student: Spanish, Haitian Creole, or none. */
  glossLanguage: 'es' | 'ht' | null
  skipStoryScenes: boolean
  pauseMinutes: number
}

export interface LocalProgress {
  v: typeof PROGRESS_VERSION
  missions: Record<string, MissionRecord>
  remediations: RemediationRecord[]
  review: Record<string, ReviewRecord>
  /** Number of Daily Drill answers given (for drill badges). */
  reviewCount: number
  /** Recently seen drill question ids, so the drill prefers fresh ones. */
  seenQuestionIds: string[]
  /** Recently missed question ids, for Republic Challenge "Mistake Replay". */
  missedQuestionIds: string[]
  streak: StreakData
  /** Badge name → date earned. */
  badges: Record<string, string>
  strategy: Record<string, StrategyRecord>
  /** Source Decoder level → date completed. */
  sourceDecoder: Record<string, string>
  storyScenesRead: string[]
  calibration: CalibrationTotals
  finalTrialTakenAt: string | null
  lastActivity: LastActivityRecord | null
  settings: LocalSettings
}

export const DEFAULT_SETTINGS: LocalSettings = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  sentenceChunking: false,
  readAloud: false,
  extraTime: false,
  glossLanguage: null,
  skipStoryScenes: false,
  pauseMinutes: 40,
}

export function emptyMissionRecord(): MissionRecord {
  return {
    status: 'NOT_STARTED',
    masteryScore: null,
    masteredAt: null,
    readinessPassedAt: null,
    readinessToken: null,
    masteryAttempts: [],
    offRampAt: null,
    completionCode: null,
    flow: null,
  }
}

export function emptyProgress(): LocalProgress {
  return {
    v: PROGRESS_VERSION,
    missions: {},
    remediations: [],
    review: {},
    reviewCount: 0,
    seenQuestionIds: [],
    missedQuestionIds: [],
    streak: {
      currentLength: 0,
      longestLength: 0,
      lastActiveDate: null,
      freezeTokens: 2,
      freezeTokensGrantedWeek: null,
    },
    badges: {},
    strategy: {},
    sourceDecoder: {},
    storyScenesRead: [],
    calibration: {
      high: { correct: 0, incorrect: 0 },
      medium: { correct: 0, incorrect: 0 },
      low: { correct: 0, incorrect: 0 },
    },
    finalTrialTakenAt: null,
    lastActivity: null,
    settings: { ...DEFAULT_SETTINGS },
  }
}
