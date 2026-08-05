/**
 * Progress checkpoints — pure level math.
 *
 * Covers the prefix level rule, sparse/partial checkpoints, strict target
 * ordering, the timezone-correct end-of-day boundary (including a DST flip), and
 * the cleared-as-of predicate.
 *
 * All tests are pure — no database, no mocking required.
 */

import {
  computeCheckpointLevel,
  missionsRemainingToTarget,
  validateTargetOrder,
  validateCheckpointProgression,
  endOfSchoolDayUtc,
  isCheckpointClosed,
  clearedBenchmarkIdsAsOf,
  CLEARED_STATUSES,
  type LevelTarget,
} from '@/lib/progress-checkpoints/levels'

/** Build targets for levels 1..n mapped to benchmarks b1..bn at seq 1..n. */
function ladder(n: number): LevelTarget[] {
  return Array.from({ length: n }, (_, i) => ({
    level: i + 1,
    benchmarkId: `b${i + 1}`,
    sequenceOrder: i + 1,
  }))
}

// ── The prefix level rule ─────────────────────────────────────────────────────

describe('computeCheckpointLevel', () => {
  const targets = ladder(4)

  it('no targets cleared → Level 0', () => {
    const out = computeCheckpointLevel(targets, new Set())
    expect(out.level).toBe(0)
    expect(out.nextLevel).toBe(1)
    expect(out.nextTarget!.benchmarkId).toBe('b1')
  })

  it('first two cleared → Level 2, next is 3', () => {
    const out = computeCheckpointLevel(targets, new Set(['b1', 'b2']))
    expect(out.level).toBe(2)
    expect(out.nextLevel).toBe(3)
    expect(out.nextTarget!.benchmarkId).toBe('b3')
  })

  it('all cleared → Level 4, nothing further', () => {
    const out = computeCheckpointLevel(targets, new Set(['b1', 'b2', 'b3', 'b4']))
    expect(out.level).toBe(4)
    expect(out.nextLevel).toBeNull()
    expect(out.nextTarget).toBeNull()
  })

  it('PREFIX rule: skipping ahead does not award the higher level', () => {
    // A teacher UNLOCK_BENCHMARK override can let a student clear b4 without b2.
    const out = computeCheckpointLevel(targets, new Set(['b1', 'b3', 'b4']))
    expect(out.level).toBe(1)
    expect(out.nextLevel).toBe(2)
  })

  it('clearing only a later target awards nothing', () => {
    expect(computeCheckpointLevel(targets, new Set(['b4'])).level).toBe(0)
  })

  it('extra cleared missions beyond the ladder do not raise the level past max', () => {
    const out = computeCheckpointLevel(targets, new Set(['b1', 'b2', 'b3', 'b4', 'b5', 'b6']))
    expect(out.level).toBe(4)
    expect(out.maxLevel).toBe(4)
  })
})

// ── Sparse / partial checkpoints ──────────────────────────────────────────────

describe('computeCheckpointLevel — partial checkpoints', () => {
  it('a checkpoint with only Levels 1-2 set caps at 2', () => {
    const out = computeCheckpointLevel(ladder(2), new Set(['b1', 'b2']))
    expect(out.level).toBe(2)
    expect(out.maxLevel).toBe(2)
    expect(out.nextLevel).toBeNull()
  })

  it('an unconfigured checkpoint reports Level 0 and maxLevel 0', () => {
    const out = computeCheckpointLevel([], new Set(['b1', 'b2']))
    expect(out.level).toBe(0)
    expect(out.maxLevel).toBe(0)
    expect(out.nextLevel).toBeNull()
    expect(out.nextTarget).toBeNull()
  })

  it('a gap in levels is skipped, not treated as uncleared', () => {
    // Levels 1, 2, 4 configured — no Level 3.
    const sparse: LevelTarget[] = [
      { level: 1, benchmarkId: 'b1', sequenceOrder: 1 },
      { level: 2, benchmarkId: 'b2', sequenceOrder: 2 },
      { level: 4, benchmarkId: 'b4', sequenceOrder: 4 },
    ]
    const out = computeCheckpointLevel(sparse, new Set(['b1', 'b2', 'b4']))
    expect(out.level).toBe(4)
    expect(out.maxLevel).toBe(4)
  })

  it('levels outside 1-4 are ignored', () => {
    const bad: LevelTarget[] = [
      { level: 0, benchmarkId: 'b0', sequenceOrder: 0 },
      { level: 1, benchmarkId: 'b1', sequenceOrder: 1 },
      { level: 9, benchmarkId: 'b9', sequenceOrder: 9 },
    ]
    const out = computeCheckpointLevel(bad, new Set(['b0', 'b1', 'b9']))
    expect(out.level).toBe(1)
    expect(out.maxLevel).toBe(1)
  })
})

// ── Missions remaining ────────────────────────────────────────────────────────

describe('missionsRemainingToTarget', () => {
  const ordered = [1, 2, 3, 4, 5, 6, 7, 10] // seeded reachable chain shape

  it('counts unclearedmissions up to and including the target', () => {
    expect(missionsRemainingToTarget(ordered, new Set([1, 2]), 4)).toBe(2) // 3 and 4
  })

  it('is 0 when the target and everything before it is cleared', () => {
    expect(missionsRemainingToTarget(ordered, new Set([1, 2, 3]), 3)).toBe(0)
  })

  it('ignores missions past the target', () => {
    expect(missionsRemainingToTarget(ordered, new Set(), 2)).toBe(2)
  })

  it('skips gaps in the chain (no mission 8 or 9)', () => {
    expect(missionsRemainingToTarget(ordered, new Set([1, 2, 3, 4, 5, 6, 7]), 10)).toBe(1)
  })
})

// ── Target ordering ───────────────────────────────────────────────────────────

describe('validateTargetOrder', () => {
  it('accepts a strictly increasing ladder', () => {
    expect(validateTargetOrder(ladder(4))).toEqual([])
  })

  it('accepts a partial ladder', () => {
    expect(validateTargetOrder(ladder(2))).toEqual([])
  })

  it('rejects two levels pointing at the same mission (strict, not non-decreasing)', () => {
    const dup: LevelTarget[] = [
      { level: 1, benchmarkId: 'b3', sequenceOrder: 3 },
      { level: 2, benchmarkId: 'b3', sequenceOrder: 3 },
    ]
    const problems = validateTargetOrder(dup)
    expect(problems.map((p) => p.code)).toContain('NOT_INCREASING')
  })

  it('rejects a higher level pointing earlier on the map', () => {
    const backwards: LevelTarget[] = [
      { level: 1, benchmarkId: 'b5', sequenceOrder: 5 },
      { level: 2, benchmarkId: 'b2', sequenceOrder: 2 },
    ]
    expect(validateTargetOrder(backwards).map((p) => p.code)).toContain('NOT_INCREASING')
  })

  it('rejects a duplicated level number', () => {
    const dup: LevelTarget[] = [
      { level: 1, benchmarkId: 'b1', sequenceOrder: 1 },
      { level: 1, benchmarkId: 'b2', sequenceOrder: 2 },
    ]
    expect(validateTargetOrder(dup).map((p) => p.code)).toContain('DUPLICATE_LEVEL')
  })

  it('rejects an out-of-range level', () => {
    const bad: LevelTarget[] = [{ level: 5, benchmarkId: 'b5', sequenceOrder: 5 }]
    expect(validateTargetOrder(bad).map((p) => p.code)).toContain('LEVEL_OUT_OF_RANGE')
  })
})

describe('validateCheckpointProgression', () => {
  it('accepts checkpoints that keep advancing', () => {
    const problems = validateCheckpointProgression([
      { checkpointNumber: 1, targets: ladder(2) },
      {
        checkpointNumber: 2,
        targets: [
          { level: 1, benchmarkId: 'b3', sequenceOrder: 3 },
          { level: 2, benchmarkId: 'b4', sequenceOrder: 4 },
        ],
      },
    ])
    expect(problems).toEqual([])
  })

  it('rejects a later checkpoint that starts before an earlier one ended', () => {
    const problems = validateCheckpointProgression([
      { checkpointNumber: 1, targets: ladder(4) },
      {
        checkpointNumber: 2,
        targets: [{ level: 1, benchmarkId: 'b2', sequenceOrder: 2 }],
      },
    ])
    expect(problems.map((p) => p.code)).toContain('NOT_INCREASING')
  })

  it('skips unconfigured checkpoints instead of blocking the save', () => {
    const problems = validateCheckpointProgression([
      { checkpointNumber: 1, targets: ladder(2) },
      { checkpointNumber: 2, targets: [] },
      {
        checkpointNumber: 3,
        targets: [{ level: 1, benchmarkId: 'b3', sequenceOrder: 3 }],
      },
    ])
    expect(problems).toEqual([])
  })
})

// ── Timezone-correct end of day ───────────────────────────────────────────────

describe('endOfSchoolDayUtc', () => {
  it('EDT (October): boundary is 04:00 UTC the next day, not 00:00', () => {
    // Oct 17 2026 is during EDT (UTC-4). End of that school day = Oct 18 04:00 UTC.
    const bound = endOfSchoolDayUtc(new Date('2026-10-17T00:00:00.000Z'))
    expect(bound.toISOString()).toBe('2026-10-18T04:00:00.000Z')
  })

  it('EST (December): boundary shifts to 05:00 UTC with the DST change', () => {
    // Dec 19 2026 is during EST (UTC-5). End of that school day = Dec 20 05:00 UTC.
    const bound = endOfSchoolDayUtc(new Date('2026-12-19T00:00:00.000Z'))
    expect(bound.toISOString()).toBe('2026-12-20T05:00:00.000Z')
  })

  it('the naive UTC-midnight bound would have excluded evening work (the bug)', () => {
    const endsOn = new Date('2026-10-17T00:00:00.000Z')
    const naive = new Date('2026-10-18T00:00:00.000Z') // what UTC arithmetic gives
    const correct = endOfSchoolDayUtc(endsOn)
    // A student finishing at 9pm Eastern on the due date:
    const ninePmEastern = new Date('2026-10-18T01:00:00.000Z')
    expect(ninePmEastern.getTime() < naive.getTime()).toBe(false) // would have missed out
    expect(ninePmEastern.getTime() < correct.getTime()).toBe(true) // counts, correctly
  })
})

describe('isCheckpointClosed', () => {
  const endsOn = new Date('2026-10-17T00:00:00.000Z')

  it('is open during the evening of the end date', () => {
    expect(isCheckpointClosed(endsOn, new Date('2026-10-18T01:00:00.000Z'))).toBe(false)
  })

  it('is closed once the local day has rolled over', () => {
    expect(isCheckpointClosed(endsOn, new Date('2026-10-18T04:00:00.000Z'))).toBe(true)
  })

  it('is open well before the date', () => {
    expect(isCheckpointClosed(endsOn, new Date('2026-09-01T12:00:00.000Z'))).toBe(false)
  })
})

// ── Cleared-as-of ─────────────────────────────────────────────────────────────

describe('clearedBenchmarkIdsAsOf', () => {
  const cutoff = new Date('2026-10-18T04:00:00.000Z')

  it('counts MASTERED, EXPOSURE_COMPLETE and TEACHER_OVERRIDE', () => {
    expect([...CLEARED_STATUSES].sort()).toEqual([
      'EXPOSURE_COMPLETE',
      'MASTERED',
      'TEACHER_OVERRIDE',
    ])
  })

  it('excludes statuses that are not cleared', () => {
    const cleared = clearedBenchmarkIdsAsOf(
      [
        { benchmarkId: 'a', status: 'IN_PROGRESS', masteredAt: null, offRampTriggeredAt: null },
        { benchmarkId: 'b', status: 'NEEDS_REMEDIATION', masteredAt: null, offRampTriggeredAt: null },
        { benchmarkId: 'c', status: 'NOT_STARTED', masteredAt: null, offRampTriggeredAt: null },
      ],
      null
    )
    expect(cleared.size).toBe(0)
  })

  it('off-ramped missions count, via offRampTriggeredAt', () => {
    const cleared = clearedBenchmarkIdsAsOf(
      [
        {
          benchmarkId: 'a',
          status: 'EXPOSURE_COMPLETE',
          masteredAt: null,
          offRampTriggeredAt: new Date('2026-10-01T12:00:00.000Z'),
        },
      ],
      cutoff
    )
    expect([...cleared]).toEqual(['a'])
  })

  it('excludes work finished after the cutoff', () => {
    const cleared = clearedBenchmarkIdsAsOf(
      [
        {
          benchmarkId: 'a',
          status: 'MASTERED',
          masteredAt: new Date('2026-11-03T12:00:00.000Z'),
          offRampTriggeredAt: null,
        },
      ],
      cutoff
    )
    expect(cleared.size).toBe(0)
  })

  it('includes work finished the evening of the due date', () => {
    const cleared = clearedBenchmarkIdsAsOf(
      [
        {
          benchmarkId: 'a',
          status: 'MASTERED',
          masteredAt: new Date('2026-10-18T01:00:00.000Z'), // 9pm Eastern Oct 17
          offRampTriggeredAt: null,
        },
      ],
      cutoff
    )
    expect([...cleared]).toEqual(['a'])
  })

  it('undateable cleared rows count live but not for a closed checkpoint', () => {
    const rows = [
      {
        benchmarkId: 'a',
        status: 'TEACHER_OVERRIDE' as const,
        masteredAt: null,
        offRampTriggeredAt: null,
      },
    ]
    expect(clearedBenchmarkIdsAsOf(rows, null).size).toBe(1)
    expect(clearedBenchmarkIdsAsOf(rows, cutoff).size).toBe(0)
  })

  it('uses the earliest available timestamp when both are present', () => {
    const rows = [
      {
        benchmarkId: 'a',
        status: 'MASTERED' as const,
        masteredAt: new Date('2026-11-03T12:00:00.000Z'),
        offRampTriggeredAt: new Date('2026-10-01T12:00:00.000Z'),
      },
    ]
    expect(clearedBenchmarkIdsAsOf(rows, cutoff).size).toBe(1)
  })
})
