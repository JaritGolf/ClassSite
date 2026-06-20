/**
 * Parent Portal — login audit (Phase 18, audit §36.19 item 4)
 *
 * Extracted from the NextAuth `events.signIn` hook so the "parent login writes
 * an audit log" rule is unit-testable without driving NextAuth.
 */

import { prisma } from '@/lib/db'

/**
 * If the signed-in user is a PARENT, write a `PARENT_LOGIN` audit log.
 * Returns true if a log was written. Safe to call for any role.
 */
export async function recordParentLoginEvent(userId: string): Promise<boolean> {
  if (!userId) return false
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role !== 'PARENT') return false

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'PARENT_LOGIN',
      entityType: 'User',
      entityId: userId,
      metadataJson: {},
    },
  })
  return true
}
