/**
 * GET /api/admin/analytics/trend?classId=<id>&granularity=day&windowDays=90
 *
 * Returns EOC readiness trend for a class.
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getReadinessTrend } from '@/lib/eoc-analytics'
import type { GranularityType } from '@/lib/eoc-analytics'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')

  if (!classId) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'classId required' }, { status: 400 })
  }

  const granularityParam = searchParams.get('granularity') ?? 'week'
  const granularity: GranularityType =
    granularityParam === 'day' || granularityParam === 'week' ? granularityParam : 'week'

  const windowDaysParam = searchParams.get('windowDays')
  const windowDays = windowDaysParam ? parseInt(windowDaysParam, 10) : 90

  const trend = await getReadinessTrend({
    scope: { type: 'class', classId },
    granularity,
    windowDays,
  })

  return NextResponse.json({ trend, granularity, classId })
}
