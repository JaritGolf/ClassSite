'use client'

/**
 * The pieces inside one module, in order.
 *
 * Modelled on LessonBuilder's MODULE list, deliberately not on
 * RepeatingFieldList. That component is the right primitive for the
 * homogeneous arrays inside each per-type editor and still serves all eight of
 * them, but it is wrong for blocks on three counts: its update is a shallow
 * PATCH (changing a piece's type would leave the previous type's keys behind),
 * its `itemLabel` is one string for the whole list (a screen-reader user would
 * hear "move item 3" with no idea what item 3 is), and its `key={i}` index keys
 * make focus and local state — e.g. ImageStepEditor's open picker — follow the
 * SLOT rather than the piece when you reorder.
 */

import { useEffect, useRef, useState } from 'react'
import { TrackIcon } from '@/components/ui/TrackIcon'
import { useAnnouncer } from '../../builder/BuilderAnnouncer'
import { ModuleTypePicker } from '../../builder/ModuleTypePicker'
import {
  BLOCK_TYPE_BY_KEY,
  CONTENT_BLOCK_TYPES,
  type ModuleTypeKey,
} from '../../builder/module-types'
import { DraftEditor } from './DraftEditor'
import { blankDraft, blankTimelineDraft, type DraftValue } from './block-draft'
import { blockHasError, scopeErrorsToBlock } from './field-errors'

/** One piece, with a stable id so React keys and focus follow the PIECE. */
export interface BlockDraft {
  id: string
  /** The stored discriminant (`text`, `image`, …). */
  type: string
  draft: DraftValue
}

let blockSeq = 0
function nextBlockId(): string {
  blockSeq += 1
  return `b${blockSeq}-${Math.random().toString(36).slice(2, 8)}`
}

export function newBlockDraft(key: ModuleTypeKey): BlockDraft {
  const meta = CONTENT_BLOCK_TYPES.find((m) => m.key === key)
  return {
    id: nextBlockId(),
    type: BLOCK_TYPE_BY_KEY[key] ?? 'text',
    draft: key === 'TIMELINE' ? blankTimelineDraft() : blankDraft(meta?.stepType ?? 'NOTE'),
  }
}

/** Teacher-facing name for a stored block type. */
export function blockLabel(type: string): string {
  const key = Object.keys(BLOCK_TYPE_BY_KEY).find((k) => BLOCK_TYPE_BY_KEY[k] === type)
  return CONTENT_BLOCK_TYPES.find((m) => m.key === key)?.name ?? 'Piece'
}

function blockIcon(type: string) {
  const key = Object.keys(BLOCK_TYPE_BY_KEY).find((k) => BLOCK_TYPE_BY_KEY[k] === type)
  return CONTENT_BLOCK_TYPES.find((m) => m.key === key)?.icon ?? 'book'
}

export function BlockList({
  blocks,
  onChange,
  fieldErrors,
  openBlockId,
  onOpenBlock,
}: {
  blocks: BlockDraft[]
  onChange: (blocks: BlockDraft[]) => void
  fieldErrors: Record<string, string>
  openBlockId: string | null
  onOpenBlock: (id: string | null) => void
}) {
  const { announce } = useAnnouncer()
  const [pickerAt, setPickerAt] = useState<string | null>(null)
  const pendingFocus = useRef<string | null>(null)

  // After a move the DOM is replaced and focus would fall to <body>. Put it
  // back on the same button of the piece that moved.
  useEffect(() => {
    if (!pendingFocus.current) return
    const el = document.getElementById(pendingFocus.current)
    pendingFocus.current = null
    el?.focus()
  }, [blocks])

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    pendingFocus.current = `block-move-${direction === -1 ? 'up' : 'down'}-${blocks[index].id}`
    announce(
      `${blockLabel(blocks[index].type)} moved to position ${target + 1} of ${blocks.length}.`
    )
  }

  function insert(afterId: string | null, key: ModuleTypeKey) {
    const block = newBlockDraft(key)
    const next = [...blocks]
    const at = afterId === null ? next.length : next.findIndex((b) => b.id === afterId) + 1
    next.splice(at, 0, block)
    onChange(next)
    setPickerAt(null)
    onOpenBlock(block.id)
    announce(`${blockLabel(block.type)} added as piece ${at + 1} of ${next.length}.`)
  }

  function remove(index: number) {
    const removed = blocks[index]
    const next = blocks.filter((_, i) => i !== index)
    onChange(next)
    if (openBlockId === removed.id) onOpenBlock(null)
    announce(
      `${blockLabel(removed.type)} removed. ${next.length} piece${next.length === 1 ? '' : 's'} left.`
    )
  }

  function renderPicker(afterId: string | null) {
    const slotKey = afterId ?? '__end__'
    if (pickerAt !== slotKey) return null
    return (
      <ModuleTypePicker
        positionLabel=""
        heading="What do you want to add to this module?"
        options={CONTENT_BLOCK_TYPES}
        onPick={(key) => insert(afterId, key)}
        onCancel={() => {
          setPickerAt(null)
          document.getElementById(`block-add-${slotKey}`)?.focus()
        }}
      />
    )
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {blocks.map((block, index) => {
          const isOpen = openBlockId === block.id
          const scoped = scopeErrorsToBlock(fieldErrors, index)
          const hasError = blockHasError(fieldErrors, index)
          return (
            <li key={block.id}>
              <div
                className={`rounded-md border-2 bg-white ${
                  hasError ? 'border-rose-300' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 p-2">
                  <TrackIcon
                    name={blockIcon(block.type)}
                    className="h-4 w-4 shrink-0 text-gray-500"
                    aria-hidden
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {blockLabel(block.type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Piece {index + 1} of {blocks.length}
                  </span>
                  {hasError && (
                    <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                      Needs attention
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      id={`block-move-up-${block.id}`}
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Move ${blockLabel(block.type)} up. Currently piece ${index + 1} of ${blocks.length}.`}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      id={`block-move-down-${block.id}`}
                      type="button"
                      disabled={index === blocks.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Move ${blockLabel(block.type)} down. Currently piece ${index + 1} of ${blocks.length}.`}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => onOpenBlock(isOpen ? null : block.id)}
                      className="rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800"
                    >
                      {isOpen ? 'Close' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      // A module must keep at least one piece; deleting the
                      // last one is "delete the module", which lives in the
                      // module list, not here.
                      disabled={blocks.length <= 1}
                      onClick={() => remove(index)}
                      aria-label={`Remove ${blockLabel(block.type)}, piece ${index + 1} of ${blocks.length}`}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-200 p-3">
                    <DraftEditor
                      draft={block.draft}
                      onChange={(draft) =>
                        onChange(blocks.map((b) => (b.id === block.id ? { ...b, draft } : b)))
                      }
                      errors={scoped}
                      // Inside a module, "text" and "timeline" are two distinct
                      // pieces — letting a text piece mutate itself into a
                      // timeline would invalidate its own label.
                      allowTimeline={false}
                    />
                  </div>
                )}
              </div>

              {renderPicker(block.id)}
              {index < blocks.length - 1 && pickerAt !== block.id && (
                <div className="flex justify-center py-1">
                  <button
                    id={`block-add-${block.id}`}
                    type="button"
                    onClick={() => setPickerAt(block.id)}
                    className="rounded-full border border-dashed border-indigo-300 bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    + Add here
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {renderPicker(null)}
      {pickerAt !== '__end__' && (
        <button
          id="block-add-__end__"
          type="button"
          onClick={() => setPickerAt('__end__')}
          className="w-full rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/40 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
        >
          + Add to this module
        </button>
      )}
    </div>
  )
}
