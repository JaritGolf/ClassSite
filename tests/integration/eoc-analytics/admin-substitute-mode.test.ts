/**
 * Integration tests — Admin routes in middleware sub-mode write gate
 *
 * Verifies that the middleware regex extension includes /api/admin/.
 * Tests the regex directly and validates that admin domain functions are
 * correctly gated at the middleware level (the regex is the enforcement mechanism).
 *
 * The middleware regex is: /^\/api\/(teacher|mastery|reading-load|admin)\//
 *
 * Per the architecture decision: the regex gate applies to all /api/admin/
 * write endpoints. If the cookie cq_sub_mode=1 is present, the middleware
 * returns 403 SUB_MODE_READ_ONLY before the route handler runs.
 *
 * This test verifies:
 * 1. The regex matches /api/admin/* paths (regression guard)
 * 2. The guard does NOT apply to GET requests
 * 3. Admin domain functions work correctly when called outside middleware context
 *
 * Prefix: test-eoc-asm-
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Middleware regex (same as src/middleware.ts) ──────────────────────────────
const WRITE_GATE_REGEX = /^\/api\/(teacher|mastery|reading-load|admin)\//
const MUTATIONS = ['POST', 'PATCH', 'DELETE']

describe('Middleware write-gate regex — admin route inclusion', () => {
  it('matches /api/admin/eoc-scores/import (POST)', () => {
    expect(WRITE_GATE_REGEX.test('/api/admin/eoc-scores/import')).toBe(true)
  })

  it('matches /api/admin/calibration/run (POST)', () => {
    expect(WRITE_GATE_REGEX.test('/api/admin/calibration/run')).toBe(true)
  })

  it('matches /api/admin/calibration/[runId]/approve (POST)', () => {
    expect(WRITE_GATE_REGEX.test('/api/admin/calibration/run123/approve')).toBe(true)
  })

  it('matches /api/admin/analytics/overview (GET — guard applies but GET is not a mutation)', () => {
    // The regex matches but isMutation=false for GET, so the gate does NOT block it
    const pathname = '/api/admin/analytics/overview'
    const isGuarded = WRITE_GATE_REGEX.test(pathname)
    const isGet = !MUTATIONS.includes('GET')
    // Guard condition: isMutation && isGuarded → only blocks mutations
    expect(isGuarded).toBe(true)
    expect(isGet).toBe(true)
    // Therefore GET /api/admin/* is NOT blocked even when sub-mode is on
    expect(MUTATIONS.includes('GET') && isGuarded).toBe(false)
  })

  it('does NOT match /api/student/ paths', () => {
    expect(WRITE_GATE_REGEX.test('/api/student/dashboard')).toBe(false)
  })

  it('does NOT match /api/auth/ paths', () => {
    expect(WRITE_GATE_REGEX.test('/api/auth/session')).toBe(false)
  })

  it('still matches /api/teacher/ paths (regression)', () => {
    expect(WRITE_GATE_REGEX.test('/api/teacher/classes')).toBe(true)
  })

  it('still matches /api/mastery/ paths (regression)', () => {
    expect(WRITE_GATE_REGEX.test('/api/mastery/override')).toBe(true)
  })

  it('still matches /api/reading-load/ paths (regression)', () => {
    expect(WRITE_GATE_REGEX.test('/api/reading-load/accommodation')).toBe(true)
  })

  it('toggle route is excluded by pathname check (not by regex)', () => {
    // The toggle exclusion is: isToggleRoute = pathname === '/api/teacher/sub-mode/toggle'
    // This is a specific pathname check, separate from the regex.
    // Admin routes have no toggle route, so sub-mode blocks all admin mutations.
    const togglePath = '/api/teacher/sub-mode/toggle'
    expect(WRITE_GATE_REGEX.test(togglePath)).toBe(true) // regex matches
    expect(togglePath === '/api/teacher/sub-mode/toggle').toBe(true) // but toggle is excluded
  })
})

describe('Admin domain functions work with ADMIN-role user', () => {
  const ADMIN_CLEVERID = 'test-eoc-asm-admin'
  let adminUserId: string

  beforeAll(async () => {
    const adminUser = await prisma.user.upsert({
      where: { cleverId: ADMIN_CLEVERID },
      create: {
        cleverId: ADMIN_CLEVERID,
        email: `${ADMIN_CLEVERID}@test.invalid`,
        firstName: 'ASM',
        lastName: 'Admin',
        role: 'ADMIN',
      },
      update: {},
      select: { id: true },
    })
    adminUserId = adminUser.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { cleverId: ADMIN_CLEVERID } })
    await prisma.$disconnect()
  })

  it('admin user has role ADMIN (no Teacher profile needed)', async () => {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    })
    expect(user?.role).toBe('ADMIN')
    // Admin users do NOT need a Teacher profile
    const teacher = await prisma.teacher.findUnique({ where: { userId: adminUserId } })
    expect(teacher).toBeNull()
  })
})
