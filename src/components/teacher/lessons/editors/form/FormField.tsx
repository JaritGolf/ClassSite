'use client'

/**
 * Shared field wrapper for every lesson-content editor form: a real
 * `<label>`, the input/textarea/select passed as children, and a
 * `role="alert"` error message wired via aria-invalid/aria-describedby.
 * Matches the plain admin/LMS palette already used elsewhere in the teacher
 * surface (StepVisibilityControls, ScoreImportForm, OverrideControl).
 */

import { useId } from 'react'

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => React.ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-800">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClasses =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

export const textareaClasses = `${inputClasses} min-h-[5rem]`
