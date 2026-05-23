/**
 * POST /api/admin/calibration/[runId]/approve
 *
 * Approve a pending calibration run.
 * Body: { reason: string }
 *
 * Returns: { auditLogId }
 *
 * Access: ADMIN only.
 *
 * IMPORTANT: This does NOT auto-apply the recommended weights in code.
 * See calibration-approve.ts for full explanation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { approveCalibrationRun, ApprovalError } from '@/lib/eoc-analytics'

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { runId } = params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const reason =
    typeof (body as Record<string, unknown>)?.reason === 'string'
      ? ((body as Record<string, unknown>).reason as string).trim()
      : ''

  if (!reason) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'reason is required' }, { status: 400 })
  }

  try {
    const result = await approveCalibrationRun(session.user.userId, runId, reason)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ApprovalError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 409
      return NextResponse.json({ error: err.code, message: err.message }, { status })
    }
    throw err
  }
}
