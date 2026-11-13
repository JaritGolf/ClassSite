/**
 * Admin bootstrap CLI.
 *
 *   npm run admin:bootstrap -- --email you@example.com            # preview
 *   npm run admin:bootstrap -- --email you@example.com --apply    # promote
 *
 * A teacher who signs in with Google is created as role TEACHER. This promotes
 * an existing account (matched by email) to ADMIN + ACTIVE. It does not create
 * users: the person must already have signed in once, which also means the
 * address is on TEACHER_ALLOWED_EMAILS.
 *
 * Only ever run this against a database you intend to change.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function readFlag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return null
  return process.argv[i + 1] ?? null
}

async function main() {
  const email = readFlag('email')?.trim().toLowerCase()
  const apply = process.argv.includes('--apply')

  if (!email) {
    console.error('Usage: npm run admin:bootstrap -- --email you@example.com [--apply]')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true },
  })
  if (!user) {
    console.error(`No account for ${email}. Sign in once with Google first.`)
    process.exit(1)
  }

  console.log(`${email}: role=${user.role} status=${user.status}`)
  if (user.role === 'ADMIN' && user.status === 'ACTIVE') {
    console.log('Already an active admin — nothing to do.')
    return
  }
  if (!apply) {
    console.log('Preview only. Re-run with --apply to promote to ADMIN / ACTIVE.')
    return
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN', status: 'ACTIVE' } }),
    prisma.auditLog.create({
      data: {
        actorUserId: null,
        action: 'ADMIN_BOOTSTRAPPED',
        entityType: 'User',
        entityId: user.id,
        metadataJson: { previousRole: user.role, previousStatus: user.status },
      },
    }),
  ])
  console.log('Promoted to ADMIN / ACTIVE.')
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
