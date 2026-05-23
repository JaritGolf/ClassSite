/**
 * GET /api/admin/calibration?schoolYear=<>
 *
 * Get calibration status for a given school year.
 * Returns { status, latestRun, scoreCount }.
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCalibrationStatus } from '@/lib/eoc-analytics'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const schoolYear = searchParams.get('schoolYear')

  if (!schoolYear) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'schoolYear is required' }, { status: 400 })
  }

  const status = await getCalibrationStatus(schoolYear)
  return NextResponse.json(status)
}
