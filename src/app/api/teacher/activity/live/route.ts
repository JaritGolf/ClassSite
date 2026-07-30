/**
 * Live presence for one class — polled by `LivePresencePanel` during class.
 *
 * Roster-scoped: a teacher can only read a class they own (enforced inside
 * `getLivePresence` via assertClassOwnedByTeacher, so the guard cannot be
 * bypassed by a future caller that forgets it).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLivePresence } from '@/lib/activity-sessions'
import { RosterError } from '@/lib/teacher-roster'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const classId = request.nextUrl.searchParams.get('classId')
  if (!classId) {
    return NextResponse.json({ error: 'MISSING_CLASS_ID' }, { status: 400 })
  }

  try {
    const presence = await getLivePresence(session.user.userId, classId)
    return NextResponse.json(presence, {
      // Presence is only meaningful right now — never let it be cached.
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    if (err instanceof RosterError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === 'NOT_FOUND' ? 404 : 403 }
      )
    }
    throw err
  }
}
