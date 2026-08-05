/**
 * POST /api/teacher/benchmarks/[benchmarkId]/readiness
 *
 * Open or withhold a mission for students. Mirrors the content-approval route:
 * TEACHER/ADMIN only, blocked in substitute mode, audited in the same
 * transaction as the write.
 *
 * Body: { readyForStudents: boolean }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { setBenchmarkReadiness, ReadinessFlagError } from '@/lib/mastery'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'

const BodySchema = z.object({ readyForStudents: z.boolean() })

export async function POST(
  req: Request,
  { params }: { params: { benchmarkId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'readyForStudents must be a boolean' }, { status: 400 })
    }

    const result = await setBenchmarkReadiness(
      session.user.userId,
      params.benchmarkId,
      parsed.data.readyForStudents
    )
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof ReadinessFlagError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 })
    }
    throw e
  }
}
