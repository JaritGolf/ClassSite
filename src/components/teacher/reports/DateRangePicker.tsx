'use client'

/**
 * DateRangePicker — scopes the Activity tab to a date window.
 *
 * Navigates by updating a `range` search param, so the RSC page re-runs the
 * report server-side. Same pattern as ClassPicker; no client data fetching.
 */

import { useRouter, useSearchParams } from 'next/navigation'

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const

export type RangeValue = (typeof RANGE_OPTIONS)[number]['value']

export function DateRangePicker({ selected }: { selected: RangeValue }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'activity')
    params.set('range', e.target.value)
    router.push(`?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-600">Range</span>
      <select
        value={selected}
        onChange={handleChange}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
