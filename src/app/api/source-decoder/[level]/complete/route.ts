/**
 * POST /api/source-decoder/[level]/complete
 *
 * Mark a Source Decoder level as complete for the authenticated student.
 * Level must be 1–4 and prerequisites must be met (each level unlocks in sequence).
 *
 * Access: STUDENT only.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { completeSourceDecoderLevel, SourceDecoderError } from '@/lib/reading-load'

interface RouteParams {
  params: { level: string }
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json(
      { error: 'Forbidden: students only' },
      { status: 403 }
    )
  }

  const levelNum = parseInt(params.level, 10)
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 4) {
    return NextResponse.json(
      { error: 'Level must be an integer between 1 and 4' },
      { status: 400 }
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json(
      { error: 'Student profile not found' },
      { status: 404 }
    )
  }

  try {
    const result = await completeSourceDecoderLevel(student.id, levelNum)
    return NextResponse.json({
      level: result.level,
      completedAt: result.completedAt.toISOString(),
      alreadyCompleted: result.alreadyCompleted,
    })
  } catch (err) {
    if (err instanceof SourceDecoderError) {
      const statusMap = {
        LEVEL_OUT_OF_RANGE: 400,
        PREREQUISITE_NOT_MET: 422,
      } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[source-decoder/complete]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
