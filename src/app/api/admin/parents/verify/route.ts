/**
 * POST /api/admin/parents/verify — set a parent↔student link's verification
 * status. Body: { linkId, status: 'VERIFIED'|'REJECTED'|'PENDING' }. ADMIN only.
 *
 * This is the in-app identity-verification gate (audit §36.19 item 1). The
 * district policy for *when* an admin may set VERIFIED lives in
 * docs/parent-identity-policy.md.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setLinkVerification, ParentAdminError } from '@/lib/parent-portal'
import type { ParentVerifiedStatus } from '@prisma/client'

const VALID = ['VERIFIED', 'REJECTED', 'PENDING']

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as { linkId?: string; status?: string }
  if (!body.linkId || !body.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  try {
    await setLinkVerification(session.user.userId, body.linkId, body.status as ParentVerifiedStatus)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ParentAdminError) {
      const status = e.code === 'LINK_NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
