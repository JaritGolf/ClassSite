/**
 * POST /api/admin/retention/purge
 *
 * Run the data-retention purge (audit §36.18 item 8). Defaults to a dry run;
 * pass { "dryRun": false } to actually delete. ADMIN only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { purgeExpiredData } from '@/lib/retention'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean }
  const dryRun = body.dryRun !== false // default true unless explicitly false

  const result = await purgeExpiredData({
    dryRun,
    actorUserId: session.user.userId,
  })

  return NextResponse.json(result)
}
