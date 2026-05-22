/**
 * GET /api/teacher/decay
 *
 * Returns class-level decay rates per benchmark for the authenticated teacher.
 * Uses the existing getClassDecayRates function which includes spikeAlert flags.
 *
 * Access: TEACHER and ADMIN only.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { RosterError, resolveTeacherId } from '@/lib/teacher-roster'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'

export async function GET() {
  const session = await requireAuth(['TEACHER'])
  try {
    const teacherId = await resolveTeacherId(session.user.userId)
    const decayRates = await getClassDecayRates(teacherId)
    return NextResponse.json(decayRates)
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'FORBIDDEN' ? 403 : 404
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
