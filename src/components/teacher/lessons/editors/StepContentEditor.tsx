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
import { parseStepContent } from '@/lib/lesson-content'
import { FormField, inputClasses } from './form/FormField'
import { DraftEditor } from './blocks/DraftEditor'
import {
  blankDraft,
  toPayload,
  validateDraft,
  type DraftValue,
} from './blocks/block-draft'

export type { DraftValue } from './blocks/block-draft'

export interface SaveResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
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
    case 'composite':
      // Defensive only. A composite module holds several pieces and belongs to
      // CompositeStepEditor; every caller routes content types there, so this
      // branch is unreachable in practice. It must still exist because the
      // switch is exhaustive over ParsedStepContent — and it deliberately does
      // NOT try to squeeze a multi-piece module into a single-shape draft,
      // which would silently discard every piece but one on save.
      return { value: blankDraft(stepType), degraded: true }
    case 'text':
      if (stepType === 'NOTE' || stepType === 'VOCABULARY' || stepType === 'DISCUSSION') {
        return { value: { kind: 'PLAIN_TEXT', data: { mode: 'text', text: parsed.text } }, degraded: false }
      }
      return { value: blankDraft(stepType), degraded: content.trim().length > 0 }
  }
}

export interface StepContentClassOption {
  id: string
  name: string
  period: string | null
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
  classOptions,
  defaultCheckedClassIds,
  initialDraft,
}: {
  stepId: string
  stepType: string
  initialTitle: string
  initialContent: string
  titleLabel: string
  onSave: (input: { title?: string; payload: unknown; classIds?: string[] }) => Promise<SaveResult>
  onDraftPreviewChange?: (content: string | null) => void
  saveLabel: string
  /** When provided, replaces the plain save button with a checkbox per class
   * so a teacher can apply this edit to several of their classes at once. */
  classOptions?: StepContentClassOption[]
  defaultCheckedClassIds?: string[]
  /**
   * Start from this draft instead of parsing `initialContent`.
   *
   * For a NEW module there is nothing to parse: a blank payload cannot satisfy
   * its own schema, so round-tripping one through parseStepContent always fell
   * out of the text fallback — which showed the teacher raw JSON in a textarea
   * (NOTE/VOCABULARY), silently dropped them into the plain-text editor instead
   * of the timeline editor, or flew a "this content didn't match the expected
   * shape" banner on a module they had just created. Callers adding a module
   * pass `blankDraft(...)` here and skip parsing entirely.
   */
  initialDraft?: DraftValue
}) {
  const init = useMemo(
    () =>
      initialDraft
        ? { value: initialDraft, degraded: false }
        : initDraft(stepType, initialContent),
    // `initialDraft` is a mount-time seed only; re-deriving it on identity
    // change would discard whatever the teacher has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepId, stepType, initialContent]
  )
  const [draft, setDraft] = useState<DraftValue>(init.value)
  const [title, setTitle] = useState(initialTitle)
  const [checkedClassIds, setCheckedClassIds] = useState<string[]>(defaultCheckedClassIds ?? [])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({})

  const validation = useMemo(() => validateDraft(draft), [draft])

  useEffect(() => {
    onDraftPreviewChange?.(validation.serialized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.serialized])

  function toggleClass(classId: string) {
    setCheckedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    )
  }

  const noClassesSelected = !!classOptions && checkedClassIds.length === 0

  async function handleSave() {
    if (!validation.valid || noClassesSelected) return
    setSaving(true)
    setSaveError(null)
    setServerFieldErrors({})
    try {
      const result = await onSave({
        title,
        payload: toPayload(draft),
        classIds: classOptions ? checkedClassIds : undefined,
      })
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
  const resolvedSaveLabel = classOptions
    ? `Save for ${checkedClassIds.length} class${checkedClassIds.length === 1 ? '' : 'es'}`
    : saveLabel

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

      <DraftEditor
        draft={draft}
        onChange={setDraft}
        errors={fieldErrors}
        allowTimeline={stepType === 'NOTE'}
      />

      {classOptions && (
        <fieldset className="rounded-md border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-800">Apply to</legend>
          <div className="space-y-1.5">
            {classOptions.map((cls) => (
              <label key={cls.id} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={checkedClassIds.includes(cls.id)}
                  onChange={() => toggleClass(cls.id)}
                />
                {cls.name}
                {cls.period ? ` (P${cls.period})` : ''}
              </label>
            ))}
          </div>
          {noClassesSelected && (
            <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
              Select at least one class.
            </p>
          )}
        </fieldset>
      )}

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
        disabled={!validation.valid || noClassesSelected || saving}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
      >
        {saving ? 'Saving…' : resolvedSaveLabel}
      </button>
    </div>
  )
}
