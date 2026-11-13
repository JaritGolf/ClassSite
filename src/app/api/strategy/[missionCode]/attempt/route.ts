/**
 * POST /api/strategy/[missionCode]/attempt
 *
 * Grades one Strategist "apply-it" round and returns the result.
 * Stateless and anonymous: no session is read and nothing is written — the
 * count of uses is kept on the student's device.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { gradeStrategyRound, StrategyTrackError } from '@/lib/strategy-track'

const BodySchema = z.object({
  answers: z
    .array(z.object({ checkIndex: z.number().int().min(0).max(20), optionId: z.string().min(1).max(20) }))
    .max(20),
})

interface RouteParams {
  params: { missionCode: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const result = gradeStrategyRound(params.missionCode, parsed.data.answers)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof StrategyTrackError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 404 })
    }
    console.error('[strategy/attempt]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
