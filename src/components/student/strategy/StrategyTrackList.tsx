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
          <div key={m.code} className="space-y-2 rounded-2xl border-2 border-purple-100 bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-purple-600">
                Strategist
              </span>
              {done && (
                <span className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                  ✓ Completed
                </span>
              )}
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">{m.title}</h2>
            <p className="text-base text-gray-600">{m.objective}</p>
            <p className="text-base leading-7 text-gray-700">{m.instructions}</p>
            <details className="text-base">
              <summary className="cursor-pointer select-none font-semibold text-purple-700 hover:underline">
                💡 Strategy tip
              </summary>
              <p className="mt-2 rounded-r-xl border-l-4 border-purple-300 bg-purple-50 py-2 pl-4 pr-3 text-gray-700">{m.tip}</p>
            </details>
            {!done && (
              <button
                onClick={() => handleComplete(m.code)}
                disabled={busy === m.code}
                className="rounded-2xl border-b-4 border-purple-800 bg-purple-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-purple-500 active:translate-y-[3px] active:border-b-0 disabled:opacity-50"
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
