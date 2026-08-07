import {
  CLASS_STEP_ID_PREFIX,
  fromClassStepViewId,
  isClassStepViewId,
  reconcileClassOutline,
  toClassStepViewId,
  type ClassStepAnchorInfo,
} from '@/lib/lesson-content/class-outline'

/** A class step anchored AFTER `anchor` (or appended when anchor is null). */
function cls(
  id: string,
  anchor: string | null = null,
  position: 'BEFORE' | 'AFTER' = 'AFTER'
): ClassStepAnchorInfo {
  return { id: toClassStepViewId(id), anchorLessonStepId: anchor, anchorPosition: position }
}

const C = (id: string) => toClassStepViewId(id)

describe('class-step id namespace', () => {
  it('round-trips', () => {
    expect(fromClassStepViewId(toClassStepViewId('abc123'))).toBe('abc123')
  })

  it('cannot collide with a real LessonStep id — a cuid has no colon', () => {
    // Both id shapes actually used by the app: seeded positional ids and cuids.
    expect(isClassStepViewId('lstep-SS7CG11-03')).toBe(false)
    expect(isClassStepViewId('clh8x2k9v0000abcd1234efgh')).toBe(false)
    expect(isClassStepViewId(`${CLASS_STEP_ID_PREFIX}clh8x2k9v0000abcd1234efgh`)).toBe(true)
  })
})

describe('reconcileClassOutline — no saved opinion', () => {
  it('returns the built-in order verbatim and never reports a change', () => {
    // THE PRISTINE-BEHAVIOUR LOCK. If this ever fails, every class that has
    // not touched its lesson has silently changed.
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b', 'c'],
      classSteps: [],
      savedOrder: null,
    })
    expect(result.order).toEqual(['a', 'b', 'c'])
    expect(result.changed).toBe(false)
    expect(result.inserted).toEqual([])
    expect(result.dropped).toEqual([])
  })

  it('splices class steps at their anchors', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b', 'c'],
      classSteps: [cls('x', 'a'), cls('y', 'c', 'BEFORE')],
      savedOrder: null,
    })
    expect(result.order).toEqual(['a', C('x'), 'b', C('y'), 'c'])
    expect(result.changed).toBe(false)
  })

  it('appends a class step with no anchor', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [cls('x', null)],
      savedOrder: null,
    })
    expect(result.order).toEqual(['a', 'b', C('x')])
  })

  it('keeps createdAt order when two class steps share one AFTER anchor', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [cls('first', 'a'), cls('second', 'a')],
      savedOrder: null,
    })
    expect(result.order).toEqual(['a', C('first'), C('second'), 'b'])
  })

  it('keeps createdAt order when two class steps share one BEFORE anchor', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [cls('first', 'b', 'BEFORE'), cls('second', 'b', 'BEFORE')],
      savedOrder: null,
    })
    expect(result.order).toEqual(['a', C('first'), C('second'), 'b'])
  })

  it('appends rather than dropping when the anchor no longer exists', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [cls('x', 'deleted-step')],
      savedOrder: null,
    })
    expect(result.order).toEqual(['a', 'b', C('x')])
  })

  it('handles a lesson with no built-in steps at all', () => {
    const result = reconcileClassOutline({
      builtInIds: [],
      classSteps: [cls('x'), cls('y')],
      savedOrder: null,
    })
    expect(result.order).toEqual([C('x'), C('y')])
  })
})

describe('reconcileClassOutline — a saved order exists', () => {
  it('honours the teacher order when nothing changed', () => {
    const saved = ['c', 'a', 'b']
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b', 'c'],
      classSteps: [],
      savedOrder: saved,
    })
    expect(result.order).toEqual(saved)
    // Proves a student read can never trigger a write.
    expect(result.changed).toBe(false)
  })

  it('re-inserts a step seeded MID-LESSON in the middle, not at the end', () => {
    // The load-bearing requirement: next term's new material must not land
    // after the debrief for a teacher who arranged their lesson.
    const result = reconcileClassOutline({
      builtInIds: ['a', 'NEW', 'b', 'c'],
      classSteps: [],
      savedOrder: ['a', 'b', 'c'],
    })
    expect(result.order).toEqual(['a', 'NEW', 'b', 'c'])
    expect(result.inserted).toEqual(['NEW'])
    expect(result.changed).toBe(true)
  })

  it('re-inserts a step seeded at the very front, at the front', () => {
    const result = reconcileClassOutline({
      builtInIds: ['NEW', 'a', 'b'],
      classSteps: [],
      savedOrder: ['a', 'b'],
    })
    expect(result.order).toEqual(['NEW', 'a', 'b'])
  })

  it('re-inserts a step seeded at the end, at the end', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b', 'NEW'],
      classSteps: [],
      savedOrder: ['a', 'b'],
    })
    expect(result.order).toEqual(['a', 'b', 'NEW'])
  })

  it('keeps a run of adjacent new steps in their own relative order', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'N1', 'N2', 'N3', 'b'],
      classSteps: [],
      savedOrder: ['a', 'b'],
    })
    expect(result.order).toEqual(['a', 'N1', 'N2', 'N3', 'b'])
  })

  it('follows TEACHER intent, not global index, when placing a new step', () => {
    // Teacher moved 'a' to the front. A step seeded right after 'a' globally
    // lands right after 'a' where the teacher put it — not at global position 1.
    const result = reconcileClassOutline({
      builtInIds: ['x', 'a', 'NEW', 'b'],
      classSteps: [],
      savedOrder: ['a', 'x', 'b'],
    })
    expect(result.order).toEqual(['a', 'NEW', 'x', 'b'])
  })

  it('drops ids that no longer exist', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'c'],
      classSteps: [],
      savedOrder: ['a', 'GONE', 'c'],
    })
    expect(result.order).toEqual(['a', 'c'])
    expect(result.dropped).toEqual(['GONE'])
    expect(result.changed).toBe(true)
  })

  it('restores the full spine from an empty saved order — order is not a hiding axis', () => {
    // A corrupt or empty array must never read as "hide everything".
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b', 'c'],
      classSteps: [cls('x', 'b')],
      savedOrder: [],
    })
    expect(result.order).toEqual(['a', 'b', C('x'), 'c'])
    expect(result.changed).toBe(true)
  })

  it('keeps only the first occurrence of a duplicated id', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [],
      savedOrder: ['a', 'b', 'a'],
    })
    expect(result.order).toEqual(['a', 'b'])
    expect(result.changed).toBe(true)
  })

  it('splices a class step missing from the saved order at its anchor', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [cls('x', 'a')],
      savedOrder: ['a', 'b'],
    })
    expect(result.order).toEqual(['a', C('x'), 'b'])
    expect(result.inserted).toEqual([C('x')])
  })

  it('keeps a class step where the teacher put it, ignoring its anchor', () => {
    // The anchor is reconstruction metadata only — a saved position wins.
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b', 'c'],
      classSteps: [cls('x', 'a')],
      savedOrder: ['a', 'b', C('x'), 'c'],
    })
    expect(result.order).toEqual(['a', 'b', C('x'), 'c'])
    expect(result.changed).toBe(false)
  })

  it('keeps a class step in place when its anchor step is deleted', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'c'],
      classSteps: [cls('x', 'DELETED')],
      savedOrder: ['a', C('x'), 'c'],
    })
    expect(result.order).toEqual(['a', C('x'), 'c'])
    expect(result.changed).toBe(false)
  })

  it('drops a deleted class step', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a'],
      classSteps: [],
      savedOrder: ['a', C('gone')],
    })
    expect(result.order).toEqual(['a'])
    expect(result.dropped).toEqual([C('gone')])
  })

  it('restores built-ins even when only class steps survived the saved order', () => {
    const result = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [cls('x', null)],
      savedOrder: [C('x')],
    })
    expect(result.order).toEqual(['a', 'b', C('x')])
    expect(new Set(result.inserted)).toEqual(new Set(['a', 'b']))
  })
})

describe('reconcileClassOutline — contract', () => {
  const input = {
    builtInIds: ['a', 'NEW', 'b'] as const,
    classSteps: [cls('x', 'a')],
    savedOrder: ['b', 'a'] as const,
  }

  it('is deterministic', () => {
    const first = reconcileClassOutline({ ...input })
    const second = reconcileClassOutline({ ...input })
    expect(first).toEqual(second)
  })

  it('does not mutate its inputs', () => {
    const builtInIds = ['a', 'NEW', 'b']
    const savedOrder = ['b', 'a']
    const classSteps = [cls('x', 'a')]
    reconcileClassOutline({ builtInIds, classSteps, savedOrder })
    expect(builtInIds).toEqual(['a', 'NEW', 'b'])
    expect(savedOrder).toEqual(['b', 'a'])
    expect(classSteps).toEqual([cls('x', 'a')])
  })

  it('returns every live id exactly once', () => {
    const { order } = reconcileClassOutline({ ...input })
    expect(new Set(order)).toEqual(new Set(['a', 'NEW', 'b', C('x')]))
    expect(order).toHaveLength(4)
  })

  it('reports changed=false exactly when the order matches what was saved', () => {
    const stable = reconcileClassOutline({
      builtInIds: ['a', 'b'],
      classSteps: [],
      savedOrder: ['a', 'b'],
    })
    expect(stable.changed).toBe(false)
    expect(stable.order).toEqual(['a', 'b'])
  })
})
