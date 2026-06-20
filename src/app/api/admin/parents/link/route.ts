/**
 * POST /api/admin/parents/link — link a parent to a student (created PENDING).
 * Body: { parentId, studentId, relationship }. ADMIN only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { linkParentToStudent, ParentAdminError } from '@/lib/parent-portal'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    parentId?: string
    studentId?: string
    relationship?: string
  }
  if (!body.parentId || !body.studentId) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const result = await linkParentToStudent(
      session.user.userId,
      body.parentId,
      body.studentId,
      body.relationship ?? 'guardian'
    )
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof ParentAdminError) {
      const status = e.code === 'STUDENT_NOT_FOUND' || e.code === 'PARENT_NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
