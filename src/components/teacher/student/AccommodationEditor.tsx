'use client'

import { useState, useTransition } from 'react'
import type { StudentProfileVM } from '@/lib/student-profile'

interface CatalogItem {
  code: string
  name: string
}

interface AccommodationEditorProps {
  studentId: string
  accommodations: StudentProfileVM['accommodations']
  /** Full accommodation catalog so any code can be granted, not just on-record ones. */
  catalog: CatalogItem[]
}

export function AccommodationEditor({
  studentId,
  accommodations,
  catalog,
}: AccommodationEditorProps) {
  const [pending, startTransition] = useTransition()
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  // Set of active codes for this student, seeded from on-record accommodations.
  const [activeCodes, setActiveCodes] = useState<Set<string>>(
    () => new Set(accommodations.filter((a) => a.active).map((a) => a.code))
  )

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
            reason: 'Toggled via student profile editor',
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          setStatusMsg(`Error: ${data.error ?? 'Unknown error'}`)
          return
        }

        setActiveCodes((prev) => {
          const next = new Set(prev)
          if (currentActive) next.delete(code)
          else next.add(code)
          return next
        })
        setStatusMsg(`Accommodation ${code} ${!currentActive ? 'activated' : 'deactivated'}.`)
      } catch {
        setStatusMsg('Network error. Please try again.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">Accommodations</h2>
      <p className="mb-3 text-xs text-gray-500">
        Granted accommodations flow through every assessment automatically.
      </p>
      <ul className="space-y-2" role="list">
        {catalog.map((a) => {
          const active = activeCodes.has(a.code)
          return (
            <li
              key={a.code}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <div>
                <span className="font-mono text-xs font-medium text-indigo-600">{a.code}</span>
                <span className="ml-2 text-xs text-gray-600">{a.name}</span>
              </div>
              <button
                onClick={() => toggleAccommodation(a.code, active)}
                disabled={pending}
                aria-label={`${active ? 'Revoke' : 'Grant'} accommodation ${a.code}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {active ? '✓ Granted' : 'Grant'}
              </button>
            </li>
          )
        })}
      </ul>
      {statusMsg && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-indigo-600">
          {statusMsg}
        </p>
      )}
    </div>
  )
}
