import {
  validateAndSerializeStepContent,
  LessonEditorValidationError,
} from '@/lib/lesson-editor/content-schema'

const VALID_PAYLOADS: Record<string, unknown> = {
  VIDEO: { youtubeId: 'dQw4w9WgXcQ', title: 'A video', description: 'A description that is long enough.' },
  IMAGE: {
    asset: 'svg:crown-vs-law',
    alt: 'test',
    caption: 'caption',
    credit: 'credit',
    license: 'Public domain',
    longDescription: 'A long description of the image that satisfies the contract minimum.',
  },
  DIAGRAM: {
    variant: 'flow',
    title: 'A flow diagram',
    summary: 'A summary of the diagram that is at least forty characters long.',
    nodes: [{ label: 'Step 1' }, { label: 'Step 2' }],
  },
  INFOGRAPHIC: {
    title: 'An infographic',
    summary: 'A summary of the infographic that is at least forty characters long.',
    blocks: [
      { type: 'big-number', value: '13', label: 'Colonies' },
      { type: 'fact', icon: 'star', text: 'A fact' },
    ],
  },
  WORKED_EXAMPLE: {
    problem: 'A problem',
    thinkAloud: ['Step one', 'Step two'],
    answer: 'The answer',
    whyItWorks: 'Why it works',
  },
  INTERACTIVE_CHECK: {
    question: 'A question?',
    options: [
      { text: 'A', correct: true, feedback: 'Right' },
      { text: 'B', correct: false, feedback: 'Wrong' },
      { text: 'C', correct: false, feedback: 'Wrong' },
      { text: 'D', correct: false, feedback: 'Wrong' },
    ],
  },
  SOURCE_ANALYSIS: {
    sourceTitle: 'A source',
    sourceAttribution: 'Some author',
    passage: 'A passage of text.',
    guidingQuestions: [
      {
        question: 'A guiding question?',
        options: [
          { text: 'A', correct: true, feedback: 'Right' },
          { text: 'B', correct: false, feedback: 'Wrong' },
          { text: 'C', correct: false, feedback: 'Wrong' },
        ],
      },
    ],
  },
  NOTE: { text: 'Some note text.' },
  VOCABULARY: { text: 'Some vocab text.' },
  DISCUSSION: { text: 'Some discussion text.' },
}

const MALFORMED_PAYLOADS: Record<string, unknown> = {
  VIDEO: { youtubeId: 'too-short', title: '', description: 'x' },
  IMAGE: { asset: 'not-a-valid-asset', alt: '', caption: '', credit: '', license: '', longDescription: 'x' },
  DIAGRAM: { variant: 'flow', title: '', summary: 'x', nodes: [] },
  INFOGRAPHIC: { title: '', summary: 'x', blocks: [] },
  WORKED_EXAMPLE: { problem: '', thinkAloud: [], answer: '', whyItWorks: '' },
  INTERACTIVE_CHECK: { question: '', options: [] },
  SOURCE_ANALYSIS: { sourceTitle: '', sourceAttribution: '', passage: '', guidingQuestions: [] },
  NOTE: { text: '' },
  VOCABULARY: { text: '' },
  DISCUSSION: { text: '' },
}

const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch
})

afterAll(() => {
  global.fetch = originalFetch
})

describe('validateAndSerializeStepContent', () => {
  it.each(Object.keys(VALID_PAYLOADS))('accepts a valid %s payload', async (stepType) => {
    const content = await validateAndSerializeStepContent(stepType, VALID_PAYLOADS[stepType])
    expect(typeof content).toBe('string')
  })

  it.each(Object.keys(MALFORMED_PAYLOADS))('rejects a malformed %s payload', async (stepType) => {
    await expect(
      validateAndSerializeStepContent(stepType, MALFORMED_PAYLOADS[stepType])
    ).rejects.toThrow(LessonEditorValidationError)
  })

  it('rejects an unknown step type', async () => {
    await expect(validateAndSerializeStepContent('NOT_A_TYPE', {})).rejects.toThrow(
      LessonEditorValidationError
    )
  })

  it('serializes NOTE timeline content as JSON with kind:"timeline"', async () => {
    const content = await validateAndSerializeStepContent('NOTE', {
      kind: 'timeline',
      connector: 'line',
      events: [{ marker: '1215', label: 'A' }, { marker: '1776', label: 'B' }, { marker: '1789', label: 'C' }],
    })
    expect(JSON.parse(content)).toMatchObject({ kind: 'timeline' })
  })

  it('serializes plain NOTE/VOCABULARY/DISCUSSION content as the raw string, not JSON', async () => {
    const content = await validateAndSerializeStepContent('NOTE', { text: 'Plain text.' })
    expect(content).toBe('Plain text.')
  })
})
