/**
 * Audit 13 — Item 6: Year-one default state shown when no scores yet exist; and the
 * active weights fall back to the blueprint baseline when no run is approved.
 * Prefix: test-audit13-05-
 */

import { PrismaClient } from '@prisma/client'
import {
  getCalibrationStatus,
  getActiveWeightSource,
  REPORTING_CATEGORY_WEIGHTS,
} from '@/lib/eoc-analytics'

const prisma = new PrismaClient()

// A far-future school year that has no EocActualScore rows.
const EMPTY_SCHOOL_YEAR = '2097-2098'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Audit 13 — Item 6: year-one default + weight fallback', () => {
  it('6a. getCalibrationStatus returns YEAR_ONE_NO_SCORES when no scores exist', async () => {
    const status = await getCalibrationStatus(EMPTY_SCHOOL_YEAR)
    expect(status.status).toBe('YEAR_ONE_NO_SCORES')
    expect(status.scoreCount).toBe(0)
  })

  it('6b. active weights cover the four blueprint categories', async () => {
    const { weights } = await getActiveWeightSource()
    const sum = Object.values(weights).reduce((s, w) => s + w, 0)
    // The default blueprint baseline is the spec §7.3 midpoints, which sum to
    // ~0.95 (not 1.0); the readiness engine normalizes by totalWeight at the
    // point of use. Only *calibrated* runs are renormalized to sum to 1.0.
    expect(sum).toBeGreaterThan(0.9)
    expect(sum).toBeLessThan(1.02)
    expect(Object.keys(weights).length).toBeGreaterThanOrEqual(4)
  })

  it('6c. with no approved run in the DB, the source is the default blueprint', async () => {
    const appliedCount = await prisma.eocCalibrationRun.count({ where: { applied: true } })
    const source = await getActiveWeightSource()
    if (appliedCount === 0) {
      expect(source.source).toBe('default')
      expect(source.weights).toEqual(REPORTING_CATEGORY_WEIGHTS)
    } else {
      // Another suite left an approved run; the contract still holds: calibrated.
      expect(source.source).toBe('calibrated')
    }
  })
})
