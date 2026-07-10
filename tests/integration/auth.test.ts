/**
 * Integration Tests: Auth — mock credentials provider
 *
 * Tests the mockAuthorize function end-to-end against the real database.
 * Verifies that mock auth correctly upserts User records with the right role
 * for all four roles (Audit 2, item 1).
 *
 * Prerequisites: DATABASE_URL must point to a running PostgreSQL instance.
 * MOCK_AUTH must be 'true' (set in .env.local, loaded by export $(...) before jest).
 */

import { PrismaClient } from '@prisma/client'
import { mockAuthorize } from '@/lib/auth/options'

const prisma = new PrismaClient()

beforeAll(async () => {
  // Ensure mock auth is enabled for this test suite
  process.env.MOCK_AUTH = 'true'
  // NODE_ENV is 'test' in Jest (not 'production') — mock auth works in this environment
})

afterAll(async () => {
  // Clean up all mock users created during tests. Best-effort: durable dev
  // fixtures (e.g. seed/demo) are deliberately tied to these same mock-*
  // identities and may have FK-dependent rows (Class, ClassEnrollment, etc.)
  // that block a blanket delete. That's not this suite's concern — its
  // assertions have already run — so swallow the error rather than failing
  // teardown.
  await prisma.user
    .deleteMany({
      where: { cleverId: { startsWith: 'mock-' } },
    })
    .catch(() => {
      /* FK-blocked by durable dev data — non-fatal */
    })
  await prisma.$disconnect()
})

describe('mockAuthorize — guards', () => {
  it('returns null when MOCK_AUTH is false', async () => {
    process.env.MOCK_AUTH = 'false'
    const result = await mockAuthorize({ role: 'STUDENT' })
    expect(result).toBeNull()
    process.env.MOCK_AUTH = 'true' // restore
  })

  it('returns null for an invalid role string', async () => {
    const result = await mockAuthorize({ role: 'INVALID_ROLE' })
    expect(result).toBeNull()
  })

  it('returns null when credentials are undefined', async () => {
    const result = await mockAuthorize(undefined)
    expect(result).toBeNull()
  })
})

describe('mockAuthorize — STUDENT', () => {
  it('upserts and returns a STUDENT user', async () => {
    const result = await mockAuthorize({ role: 'STUDENT' })
    expect(result).not.toBeNull()
    expect(result?.role).toBe('STUDENT')
    expect(result?.userId).toBeTruthy()
    expect(result?.name).toBeTruthy()
  })

  it('creates the STUDENT record in the database', async () => {
    await mockAuthorize({ role: 'STUDENT' })
    const dbUser = await prisma.user.findUnique({
      where: { cleverId: 'mock-student-001' },
    })
    expect(dbUser).not.toBeNull()
    expect(dbUser?.role).toBe('STUDENT')
    expect(dbUser?.status).toBe('ACTIVE')
  })
})

describe('mockAuthorize — TEACHER', () => {
  it('upserts and returns a TEACHER user', async () => {
    const result = await mockAuthorize({ role: 'TEACHER' })
    expect(result?.role).toBe('TEACHER')
    expect(result?.userId).toBeTruthy()
  })
})

describe('mockAuthorize — PARENT', () => {
  it('upserts and returns a PARENT user', async () => {
    const result = await mockAuthorize({ role: 'PARENT' })
    expect(result?.role).toBe('PARENT')
    expect(result?.userId).toBeTruthy()
  })
})

describe('mockAuthorize — ADMIN', () => {
  it('upserts and returns an ADMIN user', async () => {
    const result = await mockAuthorize({ role: 'ADMIN' })
    expect(result?.role).toBe('ADMIN')
    expect(result?.userId).toBeTruthy()
  })
})

describe('mockAuthorize — idempotency', () => {
  it('returns the same userId on repeated calls for STUDENT', async () => {
    const r1 = await mockAuthorize({ role: 'STUDENT' })
    const r2 = await mockAuthorize({ role: 'STUDENT' })
    expect(r1?.userId).toBe(r2?.userId)
  })

  it('returns the same userId on repeated calls for TEACHER', async () => {
    const r1 = await mockAuthorize({ role: 'TEACHER' })
    const r2 = await mockAuthorize({ role: 'TEACHER' })
    expect(r1?.userId).toBe(r2?.userId)
  })

  it('each role has a distinct userId', async () => {
    const student = await mockAuthorize({ role: 'STUDENT' })
    const teacher = await mockAuthorize({ role: 'TEACHER' })
    const parent = await mockAuthorize({ role: 'PARENT' })
    const admin = await mockAuthorize({ role: 'ADMIN' })
    const ids = [student?.userId, teacher?.userId, parent?.userId, admin?.userId]
    const unique = new Set(ids.filter(Boolean))
    expect(unique.size).toBe(4)
  })
})
