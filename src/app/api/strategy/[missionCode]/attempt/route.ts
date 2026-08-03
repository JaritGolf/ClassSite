/**
 * POST /api/strategy/[missionCode]/attempt
 *
 * Submit an apply-it round for a Test-Taking Strategy mission. The round is
 * graded server-side; a correct round (all checks right) counts as one "use"
 * of the strategy. Access: STUDENT only.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { submitStrategyRound, StrategyTrackError } from '@/lib/strategy-track'
import { evaluateAndAwardBadges } from '@/lib/badges/award'
import { recordLastActivity } from '@/lib/student-activity'

const BodySchema = z.object({
  answers: z
    .array(
      z.object({
        checkIndex: z.number().int().min(0),
        optionId: z.string().min(1),
      })
    )
    .min(1),
})

interface RouteParams {
  params: { missionCode: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const result = await submitStrategyRound(
      student.id,
      params.missionCode,
      parsed.data.answers
    )

    // Awarding badges is non-fatal — a correct round may complete the track.
    if (result.correct) {
      try {
        await evaluateAndAwardBadges(student.id)
      } catch (e) {
        console.error('[strategy/attempt] badge eval', e instanceof Error ? e.message : e)
      }
    }

    // Dashboard "pick up where you left off" — non-fatal, display-only.
    try {
      await recordLastActivity(student.id, 'STRATEGY_TRACK', params.missionCode)
    } catch (e) {
      console.error('[student-activity]', e instanceof Error ? e.message : e)
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StrategyTrackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    console.error('[strategy/attempt]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
