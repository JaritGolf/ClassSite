'use client'

/**
 * ClassPicker — selects which class the current class-scoped report is for.
 *
 * Navigates by updating the `classId` search param (keeping the caller's tab),
 * so the RSC page re-runs the report builder server-side for the chosen class.
 */

import { useRouter, useSearchParams } from 'next/navigation'

interface ClassOption {
  id: string
  name: string
  period: string | null
  studentCount: number
}

interface ClassPickerProps {
  classes: ClassOption[]
  selectedClassId: string
  /** Which tab to stay on when the class changes. */
  tab?: 'daily' | 'activity'
}

export function ClassPicker({
  classes,
  selectedClassId,
  tab = 'daily',
}: ClassPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    params.set('classId', e.target.value)
    router.push(`?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-600">Class</span>
      <select
        value={selectedClassId}
        onChange={handleChange}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.period ? ` · Period ${c.period}` : ''} ({c.studentCount})
          </option>
        ))}
      </select>
    </label>
  )
}
