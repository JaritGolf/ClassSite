/**
 * Unit — Strategy Track authored content + serving.
 * Pure: no DB. Guards that apply-it content is well-formed and that the served
 * shape never leaks the answer key.
 */

import {
  getStrategyMissions,
  getStrategyMission,
  getStrategyMissionForStudent,
} from '@/lib/strategy-track'

describe('strategy mission content', () => {
  const missions = getStrategyMissions()

  it('has the 7 EOC strategy missions', () => {
    expect(missions).toHaveLength(7)
  })

  it('every check is well-formed with a valid answer key', () => {
    for (const m of missions) {
      expect(m.checks.length).toBeGreaterThanOrEqual(1)
      for (const c of m.checks) {
        const ids = c.options.map((o) => o.id)
        expect(c.options.length).toBeGreaterThanOrEqual(2)
        // option ids unique
        expect(new Set(ids).size).toBe(ids.length)
        // correct answer is a real option
        expect(ids).toContain(c.correctOptionId)
      }
    }
  })
})

describe('getStrategyMissionForStudent (served shape)', () => {
  it('never serializes the answer key', () => {
    const served = getStrategyMissionForStudent('student-1', 'eliminate-distractor')
    expect(served).not.toBeNull()
    expect(JSON.stringify(served)).not.toContain('correctOptionId')
  })

  it('keeps every correct option present after shuffle (grading stays safe)', () => {
    for (const m of getStrategyMissions()) {
      const served = getStrategyMissionForStudent('student-xyz', m.code)!
      m.checks.forEach((authored, i) => {
        const servedIds = served.checks[i].options.map((o) => o.id)
        expect(servedIds).toContain(authored.correctOptionId)
        expect(new Set(servedIds)).toEqual(new Set(authored.options.map((o) => o.id)))
      })
    }
  })

  it('shuffles deterministically per student (stable across calls)', () => {
    const a = getStrategyMissionForStudent('student-abc', 'evidence-based')!
    const b = getStrategyMissionForStudent('student-abc', 'evidence-based')!
    expect(a.checks[0].options.map((o) => o.id)).toEqual(
      b.checks[0].options.map((o) => o.id)
    )
  })

  it('returns null for an unknown mission', () => {
    expect(getStrategyMissionForStudent('s', 'not-a-mission')).toBeNull()
    expect(getStrategyMission('not-a-mission')).toBeNull()
  })
})
