/**
 * Admin bootstrap CLI — solves the first-login chicken-and-egg on a fresh deploy.
 *
 *   npm run admin:bootstrap -- --email you@example.com            # preview
 *   npm run admin:bootstrap -- --email you@example.com --apply    # promote
 *
 * Why this exists
 * ---------------
 * In production, mock auth is hard-disabled (`NODE_ENV === 'production'` — see
 * src/lib/auth/options.ts and non-negotiable rule #8), so the only working
 * provider on a new deploy is Google. But `upsertUserFromSignIn` creates every
 * new Google user as role=TEACHER / status=INACTIVE "pending admin approval",
 * and /admin/users is still a Phase-9 stub with no activation UI. So the first
 * human to sign in locks themselves out and there is no in-app way to fix it.
 *
 * This promotes an existing user (matched by email) to ADMIN + ACTIVE so the
 * first real administrator can get in. It deliberately does NOT create users:
 * the account must already exist, which means the person has already completed
 * a real Google OAuth sign-in and the email is verified by Google, not by us.
 *
 * Run it against the production DATABASE_URL, once, after that first sign-in.
 */

import { PrismaClient, UserRole, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

function readFlag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return null
  return process.argv[i + 1] ?? null
}

/**
 * --adopt <ROLE>: attach `email` to the EXISTING demo user for that role
 * (mock-teacher-001 / mock-admin-001 / …) instead of promoting a separate row.
 *
 * Why: the demo seed creates its users through mock auth, which upserts on
 * `cleverId` and never sets an email — so no Google sign-in can ever match them,
 * and the whole demo classroom is unreachable. Meanwhile `requireAuth` is a
 * strict allowlist with no ADMIN super-access (src/lib/auth/index.ts:52) and
 * /teacher/* is `requireAuth(['TEACHER'])`, so bootstrapping yourself to ADMIN
 * gets you the six /admin pages and nothing else — no roster, no LMS.
 *
 * Attaching your Google address to the demo TEACHER row means the Google
 * upsert-by-email in `upsertUserFromSignIn` finds that row, attaches your
 * googleId, sees status=ACTIVE (so no pending-approval bounce), and drops you
 * into Ms Teacher's dashboard with all six demo students.
 */
async function adopt(email: string, role: UserRole, apply: boolean) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  const target = await prisma.user.findFirst({
    where: { role, cleverId: { startsWith: 'mock-' } },
    select: { id: true, cleverId: true, firstName: true, lastName: true, email: true, status: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!target) {
    console.error(`No demo ${role} user found (looked for a mock-* cleverId).`)
    console.error('Run the demo seed first: npx tsx seed/demo/index.ts')
    process.exit(1)
  }

  if (existing && existing.id !== target.id) {
    console.error(`${email} is already attached to a different user (${existing.id}).`)
    console.error('Emails are unique. Detach it first, or pick another address.')
    process.exit(1)
  }

  console.log(`Demo ${role}: ${target.firstName} ${target.lastName} (${target.cleverId})`)
  console.log(`  current email: ${target.email ?? '(none)'}`)
  console.log(`  target email:  ${email}`)
  console.log(`  status:        ${target.status}`)

  if (target.email === email) {
    console.log('\nAlready attached — nothing to do.')
    return
  }
  if (!apply) {
    console.log('\n[dry-run] Re-run with --apply to attach.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { email, status: UserStatus.ACTIVE },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: 'DEMO_USER_EMAIL_ATTACHED',
        entityType: 'User',
        entityId: target.id,
        metadataJson: { email, role, cleverId: target.cleverId, via: 'scripts/bootstrap-admin.ts' },
      },
    })
  })

  console.log(`\n[applied] Sign in with Google as ${email} to land in this account.`)
}

async function main() {
  const email = readFlag('email')
  const adoptRole = readFlag('adopt')
  const apply = process.argv.includes('--apply')

  if (!email) {
    console.error('Missing --email. Usage:')
    console.error('  npm run admin:bootstrap -- --email you@example.com [--apply]')
    console.error('  npm run admin:bootstrap -- --email you@example.com --adopt TEACHER [--apply]')
    process.exit(1)
  }

  if (adoptRole) {
    const role = adoptRole.toUpperCase() as UserRole
    if (!Object.values(UserRole).includes(role)) {
      console.error(`Invalid --adopt role "${adoptRole}". One of: ${Object.values(UserRole).join(', ')}`)
      process.exit(1)
    }
    await adopt(email, role, apply)
    return
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  })

  if (!user) {
    console.error(`No user found with email ${email}.`)
    console.error('Sign in through Google on the deployed site first — that creates the')
    console.error('(INACTIVE) user row this script then promotes. Existing users:')
    const others = await prisma.user.findMany({
      select: { email: true, role: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    for (const o of others) {
      console.error(`  ${o.email ?? '(no email — SSO/mock user)'}  ${o.role}/${o.status}`)
    }
    process.exit(1)
  }

  console.log(`Found: ${user.firstName} ${user.lastName} <${user.email}>`)
  console.log(`  current: ${user.role} / ${user.status}`)
  console.log(`  target:  ${UserRole.ADMIN} / ${UserStatus.ACTIVE}`)

  if (user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE) {
    console.log('\nAlready an active admin — nothing to do.')
    return
  }

  if (!apply) {
    console.log('\n[dry-run] Re-run with --apply to make the change.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: null, // CLI action — no signed-in actor
        action: 'ADMIN_BOOTSTRAPPED',
        entityType: 'User',
        entityId: user.id,
        metadataJson: {
          email: user.email,
          previousRole: user.role,
          previousStatus: user.status,
          via: 'scripts/bootstrap-admin.ts',
        },
      },
    })
  })

  console.log('\n[applied] Promoted to ADMIN / ACTIVE. Sign out and back in to refresh the JWT.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
