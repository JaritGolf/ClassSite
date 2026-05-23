/**
 * POST /api/admin/calibration/run
 *
 * Create a new calibration run for the given school year.
 * Body: { schoolYear: string }
 *
 * Returns: CalibrationRunResult
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createCalibrationRun, CalibrationError } from '@/lib/eoc-analytics'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const schoolYear =
    typeof (body as Record<string, unknown>)?.schoolYear === 'string'
      ? ((body as Record<string, unknown>).schoolYear as string)
      : null

  if (!schoolYear) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'schoolYear is required' }, { status: 400 })
  }

  try {
    const result = await createCalibrationRun(session.user.userId, schoolYear)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof CalibrationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 })
    }
    throw err
  }
}
