/**
 * Parent Progress Summary — Share (Phase 14, Audit §36.15 item 4)
 *
 * Records that a teacher shared a student's parent progress summary. There is no
 * external parent recipient yet (true parent login is Phase 18), so "share" =
 * generate + record the event + (client-side) print/Save-as-PDF. The event is a
 * single AuditLog row capturing teacher ID, student ID, timestamp, and the list
 * of fields included (spec §22 audit-log catalog).
 *
 * Authorization is enforced first via assertStudentInTeacherClass.
 */

import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass } from '@/lib/teacher-roster'

export const PARENT_SUMMARY_SHARED = 'PARENT_SUMMARY_SHARED' as const

export interface ShareParentSummaryResult {
  ok: true
  auditLogId: string
}

export async function shareParentSummary(
  teacherUserId: string,
  studentId: string,
  fieldsIncluded: string[]
): Promise<ShareParentSummaryResult> {
  // Authorization first — same roster guard as generation.
  await assertStudentInTeacherClass(teacherUserId, studentId)

  const log = await prisma.auditLog.create({
    data: {
      actorUserId: teacherUserId,
      action: PARENT_SUMMARY_SHARED,
      entityType: 'Student',
      entityId: studentId,
      metadataJson: {
        studentId,
        fieldsIncluded,
        sharedAt: new Date().toISOString(),
      },
    },
    select: { id: true },
  })

  return { ok: true, auditLogId: log.id }
}
