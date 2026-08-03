/**
 * Student activity heartbeat.
 *
 * Called ~once a minute by `ActivityHeartbeat` while the student's tab is
 * visible and they are not idle. This is the only signal that captures time
 * spent reading a lesson, which leaves no other server-side trace.
 *
 * Security: the student is resolved from the session cookie. A `studentId` in
 * the request body is never read, so one student cannot log activity as another.
 * The body carries only a bucketed area enum — never a raw pathname.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ACTIVITY_AREAS, touchActivity } from '@/lib/activity-sessions'

const PingSchema = z.object({
  area: z.enum(ACTIVITY_AREAS).optional(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // `sendBeacon` on pagehide may deliver an empty body — treat that as a ping
  // with an unknown area rather than a client error.
  let area: (typeof ACTIVITY_AREAS)[number] = 'other'
  try {
    const parsed = PingSchema.safeParse(await request.json())
    if (parsed.success && parsed.data.area) area = parsed.data.area
  } catch {
    // No/invalid JSON body — keep the default area.
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  await touchActivity(student.id, { area })

  return new NextResponse(null, { status: 204 })
}
