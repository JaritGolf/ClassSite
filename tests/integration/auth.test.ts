/**
 * Integration: teacher sign-in decision against the real database.
 *
 * A sign-in that is not on the allowlist must be rejected BEFORE anything is
 * written, so a stranger (or a student using a school Google account) can never
 * cause a User row to exist.
 */

import { PrismaClient } from '@prisma/client'
import { resolveTeacherSignIn } from '@/lib/auth/options'

const prisma = new PrismaClient()
const ALLOWED = 'signin-test-teacher@example.test'
const STRANGER = 'signin-test-stranger@example.test'
const env = { TEACHER_ALLOWED_EMAILS: ALLOWED }
const google = { provider: 'google' }

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { in: [ALLOWED, STRANGER] } },
    select: { id: true },
  })
  const ids = users.map((u) => u.id)
  await prisma.teacher.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

beforeAll(cleanup)
afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('resolveTeacherSignIn', () => {
  it('rejects everyone when the allowlist is unset, and writes nothing', async () => {
    const before = await prisma.user.count()
    const d = await resolveTeacherSignIn({ id: 'g1', email: ALLOWED, name: 'T T' }, google, {})
    expect(d.ok).toBe(false)
    expect(await prisma.user.count()).toBe(before)
  })

  it('rejects an address that is not on the list, and writes nothing', async () => {
    const before = await prisma.user.count()
    const d = await resolveTeacherSignIn({ id: 'g2', email: STRANGER, name: 'S S' }, google, env)
    expect(d.ok).toBe(false)
    expect(await prisma.user.count()).toBe(before)
    expect(await prisma.user.findUnique({ where: { email: STRANGER } })).toBeNull()
  })

  it('rejects a non-Google provider and a missing email', async () => {
    expect((await resolveTeacherSignIn({ id: 'x', email: ALLOWED, name: null }, { provider: 'other' }, env)).ok).toBe(false)
    expect((await resolveTeacherSignIn({ id: 'x', email: null, name: null }, google, env)).ok).toBe(false)
  })

  it('admits a listed address as an ACTIVE TEACHER with a Teacher row', async () => {
    const d = await resolveTeacherSignIn({ id: 'g3', email: ALLOWED.toUpperCase(), name: 'Tess Teacher' }, google, env)
    expect(d.ok).toBe(true)
    const row = await prisma.user.findUnique({ where: { email: ALLOWED }, include: { teacher: true } })
    expect(row?.role).toBe('TEACHER')
    expect(row?.status).toBe('ACTIVE')
    expect(row?.teacher).not.toBeNull()
  })

  it('is idempotent and preserves an ADMIN role', async () => {
    await prisma.user.update({ where: { email: ALLOWED }, data: { role: 'ADMIN' } })
    const d = await resolveTeacherSignIn({ id: 'g3', email: ALLOWED, name: 'Tess Teacher' }, google, env)
    expect(d).toMatchObject({ ok: true, role: 'ADMIN' })
    expect(await prisma.user.count({ where: { email: ALLOWED } })).toBe(1)
  })

  it('rejects a listed address whose account is not ACTIVE', async () => {
    await prisma.user.update({ where: { email: ALLOWED }, data: { status: 'SUSPENDED' } })
    const d = await resolveTeacherSignIn({ id: 'g3', email: ALLOWED, name: 'Tess Teacher' }, google, env)
    expect(d.ok).toBe(false)
  })
})
