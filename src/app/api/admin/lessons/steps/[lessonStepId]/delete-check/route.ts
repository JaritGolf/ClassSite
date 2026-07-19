/**
 * GET /api/admin/lessons/steps/[lessonStepId]/delete-check
 *
 * Pre-delete warning count: how many students currently have their resume
 * pointer on this step, so the admin's confirm dialog can name an accurate
 * affected count BEFORE the destructive delete fires.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { countAffectedStudentProgress } from '@/lib/lesson-editor'

export async function GET(
  _req: Request,
  { params }: { params: { lessonStepId: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const studentProgressCount = await countAffectedStudentProgress(params.lessonStepId)
  return NextResponse.json({ studentProgressCount })
}
