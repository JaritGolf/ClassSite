/**
 * Teacher Override Engine
 *
 * Validates teacher identity, applies an override action to StudentProgress,
 * and writes both a TeacherOverride record and an AuditLog entry.
 *
 * Every override is auditable: the AuditLog entry records the actor, action,
 * reason, and entity IDs. Spec reference: Section 36.5 Audit 4 item 7.
 */

import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass, RosterError } from '@/lib/teacher-roster'
import type { StudentProgressStatus, TeacherOverrideAction } from '@prisma/client'

// ── Error Types ───────────────────────────────────────────────────────────────

export class OverrideError extends Error {
  constructor(
    message: string,
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND'
  ) {
    super(message)
    this.name = 'OverrideError'
  }
}

// ── Result Types ──────────────────────────────────────────────────────────────

export interface TeacherOverrideResult {
  overrideId: string
  auditLogId: string
  newProgressStatus: StudentProgressStatus | null
}

// ── Action → Progress Status mapping ─────────────────────────────────────────

// Actions that change StudentProgress.status
const ACTION_STATUS_MAP: Partial<Record<TeacherOverrideAction, StudentProgressStatus>> = {
  MARK_MASTERED: 'MASTERED',
  MARK_EXPOSURE_COMPLETE: 'EXPOSURE_COMPLETE',
  ASSIGN_REMEDIATION: 'NEEDS_REMEDIATION',
}

// Actions that upsert a NOT_STARTED row (unlock)
const UNLOCK_ACTIONS = new Set<TeacherOverrideAction>(['UNLOCK_BENCHMARK'])

// ── Main Function ─────────────────────────────────────────────────────────────

/**
 * Apply a teacher override to a student's benchmark progress.
 *
 * @param teacherUserId - The User.id of the acting teacher (from session)
 * @param studentId     - The Student.id of the target student
 * @param benchmarkId   - The Benchmark.id of the target benchmark
 * @param action        - The override action to apply
 * @param reason        - Required human-readable justification (stored in audit log)
 * @throws OverrideError FORBIDDEN if teacherUserId does not resolve to a Teacher
 * @throws OverrideError NOT_FOUND if the StudentProgress row doesn't exist (for update actions)
 */
export async function applyTeacherOverride(
  teacherUserId: string,
  studentId: string,
  benchmarkId: string,
  action: TeacherOverrideAction,
  reason: string
): Promise<TeacherOverrideResult> {
  // 1. Resolve the Teacher profile from the User ID
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
    select: { id: true },
  })

  if (!teacher) {
    throw new OverrideError(
      `User ${teacherUserId} does not have a teacher profile`,
      'FORBIDDEN'
    )
  }

  // 1b. Roster scope: a teacher may only override a student in one of their
  // own classes. Without this, any teacher could mutate any student's progress
  // in the district by passing an arbitrary studentId (IDOR).
  try {
    await assertStudentInTeacherClass(teacherUserId, studentId)
  } catch (err) {
    if (err instanceof RosterError) {
      throw new OverrideError(
        `Student ${studentId} is not in any of this teacher's classes`,
        'FORBIDDEN'
      )
    }
    throw err
  }

  // 2. Apply the override effect on StudentProgress
  let newProgressStatus: StudentProgressStatus | null = null

  if (UNLOCK_ACTIONS.has(action)) {
    // UNLOCK_BENCHMARK — upsert a NOT_STARTED row (idempotent)
    await prisma.studentProgress.upsert({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      create: { studentId, benchmarkId, status: 'NOT_STARTED' },
      update: {}, // already exists — leave current status; just record the override
    })
    newProgressStatus = 'NOT_STARTED'
  } else if (ACTION_STATUS_MAP[action]) {
    // Actions that update an existing StudentProgress row
    const targetStatus = ACTION_STATUS_MAP[action]!

    const existing = await prisma.studentProgress.findUnique({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      select: { id: true },
    })

    if (!existing) {
      throw new OverrideError(
        `No StudentProgress row found for student ${studentId} and benchmark ${benchmarkId}`,
        'NOT_FOUND'
      )
    }

    const updateData: {
      status: StudentProgressStatus
      masteredAt?: Date
      offRampTriggeredAt?: Date
    } = { status: targetStatus }

    if (targetStatus === 'MASTERED') {
      updateData.masteredAt = new Date()
    } else if (targetStatus === 'EXPOSURE_COMPLETE') {
      updateData.offRampTriggeredAt = new Date()
    }

    await prisma.studentProgress.update({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      data: updateData,
    })

    newProgressStatus = targetStatus
  }
  // For EXTEND_DEADLINE and CUSTOM — no StudentProgress change

  // 3. Write TeacherOverride + AuditLog atomically in a single $transaction
  const { overrideId, auditLogId } = await prisma.$transaction(async (tx) => {
    const override = await tx.teacherOverride.create({
      data: {
        teacherId: teacher.id,
        studentId,
        benchmarkId,
        action,
        reason,
      },
      select: { id: true },
    })

    const auditLog = await tx.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: `TEACHER_OVERRIDE_${action}`,
        entityType: 'TeacherOverride',
        entityId: override.id,
        metadataJson: {
          action,
          studentId,
          benchmarkId,
          reason,
          teacherId: teacher.id,
        },
      },
      select: { id: true },
    })

    return { overrideId: override.id, auditLogId: auditLog.id }
  })

  return {
    overrideId,
    auditLogId,
    newProgressStatus,
  }
}
