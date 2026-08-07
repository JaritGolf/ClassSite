'use client'

import { useEffect, useRef } from 'react'

/**
 * An inline confirmation strip, used instead of window.confirm.
 *
 * window.confirm is invisible to axe, cannot be styled, cannot name the
 * classes a change will affect, and always focuses the OK button. Three call
 * sites in this codebase still use it; this is the replacement, not a fourth.
 *
 * Focus lands on the heading, the SAFE button is focused first, and Escape
 * cancels and returns focus to whatever opened the strip.
 */
export function ConfirmInline({
  heading,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  heading: string
  body: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const headingRef = useRef<HTMLParagraphElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-labelledby="confirm-inline-heading"
      aria-describedby="confirm-inline-body"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
      className={`mt-2 rounded-md border-2 p-3 ${
        destructive ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50'
      }`}
    >
      <p
        id="confirm-inline-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-sm font-bold text-gray-900 outline-none"
      >
        {heading}
      </p>
      <p id="confirm-inline-body" className="mt-1 text-sm text-gray-700">
        {body}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Safe action first in the DOM AND focused, so a hurried Enter can
            never be the destructive one. */}
        <button
          type="button"
          ref={cancelRef}
          autoFocus
          onClick={onCancel}
          className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${
            destructive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
