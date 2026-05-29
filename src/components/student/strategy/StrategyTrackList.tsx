'use client'

/**
 * StrategyTrackList
 *
 * Renders the 7 Test-Taking Strategy missions (spec §19.2) with a one-tap
 * "Got it" completion that POSTs to /api/strategy/[code]/complete. Missions are
 * independent — no prerequisite locking.
 */

import { useState } from 'react'
import type { StrategyMission } from '@/lib/strategy-track'

interface StrategyTrackListProps {
  missions: StrategyMission[]
  completedCodes: string[]
}

export function StrategyTrackList({ missions, completedCodes }: StrategyTrackListProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedCodes))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleComplete(code: string) {
    setBusy(code)
    setError(null)
    try {
      const res = await fetch(`/api/strategy/${code}/complete`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not save your progress.')
      }
      setCompleted((prev) => new Set(prev).add(code))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your progress.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {missions.map((m) => {
        const done = completed.has(m.code)
        return (
          <div key={m.code} className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-purple-600">
                Strategist
              </span>
              {done && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  ✓ Completed
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{m.title}</h2>
            <p className="text-sm text-gray-600">{m.objective}</p>
            <p className="text-sm text-gray-700">{m.instructions}</p>
            <details className="text-sm">
              <summary className="cursor-pointer select-none text-purple-600 hover:underline">
                💡 Strategy tip
              </summary>
              <p className="mt-2 border-l-2 border-purple-200 pl-4 text-gray-600">{m.tip}</p>
            </details>
            {!done && (
              <button
                onClick={() => handleComplete(m.code)}
                disabled={busy === m.code}
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {busy === m.code ? 'Saving…' : 'Got it — mark complete'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
