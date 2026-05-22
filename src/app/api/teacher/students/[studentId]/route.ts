/**
 * GET /api/teacher/students/[studentId]
 *
 * Returns the StudentProfileVM for a student in the teacher's roster.
 * Returns 403 if the student is not in the teacher's classes.
 * Access: TEACHER and ADMIN only.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getStudentProfileForTeacher } from '@/lib/student-profile'
import { RosterError } from '@/lib/teacher-roster'

export async function GET(
  _req: Request,
  { params }: { params: { studentId: string } }
) {
  const session = await requireAuth(['TEACHER'])
  try {
    const vm = await getStudentProfileForTeacher(
      session.user.userId,
      params.studentId
    )
    return NextResponse.json(vm)
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'FORBIDDEN' ? 403 : 404
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
