/**
 * The shared draft vocabulary for content editing.
 *
 * Lifted out of StepContentEditor so ONE definition serves both surfaces: the
 * per-module editor (one draft per module) and the composite block editor (one
 * draft per block). `renderEditor` already switched on `draft.kind` rather than
 * on the step type, so it is reusable as-is.
 *
 * The extraction also fixes a real bug. `blankDraft` here and `blankPayloadFor`
 * in builder/module-types.ts used to be two parallel definitions of "an empty
 * X", bridged by a lossy JSON.stringify → parseStepContent → zod round trip.
 * A blank payload can never satisfy its own schema (`description: min(20)`,
 * `summary: min(40)`, the youtubeId regex, `marker: min(1)`…), so every newly
 * added module fell through parseStepContent's text fallback and opened either
 * showing raw JSON in a textarea or flying a "this content didn't match the
 * expected shape" banner on a module the teacher had just created. Callers now
 * pass a DraftValue directly and never round-trip a blank through validation.
 */

import {
  DiagramSchema,
  ImageSchema,
  InfographicSchema,
  InteractiveCheckSchema,
  SourceAnalysisSchema,
  TimelineSchema,
  VideoSchema,
  WorkedExampleSchema,
  type DiagramContent,
  type ImageContent,
  type InfographicContent,
  type InteractiveCheckContent,
  type SourceAnalysisContent,
  type VideoContent,
  type WorkedExampleContent,
} from '@/lib/lesson-content'
import { fieldErrorsFromIssues } from './field-errors'
import { blankForVariant } from '../DiagramStepEditor'
import { blankBlock } from '../InfographicStepEditor'
import { newGuidingQuestion } from '../SourceAnalysisStepEditor'
import type { PlainTextValue } from '../PlainTextStepEditor'

export type DraftValue =
  | { kind: 'VIDEO'; data: VideoContent }
  | { kind: 'IMAGE'; data: ImageContent }
  | { kind: 'DIAGRAM'; data: DiagramContent }
  | { kind: 'INFOGRAPHIC'; data: InfographicContent }
  | { kind: 'WORKED_EXAMPLE'; data: WorkedExampleContent }
  | { kind: 'INTERACTIVE_CHECK'; data: InteractiveCheckContent }
  | { kind: 'SOURCE_ANALYSIS'; data: SourceAnalysisContent }
  | { kind: 'PLAIN_TEXT'; data: PlainTextValue }

export type DraftKind = DraftValue['kind']

/** An empty draft of each kind — the single source of "a new, blank X". */
export function blankDraft(stepType: string): DraftValue {
  switch (stepType) {
    case 'VIDEO':
      return { kind: 'VIDEO', data: { youtubeId: '', title: '', description: '' } }
    case 'IMAGE':
      return {
        kind: 'IMAGE',
        data: { asset: '', alt: '', caption: '', credit: '', license: '', longDescription: '' },
      }
    case 'DIAGRAM':
      return { kind: 'DIAGRAM', data: blankForVariant('flow', '', '') }
    case 'INFOGRAPHIC':
      return {
        kind: 'INFOGRAPHIC',
        data: { title: '', summary: '', blocks: [blankBlock('fact'), blankBlock('fact')] },
      }
    case 'WORKED_EXAMPLE':
      return {
        kind: 'WORKED_EXAMPLE',
        data: { problem: '', thinkAloud: ['', ''], answer: '', whyItWorks: '' },
      }
    case 'INTERACTIVE_CHECK':
      return {
        kind: 'INTERACTIVE_CHECK',
        data: {
          question: '',
          options: [
            { text: '', correct: true, feedback: '' },
            { text: '', correct: false, feedback: '' },
            { text: '', correct: false, feedback: '' },
            { text: '', correct: false, feedback: '' },
          ],
        },
      }
    case 'SOURCE_ANALYSIS':
      return {
        kind: 'SOURCE_ANALYSIS',
        data: {
          sourceTitle: '',
          sourceAttribution: '',
          passage: '',
          guidingQuestions: [newGuidingQuestion()],
        },
      }
    default:
      return { kind: 'PLAIN_TEXT', data: { mode: 'text', text: '' } }
  }
}

/** A blank TIMELINE draft — a NOTE step whose content is the timeline shape. */
export function blankTimelineDraft(): DraftValue {
  return {
    kind: 'PLAIN_TEXT',
    data: {
      mode: 'timeline',
      connector: 'line',
      events: [
        { marker: '', label: '' },
        { marker: '', label: '' },
        { marker: '', label: '' },
      ],
    },
  }
}

/**
 * The object shape a draft is POSTed as. The server re-validates and produces
 * the canonical stored string (see lesson-editor/content-schema.ts).
 */
export function toPayload(draft: DraftValue): unknown {
  if (draft.kind !== 'PLAIN_TEXT') return draft.data
  if (draft.data.mode === 'text') return { text: draft.data.text }
  const { mode: _mode, ...rest } = draft.data
  return { kind: 'timeline', ...rest }
}

export interface DraftValidation {
  valid: boolean
  fieldErrors: Record<string, string>
  serialized: string | null
}

function fromZod(result: {
  success: boolean
  data?: unknown
  error?: { issues: { path: (string | number)[]; message: string }[] }
}): DraftValidation {
  if (result.success) {
    return { valid: true, fieldErrors: {}, serialized: JSON.stringify(result.data) }
  }
  return { valid: false, fieldErrors: fieldErrorsFromIssues(result.error?.issues ?? []), serialized: null }
}

/** Client-side prevalidation. The server remains the real gate. */
export function validateDraft(draft: DraftValue): DraftValidation {
  switch (draft.kind) {
    case 'VIDEO':
      return fromZod(VideoSchema.safeParse(draft.data))
    case 'IMAGE':
      return fromZod(ImageSchema.safeParse(draft.data))
    case 'DIAGRAM':
      return fromZod(DiagramSchema.safeParse(draft.data))
    case 'INFOGRAPHIC':
      return fromZod(InfographicSchema.safeParse(draft.data))
    case 'WORKED_EXAMPLE':
      return fromZod(WorkedExampleSchema.safeParse(draft.data))
    case 'INTERACTIVE_CHECK':
      return fromZod(InteractiveCheckSchema.safeParse(draft.data))
    case 'SOURCE_ANALYSIS':
      return fromZod(SourceAnalysisSchema.safeParse(draft.data))
    case 'PLAIN_TEXT':
      if (draft.data.mode === 'text') {
        return draft.data.text.length > 0
          ? { valid: true, fieldErrors: {}, serialized: draft.data.text }
          : { valid: false, fieldErrors: { text: 'Required' }, serialized: null }
      }
      {
        const { mode: _mode, ...rest } = draft.data
        return fromZod(TimelineSchema.safeParse({ kind: 'timeline', ...rest }))
      }
  }
}
