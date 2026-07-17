/**
 * GET /api/teacher/classes/[classId]/settings
 * POST /api/teacher/classes/[classId]/settings
 *
 * Teacher-facing per-class Republic Challenge configuration:
 *   - rcSessionLengthOverride (nullable; null = use mode default)
 *   - rcAttemptsAllowed (>= 1)
 *   - rcReviewWindow ('immediate' | 'after_submit' | 'after_class_window')
 *   - rcStaminaOverride (nullable; null = use ladder)
 *   - featureEocReviewEnabled
 *
 * POST writes an AuditLog row with action=RC_CLASS_CONFIG_UPDATED.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertClassOwnedByTeacher, RosterError } from '@/lib/teacher-roster'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { prisma } from '@/lib/db'
import { RC_AUDIT_ACTIONS } from '@/lib/republic-challenge'

const SettingsSchema = z.object({
  rcSessionLengthOverride: z.number().int().min(1).max(100).nullable(),
  rcAttemptsAllowed: z.number().int().min(1).max(10),
  rcReviewWindow: z.enum(['immediate', 'after_submit', 'after_class_window']),
  rcStaminaOverride: z.number().int().min(1).max(100).nullable(),
  featureEocReviewEnabled: z.boolean(),
  strategyUsesRequired: z.number().int().min(0).max(20),
})

export async function GET(
  _req: Request,
  { params }: { params: { classId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertClassOwnedByTeacher(session.user.userId, params.classId)
  } catch (e) {
    if (e instanceof RosterError) {
      return NextResponse.json(
        { error: e.code },
        { status: e.code === 'NOT_FOUND' ? 404 : 403 }
      )
    }
    throw e
  }

  const klass = await prisma.class.findUnique({
    where: { id: params.classId },
    select: {
      id: true,
      name: true,
      rcSessionLengthOverride: true,
      rcAttemptsAllowed: true,
      rcReviewWindow: true,
      rcStaminaOverride: true,
      featureEocReviewEnabled: true,
      strategyUsesRequired: true,
    },
  })

  if (!klass) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json(klass)
}

export async function POST(
  req: Request,
  { params }: { params: { classId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    await assertClassOwnedByTeacher(session.user.userId, params.classId)
  } catch (e) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof RosterError) {
      return NextResponse.json(
        { error: e.code },
        { status: e.code === 'NOT_FOUND' ? 404 : 403 }
      )
    }
    throw e
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const before = await prisma.class.findUnique({
    where: { id: params.classId },
    select: {
      rcSessionLengthOverride: true,
      rcAttemptsAllowed: true,
      rcReviewWindow: true,
      rcStaminaOverride: true,
      featureEocReviewEnabled: true,
      strategyUsesRequired: true,
    },
  })

  await prisma.$transaction([
    prisma.class.update({
      where: { id: params.classId },
      data: parsed.data,
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: session.user.userId,
        action: RC_AUDIT_ACTIONS.RC_CLASS_CONFIG_UPDATED,
        entityType: 'Class',
        entityId: params.classId,
        metadataJson: { before, after: parsed.data },
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
