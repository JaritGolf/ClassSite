'use client'

/**
 * The completion code a student pastes into Google Classroom.
 *
 * The code is proof that this mission's Mastery Challenge was passed with this
 * score on this date. It contains no name and no id — the teacher knows whose
 * it is only because of where the student pasted it.
 */

import { useState } from 'react'

export function CompletionCodeCard({
  code,
  missionTitle,
  compact = false,
}: {
  code: string
  missionTitle?: string
  compact?: boolean
}) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied('copied')
    } catch {
      // Clipboard blocked (some managed Chromebooks) — the code is selectable.
      setCopied('failed')
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 border-green-300 bg-green-50 text-left ${compact ? 'p-3' : 'p-5'}`}
    >
      <p className="font-display text-xs font-bold uppercase tracking-widest text-green-800">
        Your completion code
      </p>
      {!compact && (
        <p className="mt-1 text-base text-green-950">
          Copy this code and paste it into the assignment in Google Classroom
          {missionTitle ? ` for “${missionTitle}”` : ''}. That is how your teacher knows you
          finished.
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code
          data-testid="completion-code"
          className="select-all rounded-xl border-2 border-green-300 bg-white px-3 py-2 font-mono text-base font-bold tracking-wide text-gray-900"
        >
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="rounded-2xl border-b-4 border-green-800 bg-green-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-green-500 active:translate-y-[3px] active:border-b-0"
        >
          Copy code
        </button>
        <span role="status" className="text-sm font-semibold text-green-900">
          {copied === 'copied' && 'Copied!'}
          {copied === 'failed' && 'Copying is blocked here — select the code and copy it yourself.'}
        </span>
      </div>
      {!compact && (
        <p className="mt-2 text-sm text-green-900">
          You can find this code again any time on this mission&apos;s page.
        </p>
      )}
    </div>
  )
}
