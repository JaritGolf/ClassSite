/**
 * GET /api/admin/analytics/breakdowns?classId=<id>
 *
 * Returns dimension breakdowns (reading-load, complexity, stimulus type)
 * for a class aggregated across all benchmarks.
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDimensionBreakdownForClass } from '@/lib/eoc-analytics'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')

  if (!classId) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'classId required' }, { status: 400 })
  }

  const breakdown = await getDimensionBreakdownForClass(classId)
  return NextResponse.json(breakdown)
}
