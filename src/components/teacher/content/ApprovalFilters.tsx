'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { ApprovableEntity } from '@/lib/content-approval'

const ENTITY_TYPES: { value: ApprovableEntity | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'QUESTION', label: 'Questions' },
  { value: 'LESSON', label: 'Lessons' },
  { value: 'TERM', label: 'Terms' },
  { value: 'RESOURCE', label: 'Resources' },
  { value: 'REMEDIATION_ITEM', label: 'Remediation Items' },
  { value: 'STIMULUS', label: 'Stimuli' },
  { value: 'MISCONCEPTION', label: 'Misconceptions' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Needs attention' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'NEEDS_REVISION', label: 'Needs Revision' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export function ApprovalFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [entityType, setEntityType] = useState(searchParams.get('entityType') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')

  function applyFilters() {
    const params = new URLSearchParams()
    if (entityType) params.set('entityType', entityType)
    if (status) params.set('status', status)
    router.push(`/teacher/content?${params.toString()}`)
  }

  function resetFilters() {
    setEntityType('')
    setStatus('')
    router.push('/teacher/content')
  }

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={applyFilters}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Apply
      </button>
      <button
        onClick={resetFilters}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        Reset
      </button>
    </div>
  )
}
