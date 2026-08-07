'use client'

import { useState } from 'react'
import { TrackIcon } from '@/components/ui/TrackIcon'

export interface BuilderClass {
  id: string
  name: string
  period: string | null
}

/** "Period 1 · Civics A", or just the name when there is no period. */
export function classLabel(c: BuilderClass): string {
  return c.period ? `${c.period} · ${c.name}` : c.name
}

export function formatClassList(names: string[]): string {
  if (names.length === 0) return 'no classes'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Who am I editing for?
 *
 * Scope is a property of the editing SESSION, not of each individual save.
 * This replaces two competing controls that could disagree — ScopeSwitcher's
 * active-class tab and StepContentEditor's per-step "Apply to" checkboxes —
 * with one bar that never scrolls away.
 *
 * The default is EVERY class. A teacher with five periods overwhelmingly wants
 * the same change everywhere; making them opt in five times per edit is the
 * chore. A narrowed scope is the exception and is styled like one (amber +
 * flag icon + words, never colour alone).
 */
export function ClassScopeBar({
  classes,
  applyClassIds,
  viewingClassId,
  onChangeApply,
  onChangeViewing,
}: {
  classes: BuilderClass[]
  applyClassIds: string[]
  viewingClassId: string
  onChangeApply: (ids: string[]) => void
  onChangeViewing: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const all = applyClassIds.length === classes.length
  const names = classes.filter((c) => applyClassIds.includes(c.id)).map(classLabel)

  // One class: there is no decision to make, so don't render a control at all.
  if (classes.length === 1) {
    return (
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-1 py-2 text-sm text-gray-700 backdrop-blur">
        <span className="font-semibold text-gray-900">Your class:</span> {classLabel(classes[0])}
      </div>
    )
  }

  return (
    <div
      className={`sticky top-0 z-10 border-b bg-white/95 px-1 py-2 backdrop-blur ${
        all ? 'border-gray-200' : 'border-amber-300'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {all ? (
          <p className="text-sm text-gray-800">
            <TrackIcon name="check" className="mr-1 inline h-4 w-4 text-green-700" aria-hidden />
            <span className="font-semibold">
              Changes you make apply to all {classes.length} of your classes.
            </span>
          </p>
        ) : (
          <p className="text-sm text-amber-900">
            <TrackIcon name="flag" className="mr-1 inline h-4 w-4 text-amber-700" aria-hidden />
            <span className="font-semibold">
              Only {formatClassList(names)} will see these changes.
            </span>{' '}
            Your other {classes.length - applyClassIds.length} class
            {classes.length - applyClassIds.length === 1 ? '' : 'es'} keep the version they have
            now.
          </p>
        )}

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-gray-400 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50"
        >
          {open ? 'Done' : 'Change…'}
        </button>

        <label className="ml-auto flex items-center gap-2 text-xs text-gray-700">
          Showing
          <select
            value={viewingClassId}
            onChange={(e) => onChangeViewing(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {open && (
        <fieldset className="mt-2 rounded-md border border-gray-300 bg-gray-50 p-3">
          <legend className="px-1 text-xs font-semibold text-gray-700">
            Which classes are you editing?
          </legend>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <input
              type="checkbox"
              checked={all}
              ref={(el) => {
                if (el) el.indeterminate = !all && applyClassIds.length > 0
              }}
              onChange={(e) => onChangeApply(e.target.checked ? classes.map((c) => c.id) : [])}
            />
            All my classes
          </label>
          <div className="mt-1 space-y-1 pl-5">
            {classes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={applyClassIds.includes(c.id)}
                  onChange={(e) =>
                    onChangeApply(
                      e.target.checked
                        ? [...applyClassIds, c.id]
                        : applyClassIds.filter((id) => id !== c.id)
                    )
                  }
                />
                {classLabel(c)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

/**
 * The Save button's own label states the scope, so it cannot be missed at the
 * moment it matters. Names, not counts — "Save for 2 classes" doesn't tell you
 * WHICH two.
 */
export function saveLabelFor(classes: BuilderClass[], applyClassIds: string[]): string {
  if (classes.length <= 1) return 'Save'
  if (applyClassIds.length === classes.length) return `Save for all ${classes.length} classes`
  const names = classes.filter((c) => applyClassIds.includes(c.id)).map(classLabel)
  if (names.length === 0) return 'Pick a class first'
  if (names.length === 1) return `Save for ${names[0]} only`
  return `Save for ${formatClassList(names)}`
}
