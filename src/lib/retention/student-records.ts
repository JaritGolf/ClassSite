/**
 * Student-record deletion — Fla. Stat. § 1006.1494(3)(c)
 *
 * The app is an "operator" under § 1006.1494(1)(e): an online service "used
 * primarily for K-12 school purposes." Operators carry duties directly, not
 * merely through the district's contract. This module implements the one duty
 * that requires machinery rather than posture:
 *
 *   "Unless a parent or guardian expressly consents to the operator retaining a
 *    student's covered information, delete the covered information at the
 *    conclusion of the course or corresponding program and no later than 90 days
 *    after a student is no longer enrolled in a school within the district, upon
 *    notice by the school district."
 *
 * ── WHY THIS IS NOT A TIMER ─────────────────────────────────────────────────
 * The statutory trigger is "upon notice by the school district." Software cannot
 * observe that notice. So the flow is:
 *
 *   district notifies  →  admin calls markStudentDisenrolled()  →  clock starts
 *   →  purge deletes on or before day 90
 *
 * `Student.deactivatedAt` is the recorded notice. Until it is set, no clock runs
 * and the student is never in scope. That makes this safe to ship enabled: it
 * cannot delete anyone until a human records a disenrollment.
 *
 * ── WHY EVERY DELETE IS EXPLICIT ────────────────────────────────────────────
 * None of Student's ~21 child relations declare `onDelete: Cascade` — Prisma
 * defaults required relations to Restrict. Deleting a Student with any child row
 * present therefore fails with a foreign-key error rather than cascading. The
 * ordered deletes below are not defensive style; they are the only thing that
 * works, and CHILD_DELETION_ORDER must be extended whenever a new table gains a
 * `studentId`. `tests/integration/retention-student-records.test.ts` fails loudly
 * if it is not.
 *
 * Audit logs are deliberately NOT deleted here. `AuditLog.actor` is an optional
 * relation, so deleting the User nulls the actor reference and leaves the trail
 * intact. What remains is an action name and a bare cuid in `entityId` that no
 * longer resolves to any person — the compliance record survives, the identity
 * does not. Audit rows age out separately under AUDIT_LOG_RETENTION_DAYS.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { cutoffDate, resolveRetentionConfig, type RetentionConfig } from './policy'

export interface StudentPurgeCandidate {
  studentId: string
  userId: string
  deactivatedAt: Date
}

export interface StudentPurgeResult {
  dryRun: boolean
  /** Students whose retention window has elapsed. */
  studentsEligible: number
  /** Students actually deleted (0 on a dry run). */
  studentsDeleted: number
  /** Per-table row counts removed, for the audit record. */
  rowsDeleted: Record<string, number>
  cutoff: Date | null
}

/**
 * Every table holding a `studentId`, in an order safe for foreign keys.
 *
 * Attempt children come first because AssessmentAttempt is itself a parent.
 * The rest are leaves and their relative order does not matter — they are
 * grouped by area only to keep this readable against schema.prisma.
 */
const CHILD_DELETION_ORDER = [
  // AssessmentAttempt children (must precede assessmentAttempt)
  'attemptResponse',
  'adaptiveSessionState',
  'attemptIntegrityEvent',
  'assessmentAttempt',
  // Progress and mastery
  'studentProgress',
  'studentLastActivity',
  'studentRemediation',
  'studentCheckpointLevel',
  // Spaced retrieval
  'spacedReviewState',
  'spacedReviewEvent',
  // Metacognition and analytics
  'confidenceCalibrationSnapshot',
  'eocReadinessSnapshot',
  'eocActualScore',
  // Parallel tracks
  'sourceDecoderProgress',
  'strategyTrackProgress',
  'studentStrategyOverride',
  // Engagement
  'studentBadge',
  'streakState',
  'narrativeProgress',
  'studentActivitySession',
  'studentUiSettings',
  // Accommodations and staff actions
  'studentAccommodation',
  'teacherOverride',
  // Relationships
  'parentStudentLink',
  'classEnrollment',
] as const

/**
 * Record that the district has notified us a student is no longer enrolled.
 * This is what starts the § 1006.1494(3)(c) clock.
 *
 * Idempotent: calling it again on an already-disenrolled student leaves the
 * original timestamp alone, so the deadline cannot be pushed back by repeating
 * the call.
 */
export async function markStudentDisenrolled(
  studentId: string,
  actorUserId: string | null,
  now: Date = new Date()
): Promise<{ studentId: string; deactivatedAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.student.findUnique({
      where: { id: studentId },
      select: { id: true, deactivatedAt: true },
    })
    if (!existing) throw new Error(`Student not found: ${studentId}`)

    if (existing.deactivatedAt) {
      return { studentId, deactivatedAt: existing.deactivatedAt }
    }

    const updated = await tx.student.update({
      where: { id: studentId },
      data: { active: false, deactivatedAt: now },
      select: { deactivatedAt: true },
    })

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'STUDENT_DISENROLLED',
        entityType: 'Student',
        entityId: studentId,
        metadataJson: {
          deactivatedAt: now.toISOString(),
          note: 'Starts the Fla. Stat. 1006.1494(3)(c) deletion clock.',
        } as unknown as Prisma.InputJsonObject,
      },
    })

    return { studentId, deactivatedAt: updated.deactivatedAt as Date }
  })
}

/** Students whose disenrollment clock has run out. */
export async function findPurgeableStudents(
  config: RetentionConfig,
  now: Date = new Date()
): Promise<{ candidates: StudentPurgeCandidate[]; cutoff: Date | null }> {
  const cutoff = cutoffDate(config.studentRecordRetentionDays, now)
  if (!cutoff) return { candidates: [], cutoff: null }

  const rows = await prisma.student.findMany({
    where: { deactivatedAt: { not: null, lt: cutoff } },
    select: { id: true, userId: true, deactivatedAt: true },
  })

  return {
    candidates: rows.map((r) => ({
      studentId: r.id,
      userId: r.userId,
      deactivatedAt: r.deactivatedAt as Date,
    })),
    cutoff,
  }
}

/**
 * Delete every record belonging to the given students, then the students and
 * their user rows.
 *
 * Runs in one transaction per student rather than one for all of them: a single
 * malformed row should not block an entire cohort's deletion, and partial
 * progress across students is safe (each is independently complete).
 */
export async function purgeStudentRecords(
  candidates: StudentPurgeCandidate[],
  opts: { dryRun?: boolean; actorUserId?: string | null } = {}
): Promise<Record<string, number>> {
  const dryRun = opts.dryRun ?? true
  const rowsDeleted: Record<string, number> = {}
  const bump = (k: string, n: number) => {
    if (n > 0) rowsDeleted[k] = (rowsDeleted[k] ?? 0) + n
  }

  for (const c of candidates) {
    const where = { studentId: c.studentId }

    if (dryRun) {
      for (const model of CHILD_DELETION_ORDER) {
        // Attempt children key off attemptId, not studentId — count via the parent.
        const n =
          model === 'attemptResponse' ||
          model === 'adaptiveSessionState' ||
          model === 'attemptIntegrityEvent'
            ? await (prisma[model] as any).count({
                where: { attempt: { studentId: c.studentId } },
              })
            : await (prisma[model] as any).count({ where })
        bump(model, n)
      }
      bump(
        'suggestion',
        await prisma.suggestion.count({ where: { authorStudentId: c.studentId } })
      )
      bump('student', 1)
      bump('user', 1)
      continue
    }

    await prisma.$transaction(async (tx) => {
      for (const model of CHILD_DELETION_ORDER) {
        const res =
          model === 'attemptResponse' ||
          model === 'adaptiveSessionState' ||
          model === 'attemptIntegrityEvent'
            ? await (tx[model] as any).deleteMany({
                where: { attempt: { studentId: c.studentId } },
              })
            : await (tx[model] as any).deleteMany({ where })
        bump(model, res.count)
      }

      // The student's own prose. Deleted rather than orphaned: the relation is
      // optional, so leaving it would SetNull and keep text a student wrote.
      const sug = await tx.suggestion.deleteMany({
        where: { authorStudentId: c.studentId },
      })
      bump('suggestion', sug.count)

      await tx.student.delete({ where: { id: c.studentId } })
      bump('student', 1)

      // Cascades to any remaining Suggestion authored by this user.
      await tx.user.delete({ where: { id: c.userId } })
      bump('user', 1)
    })
  }

  return rowsDeleted
}

/**
 * Find and (optionally) delete records for students past their retention window.
 * Dry run by default, matching purgeExpiredData.
 */
export async function purgeDisenrolledStudents(
  opts: {
    dryRun?: boolean
    actorUserId?: string | null
    config?: RetentionConfig
    now?: Date
  } = {}
): Promise<StudentPurgeResult> {
  const dryRun = opts.dryRun ?? true
  const now = opts.now ?? new Date()
  const config = opts.config ?? resolveRetentionConfig()

  const { candidates, cutoff } = await findPurgeableStudents(config, now)

  const rowsDeleted = await purgeStudentRecords(candidates, {
    dryRun,
    actorUserId: opts.actorUserId ?? null,
  })

  if (!dryRun && candidates.length > 0) {
    await prisma.auditLog.create({
      data: {
        actorUserId: opts.actorUserId ?? null,
        action: 'STUDENT_RECORDS_PURGED',
        entityType: 'System',
        entityId: null,
        metadataJson: {
          // Statutory basis, retained deliberately: this row is the evidence the
          // duty was discharged. Student ids are NOT recorded — writing them here
          // would re-create the identifier the purge just removed.
          basis: 'Fla. Stat. 1006.1494(3)(c)',
          studentsDeleted: candidates.length,
          retentionDays: config.studentRecordRetentionDays,
          cutoff: cutoff?.toISOString() ?? null,
          rowsDeleted,
        } as unknown as Prisma.InputJsonObject,
      },
    })
  }

  return {
    dryRun,
    studentsEligible: candidates.length,
    studentsDeleted: dryRun ? 0 : candidates.length,
    rowsDeleted,
    cutoff,
  }
}
