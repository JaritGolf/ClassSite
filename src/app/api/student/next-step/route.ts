/**
 * GET /api/student/next-step
 *
 * The student's ranked plan: the one thing to do now, plus what follows.
 *
 * Exists for the CLIENT components that need it after finishing a piece of work
 * — the assessment player's completion screen, the drill's done screen, the
 * remediation completion, the in-mission debrief. Server components call
 * `getStudentPlan` directly instead of round-tripping through here.
 *
 * Security: the student is resolved from the session cookie. There is no
 * `studentId` parameter to spoof, so this cannot be used to read another
 * student's plan.
 *
 * Freshness note: callers fetch this AFTER their submit resolves. That ordering
 * matters and it holds — `POST /api/assessment/[assessmentId]/submit` awaits
 * `updateProgressAfterAttempt` before responding, so the unlock and any newly
 * assigned remediation are already persisted by the time this runs.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStudentPlan } from '@/lib/student-next-step'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const plan = await getStudentPlan(student.id)

  // No-store: a plan computed a minute ago can be actively wrong (a mission just
  // unlocked, a remediation was just assigned), and a stale next step is exactly
  // the dead end this whole module exists to remove.
  return NextResponse.json(plan, { headers: { 'Cache-Control': 'no-store' } })
}
