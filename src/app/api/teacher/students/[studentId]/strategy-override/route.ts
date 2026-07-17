/**
 * POST /api/teacher/students/[studentId]/strategy-override
 *
 * Set (or clear) a per-student Test-Taking Strategy requirement override:
 * change the required number of uses for one strategy, or waive it. Roster-
 * scoped (IDOR guard in setStrategyOverride). Writes an audit log.
 * Access: TEACHER / ADMIN, blocked in substitute mode.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { setStrategyOverride, StrategyTrackError } from '@/lib/strategy-track'

const BodySchema = z.object({
  missionCode: z.string().min(1),
  requiredUses: z.number().int().min(0).max(20).nullable(),
  waived: z.boolean(),
})

export async function POST(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
  } catch (e) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    throw e
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
    const result = await setStrategyOverride(
      session.user.userId,
      params.studentId,
      parsed.data.missionCode,
      { requiredUses: parsed.data.requiredUses, waived: parsed.data.waived }
    )
    return NextResponse.json({ ok: true, overrideId: result.overrideId })
  } catch (err) {
    if (err instanceof StrategyTrackError) {
      const status = err.code === 'FORBIDDEN' ? 403 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    console.error('[strategy-override]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
