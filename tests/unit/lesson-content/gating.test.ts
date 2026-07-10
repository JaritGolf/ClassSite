/**
 * Mission-flow step gating (pure) — trainingStepsOf / stepNeedsAttempt / canAdvance.
 */

import {
  trainingStepsOf,
  vocabStepsOf,
  scenarioStepsOf,
  stepNeedsAttempt,
  canAdvance,
  type LessonStepLike,
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
  ]

  it('trainingStepsOf keeps NOTE/WORKED_EXAMPLE/INTERACTIVE_CHECK/VIDEO in order', () => {
    expect(trainingStepsOf(steps).map((s) => s.id)).toEqual(['a', 'c', 'd', 'f'])
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
})
