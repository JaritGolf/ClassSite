/**
 * Composite modules — an ordered stack of content pieces in ONE module.
 *
 * The load-bearing property is ADDITIVITY: composite must change nothing about
 * how any existing content parses. The second is the content/question
 * separation — a composite may never carry something a student must answer,
 * which is what lets gating.ts stay ignorant of blocks entirely.
 */

import {
  CompositeSchema,
  ContentBlockSchema,
  COMPOSITE_CAPABLE_STEP_TYPES,
  isCompositeCapableStepType,
  parseStepContent,
  stepNeedsAttempt,
} from '@/lib/lesson-content'

const TEXT_BLOCK = { type: 'text', data: { text: 'The colonists had assemblies of their own.' } }

const IMAGE_BLOCK = {
  type: 'image',
  data: {
    asset: 'svg:crown-vs-law',
    alt: 'A colonial assembly meeting',
    caption: 'The House of Burgesses',
    credit: 'Public domain',
    license: 'Public domain',
    longDescription:
      'A painting showing colonial representatives seated in a hall, debating a measure.',
  },
}

const VIDEO_BLOCK = {
  type: 'video',
  data: {
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Self-government in the colonies',
    description: 'A short overview of how colonial assemblies actually worked day to day.',
  },
}

const composite = (blocks: unknown[]) => JSON.stringify({ kind: 'composite', blocks })

describe('CompositeSchema', () => {
  it('accepts an ordered mix of content pieces', () => {
    const result = CompositeSchema.safeParse({
      kind: 'composite',
      blocks: [TEXT_BLOCK, IMAGE_BLOCK, VIDEO_BLOCK],
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one piece', () => {
    expect(CompositeSchema.safeParse({ kind: 'composite', blocks: [] }).success).toBe(false)
  })

  it('rejects an unknown piece type', () => {
    expect(
      CompositeSchema.safeParse({
        kind: 'composite',
        blocks: [{ type: 'podcast', data: { url: 'x' } }],
      }).success
    ).toBe(false)
  })

  it('REJECTS a question as a piece — content and questions are separate', () => {
    // This is the guarantee that keeps gating.ts free of block awareness.
    const check = {
      type: 'interactive-check',
      data: {
        question: 'Who could vote?',
        options: [
          { text: 'a', correct: true, feedback: 'y' },
          { text: 'b', correct: false, feedback: 'n' },
          { text: 'c', correct: false, feedback: 'n' },
          { text: 'd', correct: false, feedback: 'n' },
        ],
      },
    }
    expect(ContentBlockSchema.safeParse(check).success).toBe(false)
    expect(CompositeSchema.safeParse({ kind: 'composite', blocks: [check] }).success).toBe(false)
  })

  it('still REQUIRES each piece’s text equivalents', () => {
    // A text alternative must exist — that is the accessibility contract, and
    // it is what read-aloud speaks when the visual can't be perceived.
    for (const field of ['alt', 'caption', 'credit', 'license', 'longDescription']) {
      const blank = { type: 'image', data: { ...IMAGE_BLOCK.data, [field]: '' } }
      expect(ContentBlockSchema.safeParse(blank).success).toBe(false)
    }
  })

  it('does NOT impose a minimum length on them', () => {
    // The old floors (longDescription ≥ 40, video description ≥ 20, diagram and
    // infographic summary ≥ 40) blocked perfectly good short descriptions —
    // "Portrait of John Locke" is 22 characters and says everything it needs to.
    const terse = { type: 'image', data: { ...IMAGE_BLOCK.data, longDescription: 'John Locke.' } }
    expect(ContentBlockSchema.safeParse(terse).success).toBe(true)

    const terseVideo = {
      type: 'video',
      data: { ...VIDEO_BLOCK.data, description: 'Colonial assemblies.' },
    }
    expect(ContentBlockSchema.safeParse(terseVideo).success).toBe(true)
  })
})

describe('parseStepContent — composite', () => {
  it('parses on every content-bearing step type', () => {
    for (const stepType of COMPOSITE_CAPABLE_STEP_TYPES) {
      const parsed = parseStepContent(stepType, composite([TEXT_BLOCK, IMAGE_BLOCK]))
      expect(parsed.kind).toBe('composite')
    }
  })

  it('does NOT parse on the question step types', () => {
    // A composite payload on a question type degrades to text exactly like any
    // other wrong-shape content — the rejection is the guard.
    for (const stepType of ['INTERACTIVE_CHECK', 'SOURCE_ANALYSIS']) {
      expect(isCompositeCapableStepType(stepType)).toBe(false)
      expect(parseStepContent(stepType, composite([TEXT_BLOCK])).kind).toBe('text')
    }
  })

  it('preserves block order', () => {
    const parsed = parseStepContent('NOTE', composite([IMAGE_BLOCK, TEXT_BLOCK, VIDEO_BLOCK]))
    expect(parsed.kind).toBe('composite')
    if (parsed.kind !== 'composite') return
    expect(parsed.blocks.map((b) => b.type)).toEqual(['image', 'text', 'video'])
  })

  it('degrades a malformed composite to text rather than breaking the mission', () => {
    const broken = JSON.stringify({ kind: 'composite', blocks: [{ type: 'image', data: {} }] })
    expect(parseStepContent('NOTE', broken).kind).toBe('text')
  })
})

describe('additivity — composite changes nothing that already worked', () => {
  it('plain text still parses as text', () => {
    const parsed = parseStepContent('NOTE', 'Just a paragraph.')
    expect(parsed).toEqual({ kind: 'text', text: 'Just a paragraph.' })
  })

  it('a NOTE carrying timeline JSON still parses as a timeline', () => {
    const timeline = JSON.stringify({
      kind: 'timeline',
      connector: 'line',
      events: [
        { marker: '1215', label: 'Magna Carta' },
        { marker: '1619', label: 'House of Burgesses' },
        { marker: '1620', label: 'Mayflower Compact' },
      ],
    })
    expect(parseStepContent('NOTE', timeline).kind).toBe('timeline')
  })

  it('a single-shape IMAGE still parses as an image, not a composite', () => {
    expect(parseStepContent('IMAGE', JSON.stringify(IMAGE_BLOCK.data)).kind).toBe('image')
  })

  it('a single-shape VIDEO still parses as a video', () => {
    expect(parseStepContent('VIDEO', JSON.stringify(VIDEO_BLOCK.data)).kind).toBe('video')
  })
})

describe('gating stays ignorant of blocks', () => {
  const step = (content: string, required = true) => ({
    id: 's1',
    stepType: 'NOTE',
    title: 'A module',
    content,
    sequenceOrder: 1,
    required,
  })

  it('a composite never blocks Next, however many pieces it holds', () => {
    // It cannot contain a question, so there is nothing to answer.
    expect(stepNeedsAttempt(step(composite([TEXT_BLOCK, IMAGE_BLOCK, VIDEO_BLOCK])))).toBe(false)
  })

  it('a real check module still blocks Next', () => {
    const check = JSON.stringify({
      question: 'Who could vote?',
      options: [
        { text: 'a', correct: true, feedback: 'y' },
        { text: 'b', correct: false, feedback: 'n' },
        { text: 'c', correct: false, feedback: 'n' },
        { text: 'd', correct: false, feedback: 'n' },
      ],
    })
    expect(
      stepNeedsAttempt({ ...step(check), stepType: 'INTERACTIVE_CHECK' })
    ).toBe(true)
  })
})
