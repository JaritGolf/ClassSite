/**
 * GET /api/teacher/calibration
 *
 * Returns class calibration trend and overconfidence student list.
 *
 * Access: TEACHER and ADMIN only.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { RosterError } from '@/lib/teacher-roster'
import { getClassCalibrationTrend, getOverconfidenceStudents } from '@/lib/calibration-analytics'

export async function GET() {
  const session = await requireAuth(['TEACHER'])
  try {
    const userId = session.user.userId

    const [trend, overconfidence] = await Promise.all([
      getClassCalibrationTrend(userId),
      getOverconfidenceStudents(userId),
    ])

    return NextResponse.json({ trend, overconfidence })
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'FORBIDDEN' ? 403 : 404
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
