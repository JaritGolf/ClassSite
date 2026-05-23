/**
 * Integration tests — Calibration Run Approval
 *
 * Tests approveCalibrationRun: NOT_FOUND, ALREADY_APPLIED, successful approval.
 * Prefix: test-eoc-ca-
 */

import { PrismaClient } from '@prisma/client'
import { approveCalibrationRun, ApprovalError } from '@/lib/eoc-analytics/calibration-approve'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-eoc-ca-admin'

let adminUserId: string
let pendingRunId: string
let appliedRunId: string

beforeAll(async () => {
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Admin',
      lastName: 'CA',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  // Create a pending run and an already-applied run
  const pending = await prisma.eocCalibrationRun.create({
    data: {
      schoolYear: '1998-ca-pending',
      applied: false,
      runAt: new Date(),
      recommendedWeightChanges: { 'Origins and Purposes': { current: 0.275, recommended: 0.280, deltaPercent: 1.8 } },
    },
    select: { id: true },
  })
  pendingRunId = pending.id

  const applied = await prisma.eocCalibrationRun.create({
    data: {
      schoolYear: '1998-ca-applied',
      applied: true,
      runAt: new Date(),
    },
    select: { id: true },
  })
  appliedRunId = applied.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.eocCalibrationRun.deleteMany({
    where: { id: { in: [pendingRunId, appliedRunId] } },
  })
  await prisma.user.deleteMany({ where: { cleverId: ADMIN_CLEVERID } })
  await prisma.$disconnect()
})

describe('approveCalibrationRun', () => {
  it('throws ApprovalError(NOT_FOUND) for nonexistent run ID', async () => {
    await expect(
      approveCalibrationRun(adminUserId, 'nonexistent-run-id', 'test reason')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws ApprovalError(ALREADY_APPLIED) for already-applied run', async () => {
    await expect(
      approveCalibrationRun(adminUserId, appliedRunId, 'test reason')
    ).rejects.toMatchObject({ code: 'ALREADY_APPLIED' })
  })

  it('successfully approves a pending run and returns auditLogId', async () => {
    const result = await approveCalibrationRun(
      adminUserId,
      pendingRunId,
      'EOC 2026 outcomes reviewed — RC correlations align with observations.'
    )
    expect(typeof result.auditLogId).toBe('string')
    expect(result.auditLogId.length).toBeGreaterThan(0)
  })

  it('sets applied=true on the run row', async () => {
    const run = await prisma.eocCalibrationRun.findUnique({ where: { id: pendingRunId } })
    expect(run?.applied).toBe(true)
  })

  it('writes AuditLog with action=CALIBRATION_WEIGHTS_APPROVED', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'CALIBRATION_WEIGHTS_APPROVED' },
    })
    expect(log).not.toBeNull()
    expect(log?.entityType).toBe('EocCalibrationRun')
    expect(log?.entityId).toBe(pendingRunId)
    const meta = log?.metadataJson as Record<string, unknown>
    expect(typeof meta?.reason).toBe('string')
  })

  it('throws ALREADY_APPLIED if approve is called twice on same run', async () => {
    await expect(
      approveCalibrationRun(adminUserId, pendingRunId, 'second approval attempt')
    ).rejects.toMatchObject({ code: 'ALREADY_APPLIED' })
  })

  it('ApprovalError has correct name and code properties', async () => {
    try {
      await approveCalibrationRun(adminUserId, 'does-not-exist', 'test')
    } catch (err) {
      expect(err instanceof ApprovalError).toBe(true)
      expect((err as ApprovalError).code).toBe('NOT_FOUND')
      expect((err as ApprovalError).name).toBe('ApprovalError')
    }
  })
})
