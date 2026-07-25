'use client'

/**
 * Visibility controls for one media step (ADR 0015): a global on/off switch
 * plus a per-class Inherit / Show / Hide segmented control. POSTs to
 * /api/teacher/lessons/visibility and refreshes the RSC page state.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClassOverrideRow, PreviewClass } from './LessonPreview'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const ERROR_MESSAGES: Record<string, string> = {
  SUB_MODE_READ_ONLY: 'Substitute mode is read-only.',
  FORBIDDEN: 'You do not own that class.',
  NOT_TOGGLEABLE: 'This step cannot be toggled.',
  NOT_FOUND: 'Step not found — try refreshing.',
}

type ClassState = 'inherit' | 'show' | 'hide'

export function StepVisibilityControls({
  lessonStepId,
  enabled,
  classes,
  overrides,
}: {
  lessonStepId: string
  enabled: boolean
  classes: PreviewClass[]
  overrides: ClassOverrideRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/lessons/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(ERROR_MESSAGES[data.error ?? ''] ?? 'Something went wrong — try again.')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function stateFor(classId: string): ClassState {
    const row = overrides.find((o) => o.classId === classId)
    if (!row) return 'inherit'
    return row.visible ? 'show' : 'hide'
  }

  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-gray-800">Visibility:</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy}
          onClick={() => post({ scope: 'global', lessonStepId, enabled: !enabled })}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            enabled ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
          }`}
        >
          {enabled ? 'On for all classes' : 'Off for all classes'}
        </button>
        <span className="text-xs text-gray-500">
          (global default — class settings below override it)
        </span>
      </div>

      {classes.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {classes.map((cls) => {
            const state = stateFor(cls.id)
            const effective = state === 'inherit' ? enabled : state === 'show'
            return (
              <li key={cls.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[10rem] text-gray-700">
                  {cls.name}
                  {cls.period ? ` (P${cls.period})` : ''}
                </span>
                <ExplainerHover
                  theme="admin"
                  variant="plain"
                  title="Inherit / Show / Hide"
                  text="Inherit follows the global on/off switch above. Show or Hide locks this class to that setting regardless of the global switch."
                >
                  <span
                    role="group"
                    aria-label={`Visibility for ${cls.name}`}
                    className="inline-flex overflow-hidden rounded-md border border-gray-300"
                  >
                    {(['inherit', 'show', 'hide'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={busy}
                        aria-pressed={state === option}
                        onClick={() =>
                          post({ scope: 'class', classId: cls.id, lessonStepId, state: option })
                        }
                        className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
                          state === option
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </span>
                </ExplainerHover>
                <span
                  className={`text-xs font-semibold ${
                    effective ? 'text-green-700' : 'text-amber-700'
                  }`}
                >
                  {effective ? 'shown' : 'hidden'} for this class
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}
