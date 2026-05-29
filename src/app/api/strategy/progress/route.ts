/**
 * GET /api/strategy/progress
 *
 * Returns the student's Test-Taking Strategy track progress + mission defs.
 * Access: STUDENT only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStrategyProgress, getStrategyMissions } from '@/lib/strategy-track'

export async function GET() {
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

  const [{ progress, completedCount }, missions] = await Promise.all([
    getStrategyProgress(student.id),
    Promise.resolve(getStrategyMissions()),
  ])

  return NextResponse.json({ progress, completedCount, missions })
}
