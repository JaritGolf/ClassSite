'use client'

/**
 * Editor for a CONTENT module — a title plus an ordered stack of pieces.
 *
 * The sibling of StepContentEditor, which keeps serving the two QUESTION types
 * (Quick check, Document study) and the admin workspace. The split follows the
 * product rule: content and questions are separate entities, so only content
 * modules can hold several pieces.
 *
 * Saving is shape-preserving on purpose. A module that still holds exactly one
 * piece is saved in its ORIGINAL single-shape form, so opening a built-in
 * module and closing it again cannot rewrite the seeded curriculum into a
 * composite. It only becomes a composite once a second piece exists.
 */

import { useEffect, useMemo, useState } from 'react'
import { parseStepContent, type ContentBlock } from '@/lib/lesson-content'
import { FormField, inputClasses } from '../form/FormField'
import { BlockList, newBlockDraft, type BlockDraft } from './BlockList'
import { toPayload, validateDraft, type DraftValue } from './block-draft'
import { firstBlockWithError } from './field-errors'
import { BLOCK_TYPE_BY_KEY } from '../../builder/module-types'
import type { SaveResult } from '../StepContentEditor'

/** Turn a stored block back into an editable draft. */
function blockToDraft(block: ContentBlock): BlockDraft {
  const shared = { id: `${block.type}-${Math.random().toString(36).slice(2, 8)}` }
  switch (block.type) {
    case 'text':
      return { ...shared, type: 'text', draft: { kind: 'PLAIN_TEXT', data: { mode: 'text', ...block.data } } }
    case 'timeline': {
      const { kind: _k, ...rest } = block.data
      return { ...shared, type: 'timeline', draft: { kind: 'PLAIN_TEXT', data: { mode: 'timeline', ...rest } } }
    }
    case 'image':
      return { ...shared, type: 'image', draft: { kind: 'IMAGE', data: block.data } }
    case 'video':
      return { ...shared, type: 'video', draft: { kind: 'VIDEO', data: block.data } }
    case 'diagram':
      return { ...shared, type: 'diagram', draft: { kind: 'DIAGRAM', data: block.data } }
    case 'infographic':
      return { ...shared, type: 'infographic', draft: { kind: 'INFOGRAPHIC', data: block.data } }
    case 'worked-example':
      return { ...shared, type: 'worked-example', draft: { kind: 'WORKED_EXAMPLE', data: block.data } }
  }
}

/**
 * Present ANY existing module as a list of pieces.
 *
 * A single-shape module becomes a one-piece list; a composite becomes its own
 * pieces. Nothing is written until the teacher saves, so merely opening a
 * module never changes what is stored.
 */
function initBlocks(stepType: string, content: string, seed?: DraftValue): BlockDraft[] {
  if (seed) {
    return [
      {
        id: `seed-${Math.random().toString(36).slice(2, 8)}`,
        type: BLOCK_TYPE_BY_KEY[stepType] ?? 'text',
        draft: seed,
      },
    ]
  }
  const parsed = parseStepContent(stepType, content)
  if (parsed.kind === 'composite') return parsed.blocks.map(blockToDraft)

  // Single-shape module → a one-piece list carrying its existing content.
  const key =
    parsed.kind === 'timeline'
      ? 'TIMELINE'
      : (Object.keys(BLOCK_TYPE_BY_KEY).find((k) => BLOCK_TYPE_BY_KEY[k] === parsed.kind) ??
        stepType)
  const block = newBlockDraft(key as never)
  switch (parsed.kind) {
    case 'text':
      return [{ ...block, type: 'text', draft: { kind: 'PLAIN_TEXT', data: { mode: 'text', text: parsed.text } } }]
    case 'timeline': {
      const { kind: _k, ...rest } = parsed
      return [{ ...block, type: 'timeline', draft: { kind: 'PLAIN_TEXT', data: { mode: 'timeline', ...rest } } }]
    }
    case 'image': {
      const { kind: _k, ...data } = parsed
      return [{ ...block, type: 'image', draft: { kind: 'IMAGE', data } }]
    }
    case 'video': {
      const { kind: _k, ...data } = parsed
      return [{ ...block, type: 'video', draft: { kind: 'VIDEO', data } }]
    }
    case 'diagram':
      return [{ ...block, type: 'diagram', draft: { kind: 'DIAGRAM', data: parsed.diagram } }]
    case 'infographic':
      return [{ ...block, type: 'infographic', draft: { kind: 'INFOGRAPHIC', data: parsed.infographic } }]
    case 'worked-example': {
      const { kind: _k, ...data } = parsed
      return [{ ...block, type: 'worked-example', draft: { kind: 'WORKED_EXAMPLE', data } }]
    }
    default:
      return [block]
  }
}

export function CompositeStepEditor({
  stepId,
  stepType,
  initialTitle,
  initialContent,
  titleLabel,
  saveLabel,
  onSave,
  initialDraft,
}: {
  stepId: string
  stepType: string
  initialTitle: string
  initialContent: string
  titleLabel: string
  saveLabel: string
  onSave: (input: { title?: string; payload: unknown }) => Promise<SaveResult>
  /** For a brand-new module: seed the first piece without parsing anything. */
  initialDraft?: DraftValue
}) {
  const initial = useMemo(
    () => initBlocks(stepType, initialContent, initialDraft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepId, stepType, initialContent]
  )
  const [blocks, setBlocks] = useState<BlockDraft[]>(initial)
  const [openBlockId, setOpenBlockId] = useState<string | null>(initial[0]?.id ?? null)
  const [title, setTitle] = useState(initialTitle)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({})

  const localErrors = useMemo(() => {
    // Prefix each piece's own errors so they can be told apart. Under the old
    // path[0] rule every one of these collapsed onto the single key `blocks`.
    const merged: Record<string, string> = {}
    blocks.forEach((block, index) => {
      const result = validateDraft(block.draft)
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        merged[`blocks.${index}.data.${key}`] = message
      }
    })
    return merged
  }, [blocks])

  const fieldErrors = { ...localErrors, ...serverFieldErrors }

  // Open the first piece that has a problem, so an error inside a collapsed
  // piece is never invisible.
  useEffect(() => {
    if (!saveError) return
    const bad = firstBlockWithError(fieldErrors, blocks.length)
    if (bad !== null) setOpenBlockId(blocks[bad]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveError])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setServerFieldErrors({})
    try {
      const result = await onSave({ title: title || undefined, payload: buildPayload(blocks) })
      if (!result.ok) {
        setSaveError(result.error ?? 'Something went wrong.')
        setServerFieldErrors(result.fieldErrors ?? {})
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
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

      <BlockList
        blocks={blocks}
        onChange={setBlocks}
        fieldErrors={fieldErrors}
        openBlockId={openBlockId}
        onOpenBlock={setOpenBlockId}
      />

      {saveError && (
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {saveError}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg border-2 border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:translate-y-[1px] active:border-b-2 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </form>
  )
}

/**
 * SHAPE-PRESERVING serialization.
 *
 * One piece → that piece's own payload, exactly as before composites existed.
 * That is what guarantees opening a built-in module and saving it unchanged
 * cannot silently convert the seeded curriculum into composites, and keeps the
 * seed shape tests meaningful.
 */
export function buildPayload(blocks: BlockDraft[]): unknown {
  if (blocks.length === 1) return toPayload(blocks[0].draft)
  return {
    kind: 'composite',
    blocks: blocks.map((b) => ({ type: b.type, data: toPayload(b.draft) })),
  }
}
