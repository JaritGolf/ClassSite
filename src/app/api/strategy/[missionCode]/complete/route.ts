/**
 * POST /api/strategy/[missionCode]/complete
 *
 * Mark a Test-Taking Strategy mission complete for the authenticated student.
 * Access: STUDENT only.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { completeStrategyMission, StrategyTrackError } from '@/lib/strategy-track'

interface RouteParams {
  params: { missionCode: string }
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
  }

  try {
    const result = await completeStrategyMission(student.id, params.missionCode)
    return NextResponse.json({
      missionCode: result.missionCode,
      completedAt: result.completedAt.toISOString(),
      alreadyCompleted: result.alreadyCompleted,
    })
  } catch (err) {
    if (err instanceof StrategyTrackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    console.error('[strategy/complete]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
