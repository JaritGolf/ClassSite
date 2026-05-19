/**
 * Unit tests for narrative lib pure functions.
 */

import { NARRATIVE_BEATS, getBeatsForUnitCode } from '../../../src/lib/narrative'

describe('NARRATIVE_BEATS', () => {
  it('has at least 3 beats for unit-1', () => {
    const beats = getBeatsForUnitCode('unit-1')
    expect(beats.length).toBeGreaterThanOrEqual(3)
  })

  it('each beat has the required fields', () => {
    for (const beat of NARRATIVE_BEATS) {
      expect(beat.beatKey).toBeTruthy()
      expect(beat.npcName).toBeTruthy()
      expect(beat.dialogue).toBeTruthy()
      expect(beat.unitCode).toBeTruthy()
    }
  })

  it('all beatKeys are unique', () => {
    const keys = NARRATIVE_BEATS.map((b) => b.beatKey)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

describe('getBeatsForUnitCode', () => {
  it('returns only beats for the given unit', () => {
    const beats = getBeatsForUnitCode('unit-1')
    expect(beats.every((b) => b.unitCode === 'unit-1')).toBe(true)
  })

  it('returns empty array for unknown unit code', () => {
    const beats = getBeatsForUnitCode('unit-99')
    expect(beats).toEqual([])
  })
})

// ── Pure first-unread logic (extracted) ───────────────────────────────────────

function findFirstUnread(allBeats: { beatKey: string }[], readKeys: string[]): { beatKey: string } | null {
  const readSet = new Set(readKeys)
  return allBeats.find((b) => !readSet.has(b.beatKey)) ?? null
}

describe('findFirstUnread', () => {
  const beats = [
    { beatKey: 'unit-1-intro' },
    { beatKey: 'unit-1-skeptic' },
    { beatKey: 'unit-1-citizen' },
  ]

  it('returns first beat when none are read', () => {
    expect(findFirstUnread(beats, [])).toEqual({ beatKey: 'unit-1-intro' })
  })

  it('returns second beat when first is read', () => {
    expect(findFirstUnread(beats, ['unit-1-intro'])).toEqual({ beatKey: 'unit-1-skeptic' })
  })

  it('returns null when all beats are read', () => {
    expect(findFirstUnread(beats, ['unit-1-intro', 'unit-1-skeptic', 'unit-1-citizen'])).toBeNull()
  })

  it('returns first unread even if later ones are read', () => {
    expect(findFirstUnread(beats, ['unit-1-citizen'])).toEqual({ beatKey: 'unit-1-intro' })
  })
})
