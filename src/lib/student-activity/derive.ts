/**
 * Derives a student's most recent activity from existing history.
 *
 * `StudentLastActivity` is written only by the seven `recordLastActivity` hooks,
 * and all of them live in API route handlers. Anything that reaches the engine
 * layer directly — the demo seeder (seed/demo/engine-helpers.ts →
 * `gradeAndSubmit`), tests, admin tooling — produces attempts and progress but
 * no activity row, so the dashboard's "pick up where you left off" card silently
 * never renders. Its migration has no backfill either.
 *
 * This reconstructs the row from what history already records. Used by the
 * backfill CLI (scripts/backfill-last-activity.ts) and by the demo seeder, so
 * the two cannot drift.
 *
 * It reads all five timestamped sources and returns the true maximum rather than
 * assuming the last thing a student did was an assessment — someone whose latest
 * action was a daily drill should see the drill.
 *
 * Read-only: this derives, it does not write. Pass the result to
 * `recordLastActivity(studentId, type, referenceId, occurredAt)`.
 */

import { prisma } from '@/lib/db'
import { StudentActivityType } from '@prisma/client'

export interface DerivedActivity {
  activityType: StudentActivityType
  /**
   * Never null. `getLastActivityForStudent` bails on a missing referenceId, so a
   * candidate without one would render nothing — identical to no backfill.
   */
  referenceId: string
  occurredAt: Date
  /** Human-readable, for CLI/seed output. Not persisted. */
  describe: string
}

async function candidatesFor(studentId: string): Promise<DerivedActivity[]> {
  const out: DerivedActivity[] = []

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { studentId, voided: false, submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' },
    select: { assessmentId: true, submittedAt: true, assessment: { select: { title: true } } },
  })
  if (attempt?.submittedAt) {
    out.push({
      activityType: StudentActivityType.ASSESSMENT,
      referenceId: attempt.assessmentId,
      occurredAt: attempt.submittedAt,
      describe: `ASSESSMENT "${attempt.assessment?.title ?? attempt.assessmentId}"`,
    })
  }

  const drill = await prisma.spacedReviewEvent.findFirst({
    where: { studentId },
    orderBy: { occurredAt: 'desc' },
    select: { benchmarkId: true, occurredAt: true, benchmark: { select: { code: true } } },
  })
  if (drill) {
    out.push({
      activityType: StudentActivityType.DAILY_DRILL,
      referenceId: drill.benchmarkId,
      occurredAt: drill.occurredAt,
      describe: `DAILY_DRILL ${drill.benchmark?.code ?? drill.benchmarkId}`,
    })
  }

  const remediation = await prisma.studentRemediation.findFirst({
    where: { studentId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    select: { id: true, completedAt: true },
  })
  if (remediation?.completedAt) {
    out.push({
      activityType: StudentActivityType.REMEDIATION,
      referenceId: remediation.id,
      occurredAt: remediation.completedAt,
      describe: `REMEDIATION ${remediation.id}`,
    })
  }

  const strategy = await prisma.strategyTrackProgress.findFirst({
    where: { studentId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    select: { missionCode: true, completedAt: true },
  })
  if (strategy?.completedAt) {
    out.push({
      activityType: StudentActivityType.STRATEGY_TRACK,
      referenceId: strategy.missionCode,
      occurredAt: strategy.completedAt,
      describe: `STRATEGY_TRACK ${strategy.missionCode}`,
    })
  }

  const decoder = await prisma.sourceDecoderProgress.findFirst({
    where: { studentId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    select: { level: true, completedAt: true },
  })
  if (decoder?.completedAt) {
    out.push({
      activityType: StudentActivityType.SOURCE_DECODER,
      referenceId: String(decoder.level),
      occurredAt: decoder.completedAt,
      describe: `SOURCE_DECODER level ${decoder.level}`,
    })
  }

  return out
}

/**
 * The single most recent activity across all sources, or null when the student
 * has no history at all (a brand-new student — correct to leave with no card).
 */
export async function deriveLastActivityFromHistory(
  studentId: string
): Promise<DerivedActivity | null> {
  const candidates = await candidatesFor(studentId)
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.occurredAt > a.occurredAt ? b : a))
}

/** All candidates, newest first. For CLI output that explains what it picked. */
export async function deriveActivityCandidates(studentId: string): Promise<DerivedActivity[]> {
  const candidates = await candidatesFor(studentId)
  return candidates.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
}
