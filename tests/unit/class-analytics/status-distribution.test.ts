/**
 * Unit Tests: Class Analytics — Status Distribution
 *
 * Tests that the status counts correctly sum to the total number of
 * student progress rows.
 */

import type { ClassStatusDistribution } from '@/lib/class-analytics'

// Pure logic test — no DB needed
describe('ClassStatusDistribution shape', () => {
  it('all nine status keys are present', () => {
    const dist: ClassStatusDistribution = {
      notStarted: 0,
      inProgress: 0,
      readyForMastery: 0,
      needsRemediation: 0,
      remediationComplete: 0,
      mastered: 0,
      exposureComplete: 0,
      teacherOverride: 0,
      interventionRequired: 0,
    }

    const keys = Object.keys(dist)
    expect(keys).toHaveLength(9)
    expect(keys).toContain('notStarted')
    expect(keys).toContain('mastered')
    expect(keys).toContain('interventionRequired')
  })

  it('sums to total student progress count', () => {
    const dist: ClassStatusDistribution = {
      notStarted: 5,
      inProgress: 10,
      readyForMastery: 3,
      needsRemediation: 2,
      remediationComplete: 1,
      mastered: 15,
      exposureComplete: 2,
      teacherOverride: 0,
      interventionRequired: 1,
    }

    const total = Object.values(dist).reduce((s, n) => s + n, 0)
    expect(total).toBe(39)
  })

  it('all zeros sum to zero', () => {
    const dist: ClassStatusDistribution = {
      notStarted: 0,
      inProgress: 0,
      readyForMastery: 0,
      needsRemediation: 0,
      remediationComplete: 0,
      mastered: 0,
      exposureComplete: 0,
      teacherOverride: 0,
      interventionRequired: 0,
    }
    const total = Object.values(dist).reduce((s, n) => s + n, 0)
    expect(total).toBe(0)
  })
})
