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
  isClassHideableStepType,
  CLASS_HIDEABLE_STEP_TYPES,
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

describe('class-scoped hideability (ADR 0023)', () => {
  it('accepts every step type — a class-scoped hide is local and reversible', () => {
    for (const t of CLASS_HIDEABLE_STEP_TYPES) {
      expect(isClassHideableStepType(t)).toBe(true)
    }
    expect(CLASS_HIDEABLE_STEP_TYPES).toHaveLength(10)
  })

  it('is strictly wider than the global kill-switch, which stays media-only', () => {
    for (const t of TOGGLEABLE_STEP_TYPES) {
      expect(isClassHideableStepType(t)).toBe(true)
    }
    // The asymmetry that matters: a NOTE may be hidden for ONE class but never
    // switched off for every class on the platform.
    expect(isClassHideableStepType('NOTE')).toBe(true)
    expect(isToggleableStepType('NOTE')).toBe(false)
  })

  it('rejects an unknown type', () => {
    expect(isClassHideableStepType('NOT_A_STEP_TYPE')).toBe(false)
  })
})
