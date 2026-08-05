/**
 * Pure fixture tests for the mission-availability rule.
 *
 * These exist because the bug they guard against shipped for months underneath
 * two PASSING tests. `mastery.test.ts` asserted that mastering a benchmark
 * WRITES a NOT_STARTED row for the next one — which it did. `e2e/smoke.test.ts`
 * asserted that a map node is VISIBLE — which it was, wearing a padlock. Neither
 * asked the only question that mattered: after mastering a mission, can the
 * student open the next one?
 *
 * Every case below is phrased as that question.
 */

import { computeAvailability, pickCurrentMissionId } from '@/lib/mastery/availability'
import type { AvailabilityInputs } from '@/lib/mastery/availability'
import type { StudentProgressStatus } from '@prisma/client'

/** Build `ordered` from a compact "id:playable" spec, e.g. 'a:1 b:0 c:1'. */
function ordered(spec: string) {
  return spec
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [id, playable] = tok.split(':')
      return { id, playable: playable === '1' }
    })
}

function rows(map: Record<string, StudentProgressStatus>) {
  return Object.entries(map).map(([benchmarkId, status]) => ({ benchmarkId, status }))
}

function run(inputs: AvailabilityInputs) {
  const result = computeAvailability(inputs)
  return {
    state: (id: string) => result.get(id)?.state,
    openable: (id: string) => result.get(id)?.openable,
    raw: result,
  }
}

describe('computeAvailability — entry point', () => {
  it('opens the first playable mission for a student with no progress rows', () => {
    // The day-one case. Nothing bootstraps a StudentProgress row on enrollment,
    // so without this clause a new student sees an entirely closed map.
    const r = run({ ordered: ordered('a:1 b:1 c:1'), progressRows: [] })
    expect(r.state('a')).toBe('AVAILABLE')
    expect(r.openable('a')).toBe(true)
    expect(r.state('b')).toBe('LOCKED')
    expect(r.openable('b')).toBe(false)
  })

  it('skips unplayable benchmarks when choosing the entry point', () => {
    const r = run({ ordered: ordered('a:0 b:0 c:1 d:1'), progressRows: [] })
    expect(r.state('a')).toBe('COMING_SOON')
    expect(r.state('b')).toBe('COMING_SOON')
    expect(r.state('c')).toBe('AVAILABLE')
    expect(r.openable('c')).toBe(true)
  })

  it('opens nothing when no benchmark is playable', () => {
    // The whole-course-unbuilt case. Must not throw, and must not fabricate an
    // entry point into a mission with no content.
    const r = run({ ordered: ordered('a:0 b:0'), progressRows: [] })
    expect(r.state('a')).toBe('COMING_SOON')
    expect(r.state('b')).toBe('COMING_SOON')
    expect(r.openable('a')).toBe(false)
    expect(r.openable('b')).toBe(false)
  })

  it('returns an empty map for an empty course', () => {
    expect(computeAvailability({ ordered: [], progressRows: [] }).size).toBe(0)
  })
})

describe('computeAvailability — the original bug', () => {
  it('shows a granted NOT_STARTED mission as AVAILABLE, not locked', () => {
    // THE regression test. unlock.ts grants access by writing NOT_STARTED; the
    // map rendered NOT_STARTED as a padlock. A student who mastered a mission
    // was told to master the mission they had just mastered.
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'MASTERED', b: 'NOT_STARTED' }),
    })
    expect(r.state('b')).toBe('AVAILABLE')
    expect(r.openable('b')).toBe(true)
  })

  it('opens the next mission after mastery even with no row written for it', () => {
    // Teacher MARK_MASTERED sets a terminal status but never calls
    // unlockNextBenchmark. Deriving reachability heals that with no write.
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'MASTERED' }),
    })
    expect(r.state('b')).toBe('AVAILABLE')
    expect(r.openable('b')).toBe(true)
  })
})

describe('computeAvailability — IN_PROGRESS is not a grant', () => {
  it('does NOT open a mission whose only row is IN_PROGRESS with untouched predecessors', () => {
    // The fixture that would have caught the bad first draft of this predicate.
    //
    // `POST /api/mission/progress` upserts an IN_PROGRESS row on any visit, and
    // no server-side gate stops a student typing a mission URL. Under a
    // row-existence rule, visiting a locked mission permanently unlocked it.
    // 'a' here is untouched, so 'c' was never legitimately reached.
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ c: 'IN_PROGRESS' }),
    })
    expect(r.state('c')).toBe('LOCKED')
    expect(r.openable('c')).toBe(false)
  })

  it('still shows IN_PROGRESS when the mission was legitimately reached', () => {
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'MASTERED', b: 'IN_PROGRESS' }),
    })
    expect(r.state('b')).toBe('IN_PROGRESS')
    expect(r.openable('b')).toBe(true)
  })

  it('opens the entry-point mission even when its only row is IN_PROGRESS', () => {
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'IN_PROGRESS' }),
    })
    expect(r.state('a')).toBe('IN_PROGRESS')
    expect(r.openable('a')).toBe(true)
  })
})

describe('computeAvailability — carrying forward', () => {
  it('crosses a unit boundary without a write', () => {
    // `ordered` spans units. Mastering the last benchmark of one unit must open
    // the first of the next; unlock.ts used to scope its search to the unit and
    // return false at the boundary, walling every student inside Unit 1.
    const r = run({
      ordered: ordered('u1a:1 u1b:1 u2a:1'),
      progressRows: rows({ u1a: 'MASTERED', u1b: 'MASTERED' }),
    })
    expect(r.state('u2a')).toBe('AVAILABLE')
    expect(r.openable('u2a')).toBe(true)
  })

  it('steps over unplayable benchmarks to the next playable one', () => {
    const r = run({
      ordered: ordered('a:1 b:0 c:0 d:1'),
      progressRows: rows({ a: 'MASTERED' }),
    })
    expect(r.state('b')).toBe('COMING_SOON')
    expect(r.state('c')).toBe('COMING_SOON')
    expect(r.state('d')).toBe('AVAILABLE')
    expect(r.openable('d')).toBe(true)
  })

  it('stops carrying at a playable mission the student has not cleared', () => {
    // The wall that SHOULD exist. 'b' is available but unfinished, so 'c' waits.
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ a: 'MASTERED' }),
    })
    expect(r.state('b')).toBe('AVAILABLE')
    expect(r.state('c')).toBe('LOCKED')
    expect(r.openable('c')).toBe(false)
  })

  it('does not let an unfinished mission carry just because it has a row', () => {
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ a: 'MASTERED', b: 'NEEDS_REMEDIATION' }),
    })
    expect(r.openable('b')).toBe(true)
    expect(r.state('c')).toBe('LOCKED')
  })

  it('treats an off-ramp (EXPOSURE_COMPLETE) as terminal and carries forward', () => {
    // Off-ramp is explicitly not failure — spec rule #4 says it unlocks the next
    // benchmark. A student who off-ramps must not be stuck.
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'EXPOSURE_COMPLETE' }),
    })
    expect(r.state('b')).toBe('AVAILABLE')
    expect(r.openable('b')).toBe(true)
  })

  it('treats TEACHER_OVERRIDE as terminal and carries forward', () => {
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'TEACHER_OVERRIDE' }),
    })
    expect(r.state('b')).toBe('AVAILABLE')
  })
})

describe('computeAvailability — engine-written work states', () => {
  it.each<StudentProgressStatus>([
    'READY_FOR_MASTERY',
    'NEEDS_REMEDIATION',
    'REMEDIATION_COMPLETE',
    'INTERVENTION_REQUIRED',
  ])('keeps a student with %s in their mission rather than locking them out', (status) => {
    // These can only be written after a server-graded attempt. Locking a student
    // out mid-remediation because of a course re-order would be a real harm, and
    // reaching one of them without a grant means passing the readiness check —
    // demonstrating the content, not bypassing it.
    const r = run({ ordered: ordered('a:1 b:1 c:1'), progressRows: rows({ c: status }) })
    expect(r.state('c')).toBe(status)
    expect(r.openable('c')).toBe(true)
  })
})

describe('computeAvailability — content changes never erase history', () => {
  it('still shows MASTERED when the mission is no longer playable', () => {
    // A teacher flipping readyForStudents off, or content being pulled, must not
    // rewrite what a student already achieved.
    const r = run({ ordered: ordered('a:0 b:1'), progressRows: rows({ a: 'MASTERED' }) })
    expect(r.state('a')).toBe('MASTERED')
  })

  it('closes an unplayable mastered mission rather than linking into missing content', () => {
    const r = run({ ordered: ordered('a:0'), progressRows: rows({ a: 'MASTERED' }) })
    expect(r.openable('a')).toBe(false)
  })

  it('carries forward from a mastered mission even after its content is pulled', () => {
    const r = run({ ordered: ordered('a:0 b:1'), progressRows: rows({ a: 'MASTERED' }) })
    expect(r.state('b')).toBe('AVAILABLE')
  })
})

describe('computeAvailability — state precedence', () => {
  it('reports COMING_SOON, never LOCKED, for a mission with no content', () => {
    // A padlock tells a 12-year-old they have not earned something. When the
    // mission simply does not exist yet, that is a lie about their effort.
    const r = run({ ordered: ordered('a:1 b:0'), progressRows: [] })
    expect(r.state('b')).toBe('COMING_SOON')
  })

  it('never returns a bare NOT_STARTED — it resolves to AVAILABLE or LOCKED', () => {
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ a: 'MASTERED', b: 'NOT_STARTED', c: 'NOT_STARTED' }),
    })
    for (const node of r.raw.values()) {
      expect(node.state).not.toBe('NOT_STARTED')
    }
  })

  it('keeps available / locked / coming-soon mutually exclusive', () => {
    const r = run({
      ordered: ordered('a:1 b:1 c:0 d:1'),
      progressRows: rows({ a: 'MASTERED' }),
    })
    for (const node of r.raw.values()) {
      if (node.state === 'LOCKED' || node.state === 'COMING_SOON') {
        expect(node.openable).toBe(false)
      }
      if (node.state === 'AVAILABLE') {
        expect(node.openable).toBe(true)
      }
    }
  })

  it('preserves course order in the returned map', () => {
    // pickCurrentMissionId walks this map and takes the first actionable node,
    // so insertion order is load-bearing, not incidental.
    const r = run({ ordered: ordered('a:1 b:1 c:1'), progressRows: [] })
    expect([...r.raw.keys()]).toEqual(['a', 'b', 'c'])
  })
})

describe('computeAvailability — ignores irrelevant rows', () => {
  it('ignores progress rows for benchmarks outside the active course', () => {
    const r = run({
      ordered: ordered('a:1'),
      progressRows: rows({ a: 'NOT_STARTED', 'retired-benchmark': 'MASTERED' }),
    })
    expect(r.raw.size).toBe(1)
    expect(r.state('a')).toBe('AVAILABLE')
  })
})

describe('pickCurrentMissionId', () => {
  // This is what makes the dashboard and the map agree. The dashboard used to
  // run its own "first IN_PROGRESS, else first NOT_STARTED" query, which is how
  // it ended up linking to a mission the map was drawing as locked.
  it('picks the entry-point mission for a brand-new student', () => {
    const r = run({ ordered: ordered('a:1 b:1'), progressRows: [] })
    expect(pickCurrentMissionId(r.raw)).toBe('a')
  })

  it('picks the earliest mission the student can still act on', () => {
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ a: 'MASTERED', b: 'NEEDS_REMEDIATION' }),
    })
    expect(pickCurrentMissionId(r.raw)).toBe('b')
  })

  it('skips finished missions rather than sending the student backwards', () => {
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ a: 'MASTERED', b: 'MASTERED' }),
    })
    expect(pickCurrentMissionId(r.raw)).toBe('c')
  })

  it('skips an off-ramped mission — it is done, not pending', () => {
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'EXPOSURE_COMPLETE' }),
    })
    expect(pickCurrentMissionId(r.raw)).toBe('b')
  })

  it('never points at a mission the student cannot open', () => {
    const r = run({ ordered: ordered('a:1 b:1 c:1'), progressRows: [] })
    const picked = pickCurrentMissionId(r.raw)
    expect(r.raw.get(picked!)?.openable).toBe(true)
  })

  it('returns null when the whole course is finished', () => {
    const r = run({
      ordered: ordered('a:1 b:1'),
      progressRows: rows({ a: 'MASTERED', b: 'MASTERED' }),
    })
    expect(pickCurrentMissionId(r.raw)).toBeNull()
  })

  it('returns null when nothing is playable yet', () => {
    // Must not hand the hero card a mission with no content behind it.
    const r = run({ ordered: ordered('a:0 b:0'), progressRows: [] })
    expect(pickCurrentMissionId(r.raw)).toBeNull()
  })

  it('ignores an ungranted IN_PROGRESS row when choosing', () => {
    const r = run({
      ordered: ordered('a:1 b:1 c:1'),
      progressRows: rows({ c: 'IN_PROGRESS' }),
    })
    // 'c' was never reached, so the student's current mission is still the entry point.
    expect(pickCurrentMissionId(r.raw)).toBe('a')
  })
})
