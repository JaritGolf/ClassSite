/**
 * Activity Sessions — student login record.
 *
 * Extracted from the NextAuth `events.signIn` hook so it is testable without
 * driving NextAuth, mirroring `parent-portal/login.ts`.
 *
 * Note on what this can and cannot tell you: auth uses JWT sessions with no DB
 * adapter, so `events.signIn` fires only on a genuine sign-in. A student who
 * returns the next morning with a valid cookie fires nothing. So this is a
 * record of real authentications, NOT of "when did they start working today" —
 * that comes from the activity session itself. The two are linked by the
 * session's `startedByLogin` flag.
 */

import { prisma } from '@/lib/db'
import { touchActivity } from './touch'

/**
 * If the signed-in user is a STUDENT, write a `STUDENT_LOGIN` audit log and
 * open (or flag) their activity session. Returns true if a log was written.
 * Safe to call for any role.
 */
export async function recordStudentLoginEvent(userId: string): Promise<boolean> {
  if (!userId) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, student: { select: { id: true } } },
  })
  if (user?.role !== 'STUDENT') return false

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'STUDENT_LOGIN',
      entityType: 'User',
      entityId: userId,
      metadataJson: {},
    },
  })

  if (user.student) {
    await touchActivity(user.student.id, { viaLogin: true })
  }

  return true
}
