/**
 * POST /api/admin/parents — create (or return existing) a parent account.
 * Body: { email, firstName, lastName }. ADMIN only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createParentAccount, ParentAdminError } from '@/lib/parent-portal'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    email?: string
    firstName?: string
    lastName?: string
  }
  if (!body.email || !body.firstName || !body.lastName) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const result = await createParentAccount(session.user.userId, {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof ParentAdminError) {
      return NextResponse.json({ error: e.code }, { status: 400 })
    }
    throw e
  }
}
