/**
 * Data Retention — purge runner (Phase 17, audit §36.18 item 8)
 *
 * Deletes only rows that have aged past the configured retention thresholds.
 * Defaults retain everything; nothing is removed unless an admin set a positive
 * threshold (see policy.ts) and runs this with dryRun=false.
 *
 * Scheduling (cron/queue) is intentionally NOT built here — see spec §26 (the
 * background queue is optional) and docs/audits/deferred/phase-17.md. This is a
 * callable function exposed via an admin route and an `npm run` script.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { resolveRetentionConfig, cutoffDate, type RetentionConfig } from './policy'

export interface PurgeOptions {
  /** When true (default), count eligible rows but delete nothing. */
  dryRun?: boolean
  /** User.id to attribute the audit-log entry to (omit for system/script runs). */
  actorUserId?: string | null
  /** Override the resolved env config (used by tests). */
  config?: RetentionConfig
  /** Override "now" (used by tests). */
  now?: Date
}

export interface PurgeResult {
  dryRun: boolean
  auditLogsDeleted: number
  voidedAttemptsDeleted: number
  attemptResponsesDeleted: number
  config: RetentionConfig
}

/**
 * Purge expired audit logs and aged voided assessment attempts.
 * Returns the counts that were (or would be) deleted.
 */
export async function purgeExpiredData(opts: PurgeOptions = {}): Promise<PurgeResult> {
  const dryRun = opts.dryRun ?? true
  const now = opts.now ?? new Date()
  const config = opts.config ?? resolveRetentionConfig()

  const auditCutoff = cutoffDate(config.auditLogRetentionDays, now)
  const voidedCutoff = cutoffDate(config.voidedAttemptRetentionDays, now)

  // ── Identify eligible rows ──────────────────────────────────────────────────
  const auditWhere = auditCutoff ? { createdAt: { lt: auditCutoff } } : null

  const eligibleAttemptIds: string[] = voidedCutoff
    ? (
        await prisma.assessmentAttempt.findMany({
          where: { voided: true, submittedAt: { lt: voidedCutoff } },
          select: { id: true },
        })
      ).map((a) => a.id)
    : []

  const auditLogsEligible = auditWhere
    ? await prisma.auditLog.count({ where: auditWhere })
    : 0

  const responsesEligible =
    eligibleAttemptIds.length > 0
      ? await prisma.attemptResponse.count({
          where: { attemptId: { in: eligibleAttemptIds } },
        })
      : 0

  if (dryRun) {
    return {
      dryRun: true,
      auditLogsDeleted: auditLogsEligible,
      voidedAttemptsDeleted: eligibleAttemptIds.length,
      attemptResponsesDeleted: responsesEligible,
      config,
    }
  }

  // ── Delete (children first to respect FK constraints) ───────────────────────
  const result = await prisma.$transaction(async (tx) => {
    let auditLogsDeleted = 0
    let attemptResponsesDeleted = 0
    let voidedAttemptsDeleted = 0

    if (eligibleAttemptIds.length > 0) {
      const resp = await tx.attemptResponse.deleteMany({
        where: { attemptId: { in: eligibleAttemptIds } },
      })
      attemptResponsesDeleted = resp.count

      await tx.adaptiveSessionState.deleteMany({
        where: { attemptId: { in: eligibleAttemptIds } },
      })

      const att = await tx.assessmentAttempt.deleteMany({
        where: { id: { in: eligibleAttemptIds } },
      })
      voidedAttemptsDeleted = att.count
    }

    if (auditWhere) {
      const logs = await tx.auditLog.deleteMany({ where: auditWhere })
      auditLogsDeleted = logs.count
    }

    return { auditLogsDeleted, attemptResponsesDeleted, voidedAttemptsDeleted }
  })

  // Record the purge itself (written AFTER the audit-log deletion above so it
  // is never swept by its own run).
  await prisma.auditLog.create({
    data: {
      actorUserId: opts.actorUserId ?? null,
      action: 'RETENTION_PURGE',
      entityType: 'System',
      entityId: null,
      metadataJson: { ...result, config } as unknown as Prisma.InputJsonObject,
    },
  })

  return {
    dryRun: false,
    ...result,
    config,
  }
}
