/**
 * Source Decoder Track
 *
 * A parallel 4-level mini-progression teaching stimulus-reading skills.
 * Mission definitions are hardcoded (not stored in DB — they are
 * instructional scaffolding, not content that varies per student).
 * Progress tracking IS stored in DB (SourceDecoderProgress table).
 *
 * Spec reference: Section 16.4
 */

import { prisma } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────

export type SourceDecoderActivityType =
  | 'HIGHLIGHT_ANSWER'
  | 'PARAPHRASE_CLAIM'
  | 'AUTHOR_PURPOSE'
  | 'COMPARE_SOURCES'

export interface SourceDecoderMission {
  level: 1 | 2 | 3 | 4
  title: string
  objective: string
  activityType: SourceDecoderActivityType
  instructions: string
  scaffoldingHint: string
}

export interface SourceDecoderProgressRecord {
  level: number
  completedAt: Date | null
  isCompleted: boolean
}

// ── Error type ─────────────────────────────────────────────────────────────

export class SourceDecoderError extends Error {
  constructor(
    message: string,
    public readonly code: 'LEVEL_OUT_OF_RANGE' | 'PREREQUISITE_NOT_MET'
  ) {
    super(message)
    this.name = 'SourceDecoderError'
  }
}

// ── Hardcoded mission definitions ─────────────────────────────────────────

const MISSIONS: SourceDecoderMission[] = [
  {
    level: 1,
    title: 'Find the Evidence',
    objective:
      'Read the passage and highlight the sentence that best answers the question.',
    activityType: 'HIGHLIGHT_ANSWER',
    instructions:
      'Read the passage. The question is shown below it. Find and highlight the exact sentence that answers the question.',
    scaffoldingHint:
      'Look for key words from the question inside the passage. They often appear close to the answer sentence.',
  },
  {
    level: 2,
    title: 'Claim vs. Evidence',
    objective:
      "Identify the author's main claim and find one piece of evidence that supports it.",
    activityType: 'PARAPHRASE_CLAIM',
    instructions:
      "In your own words, write what the author is arguing (the claim). Then find one sentence from the passage that proves it (the evidence).",
    scaffoldingHint:
      'A claim answers "what does the author believe?" Evidence answers "how do they know?"',
  },
  {
    level: 3,
    title: "Author's Purpose",
    objective:
      "Determine whether the author is trying to inform, persuade, or explain — and whether the conclusion is stated or implied.",
    activityType: 'AUTHOR_PURPOSE',
    instructions:
      "Choose the author's purpose (inform, persuade, or explain). Then decide: does the author state the conclusion directly, or do they expect you to figure it out?",
    scaffoldingHint:
      'Look at the last sentence. Authors often state their conclusion there — or deliberately leave it for the reader.',
  },
  {
    level: 4,
    title: 'Source Showdown',
    objective:
      'Compare two sources on the same topic. Find one agreement and one disagreement.',
    activityType: 'COMPARE_SOURCES',
    instructions:
      'Read both passages about the same event. Write one thing both authors agree on. Write one thing they disagree about.',
    scaffoldingHint:
      'Look for the same event described in both. Do they say the same thing happened? Or do they explain it differently?',
  },
]

// ── Pure mission accessors ─────────────────────────────────────────────────

/** Return all 4 mission definitions. Pure function — no DB. */
export function getSourceDecoderMissions(): SourceDecoderMission[] {
  return MISSIONS
}

/** Return the mission for a specific level, or null if out of range. Pure function. */
export function getSourceDecoderMission(
  level: number
): SourceDecoderMission | null {
  return MISSIONS.find((m) => m.level === level) ?? null
}

// ── DB functions ──────────────────────────────────────────────────────────

/**
 * Return a full 4-level progress map for a student.
 * Levels not yet started will appear with completedAt: null.
 */
export async function getSourceDecoderProgress(studentId: string): Promise<{
  progress: SourceDecoderProgressRecord[]
  highestCompletedLevel: number
}> {
  const rows = await prisma.sourceDecoderProgress.findMany({
    where: { studentId },
    select: { level: true, completedAt: true },
  })

  // Build a map keyed by level
  const byLevel = new Map(rows.map((r) => [r.level, r.completedAt]))

  const progress: SourceDecoderProgressRecord[] = [1, 2, 3, 4].map((level) => {
    const completedAt = byLevel.get(level) ?? null
    return { level, completedAt, isCompleted: completedAt !== null }
  })

  const highestCompletedLevel =
    progress.filter((p) => p.isCompleted).reduce((max, p) => Math.max(max, p.level), 0)

  return { progress, highestCompletedLevel }
}

/**
 * Mark a Source Decoder level as complete.
 *
 * - Level must be 1–4 (throws LEVEL_OUT_OF_RANGE otherwise)
 * - Levels 2–4 require the previous level to be completed first
 *   (throws PREREQUISITE_NOT_MET otherwise)
 * - Idempotent: second call returns the original completedAt unchanged
 */
export async function completeSourceDecoderLevel(
  studentId: string,
  level: number
): Promise<{ level: number; completedAt: Date; alreadyCompleted: boolean }> {
  // Validate range
  if (level < 1 || level > 4 || !Number.isInteger(level)) {
    throw new SourceDecoderError(
      `Level ${level} is not valid. Must be 1–4.`,
      'LEVEL_OUT_OF_RANGE'
    )
  }

  // Check prerequisite (levels 2–4 require previous level)
  if (level > 1) {
    const prerequisite = await prisma.sourceDecoderProgress.findUnique({
      where: { studentId_level: { studentId, level: level - 1 } },
      select: { completedAt: true },
    })
    if (!prerequisite?.completedAt) {
      throw new SourceDecoderError(
        `Level ${level - 1} must be completed before unlocking level ${level}.`,
        'PREREQUISITE_NOT_MET'
      )
    }
  }

  const now = new Date()

  // Upsert — on create set completedAt; on update do NOT reset completedAt (idempotent)
  const existing = await prisma.sourceDecoderProgress.findUnique({
    where: { studentId_level: { studentId, level } },
    select: { completedAt: true },
  })

  if (existing?.completedAt) {
    // Already completed — return original timestamp unchanged
    return { level, completedAt: existing.completedAt, alreadyCompleted: true }
  }

  const record = await prisma.sourceDecoderProgress.upsert({
    where: { studentId_level: { studentId, level } },
    create: { studentId, level, completedAt: now },
    update: { completedAt: now },
    select: { completedAt: true },
  })

  return {
    level,
    completedAt: record.completedAt!,
    alreadyCompleted: false,
  }
}
