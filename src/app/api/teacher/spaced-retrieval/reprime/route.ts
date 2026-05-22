/**
 * Teacher: Trigger Class Repriming
 *
 * Writes an AuditLog row for TRIGGER_CLASS_REPRIMING.
 * Actual interval-halving logic deferred to Phase 10.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()

    const body = await req.json() as { classId?: string; benchmarkId?: string }

    const log = await prisma.auditLog.create({
      data: {
        actorUserId: session.user.userId,
        action: 'TRIGGER_CLASS_REPRIMING',
        entityType: 'Class',
        entityId: body.classId ?? null,
        metadataJson: {
          classId: body.classId ?? null,
          benchmarkId: body.benchmarkId ?? null,
          note: 'Interval-halving deferred to Phase 10',
        },
      },
      select: { id: true },
    })

    return NextResponse.json({ ok: true, auditLogId: log.id })
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    throw e
  }
}
