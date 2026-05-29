/**
 * Test-Taking Strategy Track (spec §19.2).
 *
 * A short side-track of 7 EOC strategy missions, not tied to any benchmark.
 * Mission definitions are hardcoded (instructional scaffolding); progress is
 * stored in StrategyTrackProgress. Strongly suggested but not required for
 * mastery progression, so missions are independent (no prerequisite chain).
 */

import { prisma } from '@/lib/db'

export interface StrategyMission {
  code: string
  title: string
  objective: string
  instructions: string
  tip: string
}

export interface StrategyProgressRecord {
  code: string
  completedAt: Date | null
  isCompleted: boolean
}

const MISSIONS: StrategyMission[] = [
  {
    code: 'eliminate-distractor',
    title: 'Eliminate the Distractor',
    objective: 'Practice crossing out answers you know are wrong.',
    instructions: 'For each item, find the choice that is clearly wrong and eliminate it first.',
    tip: 'Getting rid of even one wrong answer raises your odds on every question.',
  },
  {
    code: 'evidence-based',
    title: 'Evidence-Based Answers',
    objective: 'Point to the part of the stimulus that supports your choice.',
    instructions: 'Before picking an answer, underline the sentence in the source that proves it.',
    tip: 'If you cannot find evidence, the answer is probably a distractor.',
  },
  {
    code: 'watch-the-words',
    title: 'Watch the Words',
    objective: 'Spot stem keywords like BEST, EXCEPT, and MOST LIKELY.',
    instructions: 'Circle the keyword in the question stem and let it guide your choice.',
    tip: '"EXCEPT" flips the question — you are looking for the one that does NOT fit.',
  },
  {
    code: 'flag-and-return',
    title: 'Flag and Return',
    objective: 'Practice the discipline of flagging hard items and coming back.',
    instructions: 'If an item takes too long, flag it, move on, and return after the easy ones.',
    tip: 'Do not let one hard question eat the time you need for five easy ones.',
  },
  {
    code: 'time-management',
    title: 'Time Management',
    objective: 'Practice steady pacing — not rushing, not stalling.',
    instructions: 'Aim for a steady rhythm; check the clock at the halfway mark.',
    tip: 'Most missed questions come from rushing the end, not from thinking too long.',
  },
  {
    code: 'two-pass',
    title: 'Two-Pass Strategy',
    objective: 'Do the easy items first, then the harder ones.',
    instructions: 'First pass: answer everything you know quickly. Second pass: tackle the rest.',
    tip: 'Banking the easy points first protects your score if time runs short.',
  },
  {
    code: 'misconception-spotter',
    title: 'Misconception Spotter',
    objective: 'Identify why a wrong answer is tempting.',
    instructions: 'Given a wrong choice, explain the misconception that makes it look right.',
    tip: 'Naming the trap makes you less likely to fall for it on the real EOC.',
  },
]

export function getStrategyMissions(): StrategyMission[] {
  return MISSIONS
}

export function getStrategyMission(code: string): StrategyMission | null {
  return MISSIONS.find((m) => m.code === code) ?? null
}

export class StrategyTrackError extends Error {
  constructor(message: string, public readonly code: 'UNKNOWN_MISSION') {
    super(message)
    this.name = 'StrategyTrackError'
  }
}

export async function getStrategyProgress(studentId: string): Promise<{
  progress: StrategyProgressRecord[]
  completedCount: number
}> {
  const rows = await prisma.strategyTrackProgress.findMany({
    where: { studentId },
    select: { missionCode: true, completedAt: true },
  })
  const byCode = new Map(rows.map((r) => [r.missionCode, r.completedAt]))

  const progress = MISSIONS.map((m) => {
    const completedAt = byCode.get(m.code) ?? null
    return { code: m.code, completedAt, isCompleted: completedAt !== null }
  })

  return { progress, completedCount: progress.filter((p) => p.isCompleted).length }
}

/** Mark a strategy mission complete. Idempotent — keeps the original timestamp. */
export async function completeStrategyMission(
  studentId: string,
  missionCode: string
): Promise<{ missionCode: string; completedAt: Date; alreadyCompleted: boolean }> {
  if (!getStrategyMission(missionCode)) {
    throw new StrategyTrackError(`Unknown strategy mission: ${missionCode}`, 'UNKNOWN_MISSION')
  }

  const existing = await prisma.strategyTrackProgress.findUnique({
    where: { studentId_missionCode: { studentId, missionCode } },
    select: { completedAt: true },
  })
  if (existing?.completedAt) {
    return { missionCode, completedAt: existing.completedAt, alreadyCompleted: true }
  }

  const now = new Date()
  const record = await prisma.strategyTrackProgress.upsert({
    where: { studentId_missionCode: { studentId, missionCode } },
    create: { studentId, missionCode, completedAt: now },
    update: { completedAt: now },
    select: { completedAt: true },
  })

  return { missionCode, completedAt: record.completedAt!, alreadyCompleted: false }
}
