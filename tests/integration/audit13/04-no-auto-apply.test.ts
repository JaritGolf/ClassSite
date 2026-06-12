/**
 * Audit 13 — Item 5: Recommended weight changes do NOT auto-apply (require admin
 * approval). A freshly created EocCalibrationRun (applied=false) must NOT become the
 * active weight source; only after approveCalibrationRun does it take effect.
 * Prefix: test-audit13-04-
 */

import { PrismaClient } from '@prisma/client'
import { approveCalibrationRun, getActiveWeightSource } from '@/lib/eoc-analytics'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-audit13-04-admin'
const SCHOOL_YEAR = '2098-2099'

let adminUserId: string
let runId: string

const RECOMMENDED = {
  'Origins and Purposes': { current: 0.275, recommended: 0.25, deltaPercent: -9.1 },
  'Roles, Rights, and Responsibilities': { current: 0.275, recommended: 0.25, deltaPercent: -9.1 },
  'Government Policies': { current: 0.175, recommended: 0.25, deltaPercent: 42.9 },
  'Organization and Function': { current: 0.225, recommended: 0.25, deltaPercent: 11.1 },
}

beforeAll(async () => {
  const admin = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: { cleverId: ADMIN_CLEVERID, email: `${ADMIN_CLEVERID}@test.invalid`, firstName: 'A13', lastName: '04Admin', role: 'ADMIN' },
    update: {},
    select: { id: true },
  })
  adminUserId = admin.id

  const run = await prisma.eocCalibrationRun.create({
    data: {
      schoolYear: SCHOOL_YEAR,
      correlationReadinessToScaled: 0.7,
      recommendedWeightChanges: RECOMMENDED,
      applied: false,
    },
    select: { id: true },
  })
  runId = run.id
})

afterAll(async () => {
  await prisma.eocCalibrationRun.deleteMany({ where: { id: runId } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.user.deleteMany({ where: { cleverId: ADMIN_CLEVERID } })
  await prisma.$disconnect()
})

describe('Audit 13 — Item 5: no auto-apply without approval', () => {
  it('5a. an unapproved run is NOT the active weight source', async () => {
    const created = await prisma.eocCalibrationRun.findUnique({ where: { id: runId }, select: { applied: true } })
    expect(created!.applied).toBe(false)

    const source = await getActiveWeightSource()
    expect(source.runId).not.toBe(runId)
  })

  it('5b. after admin approval, the run becomes the active weight source', async () => {
    await approveCalibrationRun(adminUserId, runId, 'audit13-04 test approval')

    const updated = await prisma.eocCalibrationRun.findUnique({ where: { id: runId }, select: { applied: true } })
    expect(updated!.applied).toBe(true)

    const source = await getActiveWeightSource()
    expect(source.source).toBe('calibrated')
    expect(source.runId).toBe(runId)
    expect(source.weights['Government Policies']).toBeCloseTo(0.25, 6)
  })
})
