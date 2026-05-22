'use client'

import { useState, useTransition } from 'react'
import type { StudentProfileVM } from '@/lib/student-profile'

interface AccommodationEditorProps {
  studentId: string
  accommodations: StudentProfileVM['accommodations']
}

export function AccommodationEditor({
  studentId,
  accommodations,
}: AccommodationEditorProps) {
  const [pending, startTransition] = useTransition()
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [localAccommodations, setLocalAccommodations] = useState(accommodations)

  async function toggleAccommodation(code: string, currentActive: boolean) {
    setStatusMsg(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/reading-load/accommodation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            accommodationCode: code,
            active: !currentActive,
            reason: `Toggled via student profile editor`,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          setStatusMsg(`Error: ${data.error ?? 'Unknown error'}`)
          return
        }

        setLocalAccommodations((prev) =>
          prev.map((a) => (a.code === code ? { ...a, active: !currentActive } : a))
        )
        setStatusMsg(`Accommodation ${code} ${!currentActive ? 'activated' : 'deactivated'}.`)
      } catch {
        setStatusMsg('Network error. Please try again.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Accommodations</h2>
      {localAccommodations.length === 0 ? (
        <p className="text-xs text-gray-400">No accommodations on record.</p>
      ) : (
        <ul className="space-y-2" role="list">
          {localAccommodations.map((a) => (
            <li
              key={a.code}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <div>
                <span className="font-mono text-xs font-medium text-indigo-600">{a.code}</span>
                <span className="ml-2 text-xs text-gray-600">{a.name}</span>
              </div>
              <button
                onClick={() => toggleAccommodation(a.code, a.active)}
                disabled={pending}
                aria-label={`${a.active ? 'Deactivate' : 'Activate'} accommodation ${a.code}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  a.active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {a.active ? 'Active' : 'Inactive'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {statusMsg && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-xs text-indigo-600"
        >
          {statusMsg}
        </p>
      )}
    </div>
  )
}
