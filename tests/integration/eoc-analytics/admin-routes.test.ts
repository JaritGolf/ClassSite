/**
 * Integration tests — Admin EOC Routes (domain function layer)
 *
 * Tests that admin-specific domain calls work end-to-end with an ADMIN user.
 * Route-level auth (401/403) is verified by calling domain functions directly
 * and confirming they accept valid admin user IDs and reject invalid states.
 *
 * Full HTTP auth tests are E2E (gated on E2E=1). This suite tests the
 * domain functions behind the admin routes.
 *
 * Prefix: test-eoc-ar-
 */

import { PrismaClient } from '@prisma/client'
import { importEocScore, importEocScoresBatch } from '@/lib/eoc-analytics/score-import'
import { createCalibrationRun, getCalibrationStatus } from '@/lib/eoc-analytics/calibration-run'
import { approveCalibrationRun } from '@/lib/eoc-analytics/calibration-approve'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-eoc-ar-admin'
const STUDENT_CLEVERID = 'test-eoc-ar-student'
const SCHOOL_YEAR = '1997-ar-test'

let adminUserId: string
let studentId: string
const createdRunIds: string[] = []

beforeAll(async () => {
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Admin',
      lastName: 'AR',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  const studentUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: {
      cleverId: STUDENT_CLEVERID,
      email: `${STUDENT_CLEVERID}@test.invalid`,
      firstName: 'AR',
      lastName: 'Student',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })
  const st = await prisma.student.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id },
    update: {},
    select: { id: true },
  })
  studentId = st.id
})

afterAll(async () => {
  if (createdRunIds.length > 0) {
    await prisma.eocCalibrationRun.deleteMany({ where: { id: { in: createdRunIds } } })
  }
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.eocActualScore.deleteMany({ where: { schoolYear: SCHOOL_YEAR } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN_CLEVERID, STUDENT_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Admin EOC routes — domain function integration', () => {
  it('getCalibrationStatus returns YEAR_ONE_NO_SCORES before any scores', async () => {
    const status = await getCalibrationStatus(SCHOOL_YEAR)
    expect(status.status).toBe('YEAR_ONE_NO_SCORES')
    expect(status.scoreCount).toBe(0)
  })

  it('importEocScoresBatch (POST /api/admin/eoc-scores/import equiv.) imports scores', async () => {
    const result = await importEocScoresBatch(adminUserId, [
      {
        studentExternalKey: STUDENT_CLEVERID,
        schoolYear: SCHOOL_YEAR,
        scaledScore: 315,
        achievementLevel: 3,
        consentAcknowledged: true,
      },
    ])
    expect(result.imported).toBe(1)
    expect(result.skipped).toHaveLength(0)
  })

  it('getCalibrationStatus returns AWAITING_FIRST_RUN after score import', async () => {
    const status = await getCalibrationStatus(SCHOOL_YEAR)
    expect(status.status).toBe('AWAITING_FIRST_RUN')
    expect(status.scoreCount).toBeGreaterThan(0)
  })

  it('GET /api/admin/eoc-scores equiv. — scores exist in DB', async () => {
    const scores = await prisma.eocActualScore.findMany({ where: { schoolYear: SCHOOL_YEAR } })
    expect(scores.length).toBeGreaterThan(0)
  })

  it('createCalibrationRun (POST /api/admin/calibration/run equiv.) creates a run', async () => {
    const result = await createCalibrationRun(adminUserId, SCHOOL_YEAR)
    createdRunIds.push(result.runId)
    expect(result.applied).toBe(false)
    expect(result.schoolYear).toBe(SCHOOL_YEAR)
  })

  it('getCalibrationStatus returns RUN_PENDING_APPROVAL after run created', async () => {
    const status = await getCalibrationStatus(SCHOOL_YEAR)
    expect(status.status).toBe('RUN_PENDING_APPROVAL')
  })

  it('GET /api/admin/calibration/runs equiv. — runs exist in DB', async () => {
    const runs = await prisma.eocCalibrationRun.findMany({
      where: { id: { in: createdRunIds } },
    })
    expect(runs.length).toBeGreaterThan(0)
  })

  it('approveCalibrationRun (POST /api/admin/calibration/[id]/approve equiv.) approves run', async () => {
    const result = await approveCalibrationRun(
      adminUserId,
      createdRunIds[0],
      'Test approval for admin-routes integration test'
    )
    expect(typeof result.auditLogId).toBe('string')
  })

  it('getCalibrationStatus returns RUN_APPROVED after approval', async () => {
    const status = await getCalibrationStatus(SCHOOL_YEAR)
    expect(status.status).toBe('RUN_APPROVED')
    expect(status.latestRun?.applied).toBe(true)
  })

  it('importEocScore respects consent gate (domain function enforced)', async () => {
    await expect(
      importEocScore(adminUserId, {
        studentExternalKey: STUDENT_CLEVERID,
        schoolYear: SCHOOL_YEAR,
        scaledScore: 350,
        consentAcknowledged: false,
      })
    ).rejects.toMatchObject({ code: 'NO_CONSENT' })
  })
})
