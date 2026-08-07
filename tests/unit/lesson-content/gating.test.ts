/**
 * Mission-flow step gating (pure) — trainingStepsOf / stepNeedsAttempt / canAdvance.
 */

import {
  trainingStepsOf,
  vocabStepsOf,
  scenarioStepsOf,
  stepNeedsAttempt,
  canAdvance,
  withResumeAnchors,
  type LessonStepLike,
  type StepOrigin,
} from '@/lib/lesson-content'

const CHECK_JSON = JSON.stringify({
  question: 'Q?',
  options: [
    { text: 'a', correct: true, feedback: 'y' },
    { text: 'b', correct: false, feedback: 'n' },
    { text: 'c', correct: false, feedback: 'n' },
    { text: 'd', correct: false, feedback: 'n' },
  ],
})

function step(overrides: Partial<LessonStepLike>): LessonStepLike {
  return {
    id: 's1',
    stepType: 'NOTE',
    title: 'T',
    content: 'text',
    sequenceOrder: 1,
    required: true,
    ...overrides,
  }
}

describe('step filters', () => {
  const steps: LessonStepLike[] = [
    step({ id: 'a', stepType: 'NOTE', sequenceOrder: 1 }),
    step({ id: 'b', stepType: 'VOCABULARY', sequenceOrder: 2 }),
    step({ id: 'c', stepType: 'WORKED_EXAMPLE', sequenceOrder: 3 }),
    step({ id: 'd', stepType: 'INTERACTIVE_CHECK', sequenceOrder: 4, content: CHECK_JSON }),
    step({ id: 'e', stepType: 'SOURCE_ANALYSIS', sequenceOrder: 5 }),
    step({ id: 'f', stepType: 'VIDEO', sequenceOrder: 6 }),
    step({ id: 'g', stepType: 'IMAGE', sequenceOrder: 7 }),
    step({ id: 'h', stepType: 'DIAGRAM', sequenceOrder: 8 }),
    step({ id: 'i', stepType: 'INFOGRAPHIC', sequenceOrder: 9 }),
  ]

  it('trainingStepsOf keeps NOTE/WORKED_EXAMPLE/INTERACTIVE_CHECK + media types in order', () => {
    expect(trainingStepsOf(steps).map((s) => s.id)).toEqual(['a', 'c', 'd', 'f', 'g', 'h', 'i'])
  })

  it('vocabStepsOf keeps only VOCABULARY', () => {
    expect(vocabStepsOf(steps).map((s) => s.id)).toEqual(['b'])
  })

  it('scenarioStepsOf keeps only SOURCE_ANALYSIS', () => {
    expect(scenarioStepsOf(steps).map((s) => s.id)).toEqual(['e'])
  })
})

describe('stepNeedsAttempt / canAdvance', () => {
  it('a required, well-formed interactive check gates until attempted', () => {
    const s = step({ stepType: 'INTERACTIVE_CHECK', content: CHECK_JSON, required: true })
    expect(stepNeedsAttempt(s)).toBe(true)
    expect(canAdvance(s, new Set())).toBe(false)
    expect(canAdvance(s, new Set(['s1']))).toBe(true)
  })

  it('an optional check never gates', () => {
    const s = step({ stepType: 'INTERACTIVE_CHECK', content: CHECK_JSON, required: false })
    expect(stepNeedsAttempt(s)).toBe(false)
    expect(canAdvance(s, new Set())).toBe(true)
  })

  it('a malformed check degrades to text and never gates', () => {
    const s = step({ stepType: 'INTERACTIVE_CHECK', content: 'broken json', required: true })
    expect(stepNeedsAttempt(s)).toBe(false)
    expect(canAdvance(s, new Set())).toBe(true)
  })

  it('notes and worked examples never gate', () => {
    expect(canAdvance(step({ stepType: 'NOTE' }), new Set())).toBe(true)
    expect(canAdvance(step({ stepType: 'WORKED_EXAMPLE' }), new Set())).toBe(true)
  })

  it('media steps never gate, even when required', () => {
    for (const stepType of ['VIDEO', 'IMAGE', 'DIAGRAM', 'INFOGRAPHIC']) {
      const s = step({ stepType, required: true })
      expect(stepNeedsAttempt(s)).toBe(false)
      expect(canAdvance(s, new Set())).toBe(true)
    }
  })
})

describe('withResumeAnchors', () => {
  function node(id: string, origin: StepOrigin, stepType = 'NOTE'): LessonStepLike & {
    origin: StepOrigin
  } {
    return { id, stepType, title: id, content: id, sequenceOrder: 1, required: false, origin }
  }

  it('a built-in step reports itself', () => {
    const [a] = withResumeAnchors([node('a', 'BUILTIN')])
    expect(a.progressStepId).toBe('a')
  })

  it('a teacher module reports the nearest preceding built-in', () => {
    const result = withResumeAnchors([
      node('a', 'BUILTIN'),
      node('cstep:x', 'CLASS'),
      node('cstep:y', 'CLASS'),
      node('b', 'BUILTIN'),
    ])
    expect(result.map((s) => s.progressStepId)).toEqual(['a', 'a', 'a', 'b'])
  })

  it('a teacher module before every built-in reports null', () => {
    const result = withResumeAnchors([node('cstep:x', 'CLASS'), node('a', 'BUILTIN')])
    expect(result.map((s) => s.progressStepId)).toEqual([null, 'a'])
  })

  it('anchors are BUCKET-LOCAL, so the anchor always resolves inside its own bucket', () => {
    // REGRESSION GUARD. MissionFlow resolves the saved pointer with
    // trainingSteps.findIndex(s => s.id === resumeStepId). If the anchor were
    // taken from the whole lesson it could be a VOCABULARY step — absent from
    // the training bucket — findIndex would return -1, and the student would
    // be silently dropped back to the first training step.
    const lesson = [
      node('note-1', 'BUILTIN', 'NOTE'),
      node('vocab-1', 'BUILTIN', 'VOCABULARY'),
      node('cstep:mine', 'CLASS', 'NOTE'),
    ]

    const training = withResumeAnchors(trainingStepsOf(lesson))
    const anchor = training.find((s) => s.id === 'cstep:mine')?.progressStepId

    expect(anchor).toBe('note-1')
    expect(anchor).not.toBe('vocab-1')
    // The whole point: the anchor is findable in the bucket it was computed for.
    expect(training.findIndex((s) => s.id === anchor)).toBeGreaterThanOrEqual(0)
  })

  it('preserves order, length and every original field', () => {
    const input = [node('a', 'BUILTIN'), node('cstep:x', 'CLASS')]
    const result = withResumeAnchors(input)
    expect(result.map((s) => s.id)).toEqual(['a', 'cstep:x'])
    expect(result[1]).toMatchObject({ stepType: 'NOTE', origin: 'CLASS', title: 'cstep:x' })
  })

  it('bucketing passes origin straight through, so anchors can be computed after it', () => {
    const lesson = [
      node('a', 'BUILTIN', 'NOTE'),
      node('cstep:x', 'CLASS', 'SOURCE_ANALYSIS'),
      node('b', 'BUILTIN', 'VOCABULARY'),
    ]
    expect(trainingStepsOf(lesson).map((s) => s.origin)).toEqual(['BUILTIN'])
    expect(scenarioStepsOf(lesson).map((s) => s.origin)).toEqual(['CLASS'])
    expect(vocabStepsOf(lesson).map((s) => s.origin)).toEqual(['BUILTIN'])
  })
})
