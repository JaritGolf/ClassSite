/**
 * EOC Score Import Engine
 *
 * Imports actual EOC scaled scores and achievement levels into EocActualScore.
 * Consent gate: rows without consentAcknowledged=true are rejected.
 * Each import (single or batch) writes an AuditLog entry.
 *
 * Privacy note: studentExternalKey (Clever ID / district ID) is stored only in
 * metadataJson for audit purposes; PII is not exposed in URL params or query strings.
 *
 * Spec reference: Section 20.5 (EOC Calibration Feedback Loop)
 * Non-negotiable rule: No auto-apply of calibration weights.
 */

import { prisma } from '@/lib/db'

// ── Error Types ────────────────────────────────────────────────────────────────

export class ScoreImportError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_CONSENT' | 'STUDENT_NOT_FOUND' | 'INVALID_INPUT'
  ) {
    super(message)
    this.name = 'ScoreImportError'
  }
}

// ── Input Types ────────────────────────────────────────────────────────────────

export interface EocScoreImportRow {
  /** Resolved to studentId via Student lookup (by User.cleverId or email). */
  studentExternalKey: string
  /** e.g. "2025-2026" */
  schoolYear: string
  scaledScore?: number
  /** 1..5 */
  achievementLevel?: number
  /** Required true; otherwise reject row with NO_CONSENT. */
  consentAcknowledged: boolean
}

// ── Single Import ──────────────────────────────────────────────────────────────

/**
 * Import a single EOC score row.
 *
 * @param actorUserId - User.id of the admin performing the import
 * @param row - The score row to import
 * @throws ScoreImportError('NO_CONSENT') if consentAcknowledged !== true
 * @throws ScoreImportError('STUDENT_NOT_FOUND') if no student matches the external key
 * @returns { id: EocActualScore.id, auditLogId: AuditLog.id }
 */
export async function importEocScore(
  actorUserId: string,
  row: EocScoreImportRow
): Promise<{ id: string; auditLogId: string }> {
  if (row.consentAcknowledged !== true) {
    throw new ScoreImportError(
      `Cannot import score for ${row.studentExternalKey}: consentAcknowledged is not true`,
      'NO_CONSENT'
    )
  }

  if (!row.studentExternalKey || !row.schoolYear) {
    throw new ScoreImportError(
      'studentExternalKey and schoolYear are required',
      'INVALID_INPUT'
    )
  }

  // Resolve studentId from cleverId or email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { cleverId: row.studentExternalKey },
        { email: row.studentExternalKey },
      ],
      role: 'STUDENT',
    },
    select: { id: true },
  })

  if (!user) {
    throw new ScoreImportError(
      `No student found with external key: ${row.studentExternalKey}`,
      'STUDENT_NOT_FOUND'
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!student) {
    throw new ScoreImportError(
      `User ${row.studentExternalKey} has no Student profile`,
      'STUDENT_NOT_FOUND'
    )
  }

  // $transaction: upsert EocActualScore + AuditLog
  const { scoreId, auditLogId } = await prisma.$transaction(async (tx) => {
    const score = await tx.eocActualScore.upsert({
      where: {
        studentId_schoolYear: {
          studentId: student.id,
          schoolYear: row.schoolYear,
        },
      },
      create: {
        studentId: student.id,
        schoolYear: row.schoolYear,
        scaledScore: row.scaledScore,
        achievementLevel: row.achievementLevel,
        enteredBy: actorUserId,
        consentAcknowledged: true,
      },
      update: {
        scaledScore: row.scaledScore,
        achievementLevel: row.achievementLevel,
        enteredBy: actorUserId,
        consentAcknowledged: true,
      },
      select: { id: true },
    })

    const auditLog = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'EOC_SCORE_IMPORTED',
        entityType: 'EocActualScore',
        entityId: score.id,
        metadataJson: {
          studentExternalKey: row.studentExternalKey,
          schoolYear: row.schoolYear,
          scaledScore: row.scaledScore ?? null,
          achievementLevel: row.achievementLevel ?? null,
        },
      },
      select: { id: true },
    })

    return { scoreId: score.id, auditLogId: auditLog.id }
  })

  return { id: scoreId, auditLogId }
}

// ── Batch Import ───────────────────────────────────────────────────────────────

export interface BatchImportResult {
  imported: number
  skipped: Array<{ row: EocScoreImportRow; reason: string }>
  auditLogId: string
}

/**
 * Bulk import EOC scores. Per-row errors are collected in `skipped` rather
 * than aborting the entire batch. One batch-level AuditLog is written at the
 * end regardless of per-row failures.
 *
 * @param actorUserId - User.id of the admin performing the import
 * @param rows - Array of score rows to import
 * @returns { imported, skipped, auditLogId }
 */
export async function importEocScoresBatch(
  actorUserId: string,
  rows: EocScoreImportRow[]
): Promise<BatchImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ScoreImportError('rows must be a non-empty array', 'INVALID_INPUT')
  }

  const skipped: Array<{ row: EocScoreImportRow; reason: string }> = []
  let imported = 0

  // Process rows sequentially to avoid DB contention
  for (const row of rows) {
    try {
      await importEocScore(actorUserId, row)
      imported++
    } catch (err) {
      const reason = err instanceof ScoreImportError ? err.code : 'UNKNOWN_ERROR'
      skipped.push({ row, reason })
    }
  }

  // Batch-level AuditLog — written regardless of per-row outcomes
  const schoolYear = rows[0]?.schoolYear ?? 'unknown'
  const auditLog = await prisma.auditLog.create({
    data: {
      actorUserId,
      action: 'EOC_SCORE_BATCH_IMPORTED',
      entityType: 'EocActualScore',
      entityId: null,
      metadataJson: {
        count: imported,
        schoolYear,
        skippedCount: skipped.length,
      },
    },
    select: { id: true },
  })

  return { imported, skipped, auditLogId: auditLog.id }
}
