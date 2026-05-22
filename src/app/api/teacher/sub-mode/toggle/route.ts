/**
 * Sub-Mode Toggle Route
 *
 * Bypasses the sub-mode gate (this is the endpoint that controls the gate itself).
 * Writes an AuditLog entry for every toggle.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { setSubMode } from '@/lib/substitute-mode'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  const body = await req.json() as { on: boolean }
  await setSubMode(body.on)

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.userId,
      action: 'SUB_MODE_TOGGLE',
      entityType: 'Teacher',
      metadataJson: { on: body.on },
    },
  })

  return NextResponse.json({ ok: true, on: body.on })
}
