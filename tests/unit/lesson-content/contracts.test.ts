/**
 * Lesson-content contracts (pure) — parseStepContent / parseRemediationContent.
 *
 * The renderers rely on these guarantees: structured steps parse to their kind,
 * and ANY malformed content degrades to `{ kind: 'text' }` (never throws, never
 * blocks the mission flow).
 */

import {
  parseStepContent,
  parseRemediationContent,
  type InteractiveCheckContent,
  type WorkedExampleContent,
  type SourceAnalysisContent,
} from '@/lib/lesson-content'

const VALID_CHECK: InteractiveCheckContent = {
  question: 'Which idea is popular sovereignty?',
  options: [
    { text: 'Power comes from the people', correct: true, feedback: 'Yes!' },
    { text: 'Power comes from a king', correct: false, feedback: 'No — that is divine right.' },
    { text: 'Power comes from the courts', correct: false, feedback: 'Not the source of power.' },
    { text: 'Power comes from the army', correct: false, feedback: 'Force is not legitimacy.' },
  ],
}

const VALID_WORKED: WorkedExampleContent = {
  problem: 'Which thinker proposed separation of powers?',
  thinkAloud: ['The stem asks about branches.', 'Branches → Montesquieu.'],
  answer: 'Montesquieu',
  whyItWorks: 'Match each thinker to a signature idea.',
}

const VALID_SOURCE: SourceAnalysisContent = {
  sourceTitle: 'Locke on Natural Rights',
  sourceAttribution: 'Adapted from Two Treatises of Government, 1689',
  passage: 'All people are born free and equal.',
  guidingQuestions: [
    {
      question: 'Where do rights come from?',
      options: [
        { text: 'Birth', correct: true, feedback: 'Right.' },
        { text: 'Kings', correct: false, feedback: 'No.' },
        { text: 'Wealth', correct: false, feedback: 'No.' },
      ],
    },
  ],
}

const VALID_TIMELINE = {
  kind: 'timeline' as const,
  intro: 'Watch the power shift.',
  connector: 'line' as const,
  events: [
    { marker: '1215', label: 'Magna Carta', detail: 'Even the king obeys the law.' },
    { marker: '1689', label: 'English Bill of Rights' },
    { marker: '1776', label: 'Declaration of Independence' },
  ],
}

describe('parseStepContent', () => {
  it('plain NOTE text and VOCABULARY always parse as text', () => {
    expect(parseStepContent('NOTE', 'Plain text.')).toEqual({ kind: 'text', text: 'Plain text.' })
    // Even valid JSON stays text for non-structured types
    const asJson = JSON.stringify(VALID_CHECK)
    expect(parseStepContent('VOCABULARY', asJson)).toEqual({ kind: 'text', text: asJson })
  })

  it('a NOTE carrying valid timeline JSON parses as a timeline', () => {
    const parsed = parseStepContent('NOTE', JSON.stringify(VALID_TIMELINE))
    expect(parsed.kind).toBe('timeline')
    if (parsed.kind === 'timeline') {
      expect(parsed.events).toHaveLength(3)
      expect(parsed.connector).toBe('line')
    }
  })

  it('a NOTE with non-timeline JSON stays text (no accidental visual parsing)', () => {
    const asJson = JSON.stringify(VALID_CHECK)
    expect(parseStepContent('NOTE', asJson)).toEqual({ kind: 'text', text: asJson })
  })

  it('a timeline with fewer than 3 events degrades to text', () => {
    const tooShort = { ...VALID_TIMELINE, events: VALID_TIMELINE.events.slice(0, 2) }
    expect(parseStepContent('NOTE', JSON.stringify(tooShort)).kind).toBe('text')
  })

  it('timelines only apply to NOTE steps', () => {
    const asJson = JSON.stringify(VALID_TIMELINE)
    expect(parseStepContent('INTERACTIVE_CHECK', asJson).kind).toBe('text')
  })

  it('parses a valid WORKED_EXAMPLE', () => {
    const parsed = parseStepContent('WORKED_EXAMPLE', JSON.stringify(VALID_WORKED))
    expect(parsed.kind).toBe('worked-example')
    if (parsed.kind === 'worked-example') {
      expect(parsed.thinkAloud).toHaveLength(2)
      expect(parsed.answer).toBe('Montesquieu')
    }
  })

  it('parses a valid INTERACTIVE_CHECK', () => {
    const parsed = parseStepContent('INTERACTIVE_CHECK', JSON.stringify(VALID_CHECK))
    expect(parsed.kind).toBe('interactive-check')
  })

  it('parses a valid SOURCE_ANALYSIS', () => {
    const parsed = parseStepContent('SOURCE_ANALYSIS', JSON.stringify(VALID_SOURCE))
    expect(parsed.kind).toBe('source-analysis')
    if (parsed.kind === 'source-analysis') {
      expect(parsed.guidingQuestions).toHaveLength(1)
    }
  })

  it('falls back to text for non-JSON content on structured types', () => {
    const parsed = parseStepContent('INTERACTIVE_CHECK', 'not json at all')
    expect(parsed).toEqual({ kind: 'text', text: 'not json at all' })
  })

  it('falls back to text when an INTERACTIVE_CHECK has two correct options', () => {
    const bad = {
      ...VALID_CHECK,
      options: VALID_CHECK.options.map((o, i) => ({ ...o, correct: i < 2 })),
    }
    expect(parseStepContent('INTERACTIVE_CHECK', JSON.stringify(bad)).kind).toBe('text')
  })

  it('falls back to text when a WORKED_EXAMPLE is missing fields', () => {
    const bad = { problem: 'x', thinkAloud: ['a', 'b'] } // no answer/whyItWorks
    expect(parseStepContent('WORKED_EXAMPLE', JSON.stringify(bad)).kind).toBe('text')
  })

  it('never throws on hostile content', () => {
    for (const content of ['', '{', '[]', 'null', '{"a":', '"str"', '42']) {
      expect(() => parseStepContent('SOURCE_ANALYSIS', content)).not.toThrow()
      expect(parseStepContent('SOURCE_ANALYSIS', content).kind).toBe('text')
    }
  })
})

describe('parseRemediationContent', () => {
  const validRemediation = {
    concept: 'Natural rights are rights you are born with.',
    examples: [
      { text: 'Life and liberty', isExample: true, explanation: 'Born with them.' },
      { text: 'Property (Locke)', isExample: true, explanation: 'Also natural.' },
      { text: 'A driver\'s license', isExample: false, explanation: 'Granted by government.' },
      { text: 'A tax refund', isExample: false, explanation: 'Created by law.' },
    ],
  }

  it('parses valid authored content', () => {
    const parsed = parseRemediationContent(JSON.stringify(validRemediation))
    expect(parsed).not.toBeNull()
    expect(parsed!.examples).toHaveLength(4)
  })

  it('accepts an optional tryIt check', () => {
    const withTryIt = { ...validRemediation, tryIt: VALID_CHECK }
    const parsed = parseRemediationContent(JSON.stringify(withTryIt))
    expect(parsed?.tryIt?.question).toBe(VALID_CHECK.question)
  })

  it('rejects content with fewer than 2 examples or 2 non-examples', () => {
    const oneExample = {
      ...validRemediation,
      examples: validRemediation.examples.filter((e, i) => i !== 0),
    }
    expect(parseRemediationContent(JSON.stringify(oneExample))).toBeNull()
    const oneNonExample = {
      ...validRemediation,
      examples: validRemediation.examples.filter((e, i) => i !== 3),
    }
    expect(parseRemediationContent(JSON.stringify(oneNonExample))).toBeNull()
  })

  it('returns null for legacy plain-text content', () => {
    expect(parseRemediationContent('Targeted review for the skill…')).toBeNull()
  })
})
