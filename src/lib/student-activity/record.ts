/**
 * Records the single most recent thing a student did, anywhere in the app,
 * so the dashboard can offer a genuine "pick up where you left off" — one
 * upserted row per student (mirrors src/lib/streak's StreakState shape).
 *
 * Callers must always invoke this non-fatally (try/catch, log-and-continue)
 * — it is bookkeeping for a dashboard convenience widget, never allowed to
 * break a submit/answer/complete flow.
 */

import { prisma } from '@/lib/db'
import type { StudentActivityType } from '@prisma/client'

/**
 * @param occurredAt Overrides the timestamp. Live callers omit it — "now" is
 *   correct for them. Backfills and seeds pass the activity's REAL historical
 *   time, so the dashboard's relative-time caption ("Yesterday", "3 days ago")
 *   stays truthful instead of claiming everything happened just now.
 */
export async function recordLastActivity(
  studentId: string,
  activityType: StudentActivityType,
  referenceId: string | null = null,
  occurredAt: Date = new Date()
): Promise<void> {
  await prisma.studentLastActivity.upsert({
    where: { studentId },
    create: { studentId, activityType, referenceId, occurredAt },
    // occurredAt only defaults on create — stamp it explicitly on update.
    update: { activityType, referenceId, occurredAt },
  })
}
