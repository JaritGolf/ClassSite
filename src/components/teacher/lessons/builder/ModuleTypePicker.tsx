'use client'

import { useRef, useState } from 'react'
import { TrackIcon } from '@/components/ui/TrackIcon'
import { ALL_MODULE_TYPES, type ModuleTypeKey, type ModuleTypeMeta } from './module-types'

/**
 * Choose what kind of module to add.
 *
 * Rendered INLINE, replacing the insert slot in place — not in a modal. Two
 * reasons: the teacher never loses sight of where the module will land, and
 * there is no focus trap, scroll lock or aria-modal surface to get wrong.
 * ImageAssetPicker already uses this inline pattern successfully.
 *
 * Keyboard: a radiogroup with roving tabindex (exactly one card reachable by
 * Tab, arrows move between them). Chosen over aria-activedescendant, which is
 * more fragile across screen readers.
 */
export function ModuleTypePicker({
  positionLabel,
  onPick,
  onCancel,
  options = ALL_MODULE_TYPES,
  heading,
}: {
  /** "between «X» and «Y»" / "at the start of the lesson" */
  positionLabel: string
  onPick: (key: ModuleTypeKey) => void
  onCancel: () => void
  /**
   * Which options to offer. Defaults to every module type; the in-module block
   * box passes the content-only subset.
   *
   * EVERY option is rendered — there is deliberately no "featured" set and no
   * "More…" disclosure. The old split hid Timeline, Document study, Diagram
   * and Fact panel behind a link, which is where teachers never found them.
   */
  options?: readonly ModuleTypeMeta[]
  /** Overrides the default "What do you want to add …?" question. */
  heading?: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const headingRef = useRef<HTMLParagraphElement>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])

  const visible: readonly ModuleTypeMeta[] = options

  function focusCard(index: number) {
    const next = (index + visible.length) % visible.length
    setActiveIndex(next)
    cardRefs.current[next]?.focus()
  }

  return (
    <div
      role="dialog"
      aria-labelledby="module-picker-heading"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
      className="my-2 rounded-lg border-2 border-indigo-200 bg-indigo-50/60 p-4"
    >
      <p
        id="module-picker-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-sm font-bold text-gray-900 outline-none"
      >
        {heading ?? `What do you want to add ${positionLabel}?`}
      </p>

      <div
        role="radiogroup"
        aria-labelledby="module-picker-heading"
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visible.map((meta, index) => (
          <button
            key={meta.key}
            type="button"
            role="radio"
            aria-checked={index === activeIndex}
            // Roving tabindex: one stop for Tab, arrows to move within.
            tabIndex={index === activeIndex ? 0 : -1}
            ref={(el) => {
              cardRefs.current[index] = el
            }}
            onFocus={() => setActiveIndex(index)}
            onClick={() => onPick(meta.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                focusCard(index + 1)
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                focusCard(index - 1)
              }
            }}
            className="flex min-h-[44px] items-start gap-3 rounded-lg border-2 border-gray-200 bg-white p-3 text-left hover:border-indigo-400 focus-visible:border-indigo-500"
          >
            <TrackIcon name={meta.icon} className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
            <span>
              <span className="block text-sm font-bold text-gray-900">{meta.name}</span>
              <span className="mt-0.5 block text-xs text-gray-600">{meta.blurb}</span>
              <span className="mt-1 block text-xs font-medium text-gray-500">{meta.effort}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-gray-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
