/**
 * Lesson-step visibility resolution (pure) — ADR 0015.
 *
 * Effective visibility = per-class override ?? global `enabled`. Only media
 * step types are toggleable (enforced server-side by the lesson-media lib).
 */

import {
  resolveVisibleSteps,
  isToggleableStepType,
  TOGGLEABLE_STEP_TYPES,
} from '@/lib/lesson-content'

interface Step {
  id: string
  enabled: boolean
  sequenceOrder: number
}

const steps: Step[] = [
  { id: 'a', enabled: true, sequenceOrder: 1 },
  { id: 'b', enabled: false, sequenceOrder: 2 },
  { id: 'c', enabled: true, sequenceOrder: 3 },
]

describe('resolveVisibleSteps', () => {
  it('with no overrides, honors the global enabled flag both ways', () => {
    expect(resolveVisibleSteps(steps, new Map()).map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('a `show` override beats a globally disabled step', () => {
    const shown = resolveVisibleSteps(steps, new Map([['b', true]]))
    expect(shown.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('a `hide` override beats a globally enabled step', () => {
    const shown = resolveVisibleSteps(steps, new Map([['c', false]]))
    expect(shown.map((s) => s.id)).toEqual(['a'])
  })

  it('preserves step order and does not mutate the input', () => {
    const input = [...steps]
    const shown = resolveVisibleSteps(input, new Map([['b', true]]))
    expect(shown.map((s) => s.sequenceOrder)).toEqual([1, 2, 3])
    expect(input).toHaveLength(3)
  })

  it('overrides for unknown step ids are ignored', () => {
    const shown = resolveVisibleSteps(steps, new Map([['zzz', false]]))
    expect(shown.map((s) => s.id)).toEqual(['a', 'c'])
  })
})

describe('isToggleableStepType', () => {
  it('allows exactly the media step types', () => {
    expect([...TOGGLEABLE_STEP_TYPES]).toEqual(['VIDEO', 'IMAGE', 'DIAGRAM', 'INFOGRAPHIC'])
    for (const t of TOGGLEABLE_STEP_TYPES) expect(isToggleableStepType(t)).toBe(true)
  })

  it('rejects core instructional types', () => {
    for (const t of [
      'NOTE',
      'INTERACTIVE_CHECK',
      'WORKED_EXAMPLE',
      'VOCABULARY',
      'SOURCE_ANALYSIS',
      'DISCUSSION',
    ]) {
      expect(isToggleableStepType(t)).toBe(false)
    }
  })
})
