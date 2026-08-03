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

export async function recordLastActivity(
  studentId: string,
  activityType: StudentActivityType,
  referenceId: string | null = null
): Promise<void> {
  await prisma.studentLastActivity.upsert({
    where: { studentId },
    create: { studentId, activityType, referenceId },
    // occurredAt only defaults on create — stamp it explicitly on update.
    update: { activityType, referenceId, occurredAt: new Date() },
  })
}
