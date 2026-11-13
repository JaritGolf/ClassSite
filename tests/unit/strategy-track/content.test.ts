/**
 * Unit — Strategy Track authored content + serving.
 * Pure: no DB. Guards that apply-it content is well-formed and that the served
 * shape never leaks the answer key.
 */

import {
  getStrategyMissions,
  getStrategyMission,
  getStrategyMissionsServed,
  gradeStrategyRound,
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

describe('getStrategyMissionsServed (served shape)', () => {
  it('never serializes the answer key or the feedback', () => {
    const served = getStrategyMissionsServed()
    expect(served).toHaveLength(7)
    const json = JSON.stringify(served)
    expect(json).not.toContain('correctOptionId')
    expect(json).not.toContain('feedback')
  })

  it('keeps every option present after shuffle (grading stays safe)', () => {
    const served = getStrategyMissionsServed()
    for (const m of getStrategyMissions()) {
      const s = served.find((x) => x.code === m.code)!
      m.checks.forEach((authored, i) => {
        expect(new Set(s.checks[i].options.map((o) => o.id))).toEqual(
          new Set(authored.options.map((o) => o.id))
        )
      })
    }
  })
})

describe('gradeStrategyRound', () => {
  it('a round is correct only when every check is right', () => {
    const m = getStrategyMission('eliminate-distractor')!
    const right = m.checks.map((c, i) => ({ checkIndex: i, optionId: c.correctOptionId }))
    expect(gradeStrategyRound(m.code, right).correct).toBe(true)

    const wrong = right.map((a, i) =>
      i === 0 ? { ...a, optionId: m.checks[0].options.find((o) => o.id !== a.optionId)!.id } : a
    )
    const result = gradeStrategyRound(m.code, wrong)
    expect(result.correct).toBe(false)
    expect(result.checks[0].correct).toBe(false)
  })

  it('an unanswered check is wrong', () => {
    expect(gradeStrategyRound('eliminate-distractor', []).correct).toBe(false)
  })

  it('rejects an unknown mission', () => {
    expect(() => gradeStrategyRound('nope', [])).toThrow()
  })
})
