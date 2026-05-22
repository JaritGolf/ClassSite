/**
 * GET /api/teacher/classes
 *
 * Returns the authenticated teacher's full roster (classes + student IDs).
 * Access: TEACHER and ADMIN only.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getTeacherRoster, RosterError } from '@/lib/teacher-roster'

export async function GET() {
  const session = await requireAuth(['TEACHER'])
  try {
    const roster = await getTeacherRoster(session.user.userId)
    return NextResponse.json(roster)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === 'FORBIDDEN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    if (e instanceof RosterError) {
      const status = e.code === 'FORBIDDEN' ? 403 : 404
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
