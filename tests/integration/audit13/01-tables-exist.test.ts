/**
 * Audit 13 — Item 1: `eoc_actual_scores` and `eoc_calibration_runs` tables exist.
 *
 * A successful count query against each Prisma model proves the table exists and
 * is queryable. Prefix: test-audit13-01-
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Audit 13 — Item 1: calibration tables exist', () => {
  it('1a. eoc_actual_scores (EocActualScore) is queryable', async () => {
    const count = await prisma.eocActualScore.count()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('1b. eoc_calibration_runs (EocCalibrationRun) is queryable', async () => {
    const count = await prisma.eocCalibrationRun.count()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
