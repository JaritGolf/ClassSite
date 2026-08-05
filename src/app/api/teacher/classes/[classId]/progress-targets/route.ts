/**
 * GET  /api/teacher/classes/[classId]/progress-targets
 * POST /api/teacher/classes/[classId]/progress-targets
 *
 * Teacher-facing nine-week checkpoint configuration: four end dates and up to
 * four target missions each.
 *
 * Validation is two-stage. Zod below checks SHAPE only; the ordering rules
 * ("targets must advance along the mission map", "the mission must be
 * completable") depend on Benchmark.sequenceOrder and assessment availability, so
 * they live in the domain layer and come back as INVALID_TARGETS with a list of
 * plain-language problems.
 *
 * POST writes an AuditLog row with action=PROGRESS_TARGETS_UPDATED.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import {
  getProgressPlanForClass,
  saveProgressTargets,
  setClassUsesOwnPlan,
  ProgressCheckpointError,
} from '@/lib/progress-checkpoints'

const TargetSchema = z.object({
  level: z.number().int().min(1).max(4),
  benchmarkId: z.string().min(1),
})

const CheckpointSchema = z.object({
  checkpointNumber: z.number().int().min(1).max(4),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date')
    .nullable(),
  targets: z.array(TargetSchema).max(4),
})

const BodySchema = z.object({
  checkpoints: z.array(CheckpointSchema).max(4),
  /** Optional: split this class onto its own plan, or rejoin the shared one. */
  usesOwnPlan: z.boolean().optional(),
})

function errorResponse(e: ProgressCheckpointError) {
  const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 400
  return NextResponse.json({ error: e.code, problems: e.problems }, { status })
}

export async function GET(_req: Request, { params }: { params: { classId: string } }) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    const view = await getProgressPlanForClass(session.user.userId, params.classId)
    return NextResponse.json(view)
  } catch (e) {
    if (e instanceof ProgressCheckpointError) return errorResponse(e)
    throw e
  }
}

export async function POST(req: Request, { params }: { params: { classId: string } }) {
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
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    if (parsed.data.usesOwnPlan !== undefined) {
      await setClassUsesOwnPlan(session.user.userId, params.classId, parsed.data.usesOwnPlan)
    }
    const { planId } = await saveProgressTargets(
      session.user.userId,
      params.classId,
      parsed.data.checkpoints
    )
    return NextResponse.json({ ok: true, planId })
  } catch (e) {
    if (e instanceof ProgressCheckpointError) return errorResponse(e)
    throw e
  }
}
