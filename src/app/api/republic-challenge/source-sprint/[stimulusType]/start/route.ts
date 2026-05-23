/**
 * POST /api/republic-challenge/source-sprint/[stimulusType]/start
 *
 * Creates a Source Sprint session — practice items with a given stimulus type
 * (EXCERPT, CHART, MAP, FLOWCHART, TIMELINE, POLITICAL_CARTOON, DIAGRAM, etc.).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createRepublicChallengeSession } from '@/lib/republic-challenge'
import {
  resolveAuthedStudent,
  republicChallengeErrorResponse,
} from '@/lib/republic-challenge/route-helpers'

const ALLOWED_STIMULUS_TYPES = new Set([
  'EXCERPT',
  'CHART',
  'MAP',
  'TABLE',
  'FLOWCHART',
  'TIMELINE',
  'POLITICAL_CARTOON',
  'DIAGRAM',
  'SCENARIO',
  'IMAGE',
])

interface RouteParams {
  params: { stimulusType: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const stimulusType = params.stimulusType.toUpperCase()
  if (!ALLOWED_STIMULUS_TYPES.has(stimulusType)) {
    return NextResponse.json(
      { error: `Unknown stimulusType: ${params.stimulusType}` },
      { status: 400 }
    )
  }

  const auth = await resolveAuthedStudent()
  if ('error' in auth) return auth.error
  const { studentId, userId, classConfig } = auth.student

  let length: number | undefined
  try {
    const body = (await req.json()) as { length?: number }
    if (typeof body.length === 'number' && body.length > 0 && body.length <= 100) {
      length = Math.floor(body.length)
    }
  } catch {
    /* empty body is fine */
  }

  try {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'SOURCE_SPRINT',
      stimulusType,
      length,
      classConfig,
      actorUserId: userId,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return republicChallengeErrorResponse(err, 'republic-challenge/source-sprint/start')
  }
}
