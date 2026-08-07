'use client'

/**
 * The "+ Add a module here" affordance that sits between every pair of
 * modules, above the first and below the last.
 *
 * It is a REAL button and always in the tab order — `opacity-0` with
 * `focus:opacity-100`, never `hidden` or `display:none`. A hover-only control
 * is unreachable by keyboard and touch (WCAG 2.4.7 / 2.4.11), which on a
 * teacher's primary authoring action would be disqualifying.
 */
export function ModuleInsertSlot({
  buttonId,
  afterLabel,
  beforeLabel,
  onOpen,
}: {
  buttonId: string
  /** Title of the module above, or null at the start of the lesson. */
  afterLabel: string | null
  /** Title of the module below, or null at the end. */
  beforeLabel: string | null
  onOpen: () => void
}) {
  return (
    <div className="group relative flex items-center py-1">
      <span aria-hidden className="h-px flex-1 border-t border-dashed border-gray-300" />
      <button
        id={buttonId}
        type="button"
        onClick={onOpen}
        aria-label={`Add a module ${positionPhrase(afterLabel, beforeLabel)}`}
        className="mx-2 rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 opacity-0 transition-opacity hover:bg-indigo-50 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
      >
        + Add a module here
      </button>
      <span aria-hidden className="h-px flex-1 border-t border-dashed border-gray-300" />
    </div>
  )
}

/** Spoken position, so the button's name says WHERE, not just "add". */
export function positionPhrase(afterLabel: string | null, beforeLabel: string | null): string {
  if (!afterLabel && beforeLabel) return `at the start of the lesson, before “${beforeLabel}”`
  if (afterLabel && !beforeLabel) return `at the end of the lesson, after “${afterLabel}”`
  if (afterLabel && beforeLabel) return `between “${afterLabel}” and “${beforeLabel}”`
  return 'as the first module in the lesson'
}
