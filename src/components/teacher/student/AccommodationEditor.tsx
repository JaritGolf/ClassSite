'use client'

import { useState, useTransition } from 'react'
import type { StudentProfileVM } from '@/lib/student-profile'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import {
  getAccommodationEnforcement,
  type AccommodationEnforcementStatus,
} from '@/lib/accommodations'

/**
 * What granting a code actually does, shown next to every row.
 *
 * This exists because the opposite was true until 2026-08-08: seven codes were
 * grantable and audit-logged with no implementing code, so a teacher
 * transcribing an IEP got a green "✓ Granted" chip and no support. A teacher
 * must be able to see, at the moment of granting, whether the platform will act
 * on it.
 */
const STATUS_CHIP: Record<
  AccommodationEnforcementStatus,
  { label: string; className: string }
> = {
  enforced: {
    label: 'Active',
    className: 'bg-green-50 text-green-800 ring-1 ring-green-200',
  },
  'satisfied-by-design': {
    label: 'Already met',
    className: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
  },
  'not-implemented': {
    label: 'Not built yet',
    className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-300',
  },
}

const UNKNOWN_CHIP = {
  label: 'Unknown',
  className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-300',
}

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
      <ExplainerHover
        title="Accommodations"
        text="Grant a code here and it flows through every assessment automatically — reading-level adjustments, extra breaks, translated glosses, and more, without the student needing to do anything."
        theme="admin"
      >
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Accommodations</h2>
      </ExplainerHover>
      <p className="mb-3 text-xs text-gray-500">
        Granted accommodations flow through every assessment automatically. The tag on each row
        says what the platform does with it.
      </p>
      <ul className="space-y-2" role="list">
        {catalog.map((a) => {
          const active = activeCodes.has(a.code)
          const enforcement = getAccommodationEnforcement(a.code)
          const chip = enforcement ? STATUS_CHIP[enforcement.status] : UNKNOWN_CHIP
          const explainerText =
            enforcement?.summary ??
            'This code is not in the enforcement registry, so it is not known whether anything acts on it. Treat it as not built.'
          const surfaceLine =
            enforcement && enforcement.surfaces.length > 0
              ? ` Applies on: ${enforcement.surfaces.join(', ')}.`
              : ''

          return (
            <li
              key={a.code}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs font-medium text-indigo-600">{a.code}</span>
                <span className="ml-2 text-xs text-gray-600">{a.name}</span>
                <ExplainerHover
                  title={chip.label}
                  text={`${explainerText}${surfaceLine}`}
                  theme="admin"
                  variant="plain"
                  focusable
                  wrapperClassName="ml-2"
                >
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.className}`}
                  >
                    {chip.label}
                  </span>
                </ExplainerHover>
              </div>
              <button
                onClick={() => toggleAccommodation(a.code, active)}
                disabled={pending}
                aria-label={`${active ? 'Revoke' : 'Grant'} accommodation ${a.code}`}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
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
