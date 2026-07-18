'use client'

/**
 * Per-stepType content editor dispatcher — mirrors LessonStepRenderer's own
 * switch, keyed on `stepType` instead of `parsed.kind`. Owns typed draft
 * state, runs the SAME zod schemas used server-side (src/lib/lesson-content/
 * contracts.ts) for light client-side prevalidation (fast feedback; the
 * server is still the real gate — see src/lib/lesson-editor/content-schema.ts),
 * and reports a live-preview-ready serialized string to the parent as the
 * draft changes.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  parseStepContent,
  VideoSchema,
  ImageSchema,
  DiagramSchema,
  InfographicSchema,
  WorkedExampleSchema,
  InteractiveCheckSchema,
  SourceAnalysisSchema,
  TimelineSchema,
  type VideoContent,
  type ImageContent,
  type DiagramContent,
  type InfographicContent,
  type WorkedExampleContent,
  type InteractiveCheckContent,
  type SourceAnalysisContent,
} from '@/lib/lesson-content'
import { VideoStepEditor } from './VideoStepEditor'
import { ImageStepEditor } from './ImageStepEditor'
import { DiagramStepEditor, blankForVariant } from './DiagramStepEditor'
import { InfographicStepEditor, blankBlock } from './InfographicStepEditor'
import { WorkedExampleStepEditor } from './WorkedExampleStepEditor'
import { InteractiveCheckStepEditor } from './InteractiveCheckStepEditor'
import { SourceAnalysisStepEditor, newGuidingQuestion } from './SourceAnalysisStepEditor'
import { PlainTextStepEditor, type PlainTextValue } from './PlainTextStepEditor'
import { FormField, inputClasses } from './form/FormField'

type DraftValue =
  | { kind: 'VIDEO'; data: VideoContent }
  | { kind: 'IMAGE'; data: ImageContent }
  | { kind: 'DIAGRAM'; data: DiagramContent }
  | { kind: 'INFOGRAPHIC'; data: InfographicContent }
  | { kind: 'WORKED_EXAMPLE'; data: WorkedExampleContent }
  | { kind: 'INTERACTIVE_CHECK'; data: InteractiveCheckContent }
  | { kind: 'SOURCE_ANALYSIS'; data: SourceAnalysisContent }
  | { kind: 'PLAIN_TEXT'; data: PlainTextValue }

export interface SaveResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

function blankDraft(stepType: string): DraftValue {
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

function initDraft(stepType: string, content: string): { value: DraftValue; degraded: boolean } {
  const parsed = parseStepContent(stepType, content)
  switch (parsed.kind) {
    case 'video': {
      const { kind: _k, ...data } = parsed
      return { value: { kind: 'VIDEO', data }, degraded: false }
    }
    case 'image': {
      const { kind: _k, ...data } = parsed
      return { value: { kind: 'IMAGE', data }, degraded: false }
    }
    case 'diagram':
      return { value: { kind: 'DIAGRAM', data: parsed.diagram }, degraded: false }
    case 'infographic':
      return { value: { kind: 'INFOGRAPHIC', data: parsed.infographic }, degraded: false }
    case 'worked-example': {
      const { kind: _k, ...data } = parsed
      return { value: { kind: 'WORKED_EXAMPLE', data }, degraded: false }
    }
    case 'interactive-check': {
      const { kind: _k, ...data } = parsed
      return { value: { kind: 'INTERACTIVE_CHECK', data }, degraded: false }
    }
    case 'source-analysis': {
      const { kind: _k, ...data } = parsed
      return { value: { kind: 'SOURCE_ANALYSIS', data }, degraded: false }
    }
    case 'timeline': {
      const { kind: _k, ...rest } = parsed
      return { value: { kind: 'PLAIN_TEXT', data: { mode: 'timeline', ...rest } }, degraded: false }
    }
    case 'text':
      if (stepType === 'NOTE' || stepType === 'VOCABULARY' || stepType === 'DISCUSSION') {
        return { value: { kind: 'PLAIN_TEXT', data: { mode: 'text', text: parsed.text } }, degraded: false }
      }
      return { value: blankDraft(stepType), degraded: content.trim().length > 0 }
  }
}

function fromZod(result: { success: boolean; data?: unknown; error?: { issues: { path: (string | number)[]; message: string }[] } }) {
  if (result.success) {
    return { valid: true, fieldErrors: {} as Record<string, string>, serialized: JSON.stringify(result.data) }
  }
  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path[0]?.toString() ?? '_root'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return { valid: false, fieldErrors, serialized: null as string | null }
}

function validateDraft(draft: DraftValue) {
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
          ? { valid: true, fieldErrors: {} as Record<string, string>, serialized: draft.data.text }
          : { valid: false, fieldErrors: { text: 'Required' }, serialized: null as string | null }
      } else {
        const { mode: _mode, ...rest } = draft.data
        return fromZod(TimelineSchema.safeParse({ kind: 'timeline', ...rest }))
      }
  }
}

function toPayload(draft: DraftValue): unknown {
  if (draft.kind !== 'PLAIN_TEXT') return draft.data
  if (draft.data.mode === 'text') return { text: draft.data.text }
  const { mode: _mode, ...rest } = draft.data
  return { kind: 'timeline', ...rest }
}

function renderEditor(
  draft: DraftValue,
  setDraft: (d: DraftValue) => void,
  fieldErrors: Record<string, string>,
  stepType: string
) {
  switch (draft.kind) {
    case 'VIDEO':
      return (
        <VideoStepEditor value={draft.data} onChange={(data) => setDraft({ kind: 'VIDEO', data })} errors={fieldErrors} />
      )
    case 'IMAGE':
      return (
        <ImageStepEditor value={draft.data} onChange={(data) => setDraft({ kind: 'IMAGE', data })} errors={fieldErrors} />
      )
    case 'DIAGRAM':
      return (
        <DiagramStepEditor value={draft.data} onChange={(data) => setDraft({ kind: 'DIAGRAM', data })} errors={fieldErrors} />
      )
    case 'INFOGRAPHIC':
      return (
        <InfographicStepEditor
          value={draft.data}
          onChange={(data) => setDraft({ kind: 'INFOGRAPHIC', data })}
          errors={fieldErrors}
        />
      )
    case 'WORKED_EXAMPLE':
      return (
        <WorkedExampleStepEditor
          value={draft.data}
          onChange={(data) => setDraft({ kind: 'WORKED_EXAMPLE', data })}
          errors={fieldErrors}
        />
      )
    case 'INTERACTIVE_CHECK':
      return (
        <InteractiveCheckStepEditor
          value={draft.data}
          onChange={(data) => setDraft({ kind: 'INTERACTIVE_CHECK', data })}
          errors={fieldErrors}
        />
      )
    case 'SOURCE_ANALYSIS':
      return (
        <SourceAnalysisStepEditor
          value={draft.data}
          onChange={(data) => setDraft({ kind: 'SOURCE_ANALYSIS', data })}
          errors={fieldErrors}
        />
      )
    case 'PLAIN_TEXT':
      return (
        <PlainTextStepEditor
          value={draft.data}
          onChange={(data) => setDraft({ kind: 'PLAIN_TEXT', data })}
          errors={fieldErrors}
          allowTimeline={stepType === 'NOTE'}
        />
      )
  }
}

export function StepContentEditor({
  stepId,
  stepType,
  initialTitle,
  initialContent,
  titleLabel,
  onSave,
  onDraftPreviewChange,
  saveLabel,
}: {
  stepId: string
  stepType: string
  initialTitle: string
  initialContent: string
  titleLabel: string
  onSave: (input: { title?: string; payload: unknown }) => Promise<SaveResult>
  onDraftPreviewChange?: (content: string | null) => void
  saveLabel: string
}) {
  const init = useMemo(() => initDraft(stepType, initialContent), [stepId, stepType, initialContent])
  const [draft, setDraft] = useState<DraftValue>(init.value)
  const [title, setTitle] = useState(initialTitle)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({})

  const validation = useMemo(() => validateDraft(draft), [draft])

  useEffect(() => {
    onDraftPreviewChange?.(validation.serialized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.serialized])

  async function handleSave() {
    if (!validation.valid) return
    setSaving(true)
    setSaveError(null)
    setServerFieldErrors({})
    try {
      const result = await onSave({ title, payload: toPayload(draft) })
      if (!result.ok) {
        setSaveError(result.error ?? 'Something went wrong — try again.')
        setServerFieldErrors(result.fieldErrors ?? {})
      }
    } finally {
      setSaving(false)
    }
  }

  const fieldErrors = { ...validation.fieldErrors, ...serverFieldErrors }
  const rootError = fieldErrors._root

  return (
    <div className="space-y-4">
      {init.degraded && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          This step&apos;s saved content didn&apos;t match the expected shape — starting from a blank form.
        </p>
      )}

      <FormField label={titleLabel}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </FormField>

      {renderEditor(draft, setDraft, fieldErrors, stepType)}

      {rootError && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {rootError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {saveError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!validation.valid || saving}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}
