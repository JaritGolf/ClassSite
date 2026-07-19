import { resolveEffectiveSteps, type StepOverride } from '@/lib/lesson-content/content-resolution'

interface Step {
  id: string
  enabled: boolean
  title: string
  content: string
}

const NO_OVERRIDE: ReadonlyMap<string, StepOverride> = new Map()

function step(id: string, enabled = true, title = 'Default title', content = 'default'): Step {
  return { id, enabled, title, content }
}

describe('resolveEffectiveSteps', () => {
  it('no override: falls back to the step\'s own enabled/title/content', () => {
    const steps = [step('a', true, 'A', 'a-content')]
    expect(resolveEffectiveSteps(steps, NO_OVERRIDE)).toEqual(steps)
  })

  it('visibility-only override: hides a globally-enabled step, content unchanged', () => {
    const steps = [step('a', true, 'A', 'a-content')]
    const overrides = new Map<string, StepOverride>([
      ['a', { visible: false, overrideTitle: null, overrideContent: null }],
    ])
    expect(resolveEffectiveSteps(steps, overrides)).toEqual([])
  })

  it('visibility-only override: shows a globally-disabled step, content unchanged', () => {
    const steps = [step('a', false, 'A', 'a-content')]
    const overrides = new Map<string, StepOverride>([
      ['a', { visible: true, overrideTitle: null, overrideContent: null }],
    ])
    const result = resolveEffectiveSteps(steps, overrides)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'A', content: 'a-content' })
  })

  it('content-only override: substitutes title/content on a visible step, visibility untouched', () => {
    const steps = [step('a', true, 'A', 'a-content')]
    const overrides = new Map<string, StepOverride>([
      ['a', { visible: null, overrideTitle: 'Overridden title', overrideContent: 'overridden-content' }],
    ])
    const result = resolveEffectiveSteps(steps, overrides)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'Overridden title', content: 'overridden-content' })
  })

  it('both axes: a class-hidden step never surfaces even with a content override', () => {
    const steps = [step('a', true, 'A', 'a-content')]
    const overrides = new Map<string, StepOverride>([
      ['a', { visible: false, overrideTitle: 'Overridden title', overrideContent: 'overridden-content' }],
    ])
    expect(resolveEffectiveSteps(steps, overrides)).toEqual([])
  })

  it('both axes: a visible step with a content override shows the override', () => {
    const steps = [step('a', false, 'A', 'a-content')]
    const overrides = new Map<string, StepOverride>([
      ['a', { visible: true, overrideTitle: 'Overridden title', overrideContent: 'overridden-content' }],
    ])
    const result = resolveEffectiveSteps(steps, overrides)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'Overridden title', content: 'overridden-content' })
  })

  it('preserves step order', () => {
    const steps = [step('a'), step('b'), step('c')]
    expect(resolveEffectiveSteps(steps, NO_OVERRIDE).map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })
})
