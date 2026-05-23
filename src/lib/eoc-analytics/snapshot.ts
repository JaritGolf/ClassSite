/**
 * EOC Readiness Snapshot Writers
 *
 * Lazy, on-demand snapshot writers. Called from updateProgressAfterAttempt
 * (non-fatal). Idempotent per (studentId, reportingCategoryId, calendar day).
 *
 * NOTE: Snapshots are operational data, not auditable user actions.
 * Do NOT write AuditLog rows here.
 *
 * Spec reference: Section 20.3 (Snapshot Strategy)
 */

import { prisma } from '@/lib/db'
import { computeStudentReadiness, computeClassReadiness } from './readiness'

// ── Date Helpers ───────────────────────────────────────────────────────────────

/**
 * Return the start of the UTC day containing the given date.
 * e.g. 2026-05-22T14:30:00Z → 2026-05-22T00:00:00.000Z
 */
export function startOfUtcDay(d: Date): Date {
  const result = new Date(d)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

// ── Student Snapshot ───────────────────────────────────────────────────────────

/**
 * Lazy writer. Idempotent per (studentId, reportingCategoryId, calendar day).
 * Called from updateProgressAfterAttempt (non-fatal — wrap call site in .catch).
 *
 * Race-safe: duplicate creates are silently swallowed.
 */
export async function recordReadinessSnapshot(studentId: string): Promise<void> {
  const readiness = await computeStudentReadiness(studentId)
  const today = startOfUtcDay(new Date())

  await Promise.all(
    readiness.byCategory.map((rc) =>
      prisma.eocReadinessSnapshot
        .create({
          data: {
            studentId,
            reportingCategoryId: rc.reportingCategoryId,
            readinessScore: rc.readinessPercent / 100,
            readinessLow: rc.readinessLow / 100,
            readinessHigh: rc.readinessHigh / 100,
            createdAt: today,
          },
        })
        .catch(() => {
          /* race-safe: dup ok */
        })
    )
  )
}

// ── Class Snapshot ─────────────────────────────────────────────────────────────

/**
 * Class-level snapshot. Idempotent per (classId, reportingCategoryId, calendar day).
 * Called lazily by getReadinessTrend at first read each day.
 *
 * Race-safe: duplicate creates are silently swallowed.
 */
export async function recordClassReadinessSnapshot(classId: string): Promise<void> {
  const readiness = await computeClassReadiness(classId)
  const today = startOfUtcDay(new Date())

  await Promise.all(
    readiness.byCategory.map((rc) =>
      prisma.classReadinessSnapshot
        .create({
          data: {
            classId,
            reportingCategoryId: rc.reportingCategoryId,
            readinessScore: rc.readinessPercent / 100,
            createdAt: today,
          },
        })
        .catch(() => {
          /* race-safe: dup ok */
        })
    )
  )
}

/**
 * Ensures the class has a snapshot row for today before returning the trend.
 * No-op if today's snapshot already exists.
 */
export async function getOrCreateDailyClassSnapshot(classId: string, day?: Date): Promise<void> {
  const targetDay = startOfUtcDay(day ?? new Date())
  const nextDay = new Date(targetDay.getTime() + 24 * 60 * 60 * 1000)

  const existing = await prisma.classReadinessSnapshot.findFirst({
    where: {
      classId,
      createdAt: { gte: targetDay, lt: nextDay },
    },
    select: { id: true },
  })

  if (!existing) {
    await recordClassReadinessSnapshot(classId)
  }
}
