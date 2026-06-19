/**
 * GET /api/teacher/students/[studentId]/report/export
 *
 * Download a single student's EOC-readiness report as CSV (audit §36.18 item 2).
 * Roster-scoped: the teacher must own a class the student is enrolled in.
 *
 * Access: TEACHER or ADMIN. Recorded in the audit log.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass, RosterError } from '@/lib/teacher-roster'
import { buildStudentReportCsv, csvResponse } from '@/lib/export'

export async function GET(
  _req: Request,
  { params }: { params: { studentId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertStudentInTeacherClass(session.user.userId, params.studentId)

    const report = await buildStudentReportCsv(params.studentId)

    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.userId,
        action: 'REPORT_EXPORTED',
        entityType: 'Student',
        entityId: params.studentId,
        metadataJson: { type: 'student', studentId: params.studentId },
      },
    })

    return csvResponse(report.filename, report.csv)
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'NOT_FOUND' ? 404 : 403
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
