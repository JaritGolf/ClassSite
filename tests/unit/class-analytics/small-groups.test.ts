/**
 * Unit Tests: Class Analytics — Small Groups
 *
 * Tests the small group logic constraints (cap=5, min=2, top-2 misconceptions).
 * Uses pure data manipulation to exercise the cap/min rules.
 */

import type { SmallGroup } from '@/lib/class-analytics'

// Pure helper: apply the cap and min rules to a list of candidate groups
function applyGroupConstraints(
  groups: Array<{ studentIds: string[]; misconceptionCodes: string[] }>
): SmallGroup[] {
  const MAX_GROUP_SIZE = 5
  const MIN_GROUP_SIZE = 2

  return groups
    .map((g, i) => ({
      groupId: `sg-${i}`,
      benchmarkCode: 'SS.7.CG.1.1',
      misconceptionCodes: g.misconceptionCodes.slice(0, 2),
      studentIds: g.studentIds.slice(0, MAX_GROUP_SIZE),
      suggestedAction: `Reteach: address misconceptions ${g.misconceptionCodes.join(', ')}`,
    }))
    .filter((g) => g.studentIds.length >= MIN_GROUP_SIZE)
}

describe('Small group constraints', () => {
  it('caps group size at 5', () => {
    const groups = applyGroupConstraints([
      {
        studentIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'],
        misconceptionCodes: ['MC-01', 'MC-02'],
      },
    ])
    expect(groups[0].studentIds).toHaveLength(5)
  })

  it('drops groups with fewer than 2 students', () => {
    const groups = applyGroupConstraints([
      { studentIds: ['s1'], misconceptionCodes: ['MC-01'] },
      { studentIds: ['s2', 's3'], misconceptionCodes: ['MC-02'] },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].studentIds).toHaveLength(2)
  })

  it('keeps groups with exactly 2 students (min boundary)', () => {
    const groups = applyGroupConstraints([
      { studentIds: ['s1', 's2'], misconceptionCodes: ['MC-01'] },
    ])
    expect(groups).toHaveLength(1)
  })

  it('keeps groups with exactly 5 students (max boundary)', () => {
    const groups = applyGroupConstraints([
      { studentIds: ['s1', 's2', 's3', 's4', 's5'], misconceptionCodes: ['MC-01'] },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].studentIds).toHaveLength(5)
  })

  it('limits misconceptions to top 2', () => {
    const groups = applyGroupConstraints([
      {
        studentIds: ['s1', 's2'],
        misconceptionCodes: ['MC-01', 'MC-02', 'MC-03', 'MC-04'],
      },
    ])
    expect(groups[0].misconceptionCodes).toHaveLength(2)
    expect(groups[0].misconceptionCodes).toEqual(['MC-01', 'MC-02'])
  })

  it('returns empty array when all groups have fewer than 2 students', () => {
    const groups = applyGroupConstraints([
      { studentIds: ['s1'], misconceptionCodes: ['MC-01'] },
      { studentIds: ['s2'], misconceptionCodes: ['MC-02'] },
    ])
    expect(groups).toHaveLength(0)
  })
})
