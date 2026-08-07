import {
  resolveClassLessonSteps,
  resolveEffectiveSteps,
  type BuiltInStepInput,
  type ClassStepInput,
  type StepOverride,
} from '@/lib/lesson-content/content-resolution'
import { toClassStepViewId } from '@/lib/lesson-content/class-outline'

const C = (id: string) => toClassStepViewId(id)

function builtIn(id: string, over: Partial<BuiltInStepInput> = {}): BuiltInStepInput {
  return {
    id,
    stepType: 'NOTE',
    title: `${id} title`,
    content: `${id} content`,
    sequenceOrder: 1,
    required: true,
    enabled: true,
    ...over,
  }
}

function classStep(id: string, over: Partial<ClassStepInput> = {}): ClassStepInput {
  return {
    id: C(id),
    anchorLessonStepId: null,
    anchorPosition: 'AFTER',
    stepType: 'NOTE',
    title: `${id} title`,
    content: `${id} content`,
    required: false,
    visible: true,
    ...over,
  }
}

const NO_OVERRIDE: ReadonlyMap<string, StepOverride> = new Map()

function override(over: Partial<StepOverride> = {}): StepOverride {
  return { visible: null, overrideTitle: null, overrideContent: null, ...over }
}

describe('resolveClassLessonSteps — equivalence with the legacy resolver', () => {
  // THE EQUIVALENCE LOCK. A class with no modules of its own and no saved
  // order must see byte-identical content to what resolveEffectiveSteps
  // produced before this feature existed. If this fails, the migration to the
  // new resolver silently changed every existing class's lesson.
  const steps = [
    builtIn('a', { enabled: true, sequenceOrder: 1 }),
    builtIn('b', { enabled: false, sequenceOrder: 2 }),
    builtIn('c', { enabled: true, sequenceOrder: 3 }),
    builtIn('d', { enabled: true, sequenceOrder: 4 }),
  ]

  const overrideMatrix: Array<[string, ReadonlyMap<string, StepOverride>]> = [
    ['no overrides', NO_OVERRIDE],
    ['hide a visible step', new Map([['a', override({ visible: false })]])],
    ['show a disabled step', new Map([['b', override({ visible: true })]])],
    ['content only', new Map([['c', override({ overrideTitle: 'T', overrideContent: 'X' })]])],
    [
      'hidden + content (content must not surface)',
      new Map([['c', override({ visible: false, overrideTitle: 'T', overrideContent: 'X' })]]),
    ],
    [
      'title only, content inherited',
      new Map([['d', override({ overrideTitle: 'Only title' })]]),
    ],
    [
      'several at once',
      new Map([
        ['a', override({ visible: false })],
        ['b', override({ visible: true, overrideContent: 'B!' })],
        ['d', override({ overrideTitle: 'D!' })],
      ]),
    ],
  ]

  it.each(overrideMatrix)('matches resolveEffectiveSteps: %s', (_label, overrides) => {
    const legacy = resolveEffectiveSteps([...steps], overrides)
    const next = resolveClassLessonSteps({ builtInSteps: steps, overrides })

    expect(next.map((s) => s.id)).toEqual(legacy.map((s) => s.id))
    expect(next.map((s) => s.title)).toEqual(legacy.map((s) => s.title))
    expect(next.map((s) => s.content)).toEqual(legacy.map((s) => s.content))
  })

  it('marks every step as built-in when a class has none of its own', () => {
    const next = resolveClassLessonSteps({ builtInSteps: steps, overrides: NO_OVERRIDE })
    expect(next.every((s) => s.origin === 'BUILTIN')).toBe(true)
  })

  it('renumbers sequenceOrder to list position, closing gaps left by hidden steps', () => {
    // The one intentional divergence from the raw DB value.
    const next = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: new Map([['b', override({ visible: false })]]),
    })
    expect(next.map((s) => s.sequenceOrder)).toEqual([1, 2, 3])
  })
})

describe('resolveClassLessonSteps — class modules', () => {
  const steps = [builtIn('a'), builtIn('b')]

  it('places a class module at its anchor and tags its origin', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: NO_OVERRIDE,
      classSteps: [classStep('x', { anchorLessonStepId: 'a' })],
    })
    expect(result.map((s) => s.id)).toEqual(['a', C('x'), 'b'])
    expect(result.map((s) => s.origin)).toEqual(['BUILTIN', 'CLASS', 'BUILTIN'])
  })

  it('honours a saved order over the anchor', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: NO_OVERRIDE,
      classSteps: [classStep('x', { anchorLessonStepId: 'a' })],
      savedOrder: [C('x'), 'b', 'a'],
    })
    expect(result.map((s) => s.id)).toEqual([C('x'), 'b', 'a'])
  })

  it('filters out a class module the teacher hid', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: NO_OVERRIDE,
      classSteps: [classStep('x', { anchorLessonStepId: 'a', visible: false })],
    })
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('carries the class module content through untouched', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: NO_OVERRIDE,
      classSteps: [
        classStep('x', { stepType: 'IMAGE', title: 'My picture', content: '{"a":1}' }),
      ],
    })
    const mine = result.find((s) => s.origin === 'CLASS')
    expect(mine).toMatchObject({ stepType: 'IMAGE', title: 'My picture', content: '{"a":1}' })
  })

  it('numbers a mixed list contiguously', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: NO_OVERRIDE,
      classSteps: [classStep('x', { anchorLessonStepId: 'a' })],
    })
    expect(result.map((s) => s.sequenceOrder)).toEqual([1, 2, 3])
  })

  it('skips a stale id in the saved order rather than throwing', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: NO_OVERRIDE,
      savedOrder: ['a', 'ghost', 'b'],
    })
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('keeps hidden modules only when the caller asks (teacher builder)', () => {
    const overrides = new Map([['a', override({ visible: false })]])
    const classSteps = [classStep('x', { visible: false })]

    // Student path: hidden means gone.
    const student = resolveClassLessonSteps({ builtInSteps: steps, overrides, classSteps })
    expect(student.map((s) => s.id)).toEqual(['b'])

    // Builder path: present, flagged, so "show again" can be offered.
    const builder = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides,
      classSteps,
      includeHidden: true,
    })
    expect(builder.map((s) => s.id)).toEqual(['a', 'b', C('x')])
    expect(builder.map((s) => s.hidden)).toEqual([true, false, true])
  })

  it('flags a built-in module whose content this class replaced', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: steps,
      overrides: new Map([['a', override({ overrideContent: 'mine' })]]),
    })
    expect(result.find((s) => s.id === 'a')?.edited).toBe(true)
    expect(result.find((s) => s.id === 'b')?.edited).toBe(false)
  })

  it('resolves a lesson made entirely of teacher modules', () => {
    const result = resolveClassLessonSteps({
      builtInSteps: [],
      overrides: NO_OVERRIDE,
      classSteps: [classStep('x'), classStep('y')],
    })
    expect(result.map((s) => s.id)).toEqual([C('x'), C('y')])
  })
})
