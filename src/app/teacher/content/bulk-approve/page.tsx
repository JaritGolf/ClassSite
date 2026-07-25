'use client'

import { useState } from 'react'
import { BulkApproveConfirmDialog } from '@/components/teacher/content/BulkApproveConfirmDialog'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { BulkApproveCriteria, ApprovableEntity } from '@/lib/content-approval'

const ENTITY_TYPES: ApprovableEntity[] = [
  'QUESTION', 'LESSON', 'TERM', 'RESOURCE', 'REMEDIATION_ITEM', 'STIMULUS', 'MISCONCEPTION',
]

export default function BulkApprovePage() {
  const [entityType, setEntityType] = useState<ApprovableEntity>('QUESTION')
  const [benchmarkId, setBenchmarkId] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  const criteria: BulkApproveCriteria = {
    entityType,
    ...(benchmarkId ? { benchmarkId } : {}),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        <ExplainerHover
          theme="admin"
          variant="underline"
          title="Bulk Approve Content"
          text="Approve every matching item at once instead of one-by-one in the queue — you'll see exactly what matches before anything is approved."
        >
          Bulk Approve Content
        </ExplainerHover>
      </h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity Type
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as ApprovableEntity)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-full"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Benchmark ID (optional)
          </label>
          <input
            type="text"
            value={benchmarkId}
            onChange={(e) => setBenchmarkId(e.target.value)}
            placeholder="Leave blank to match all benchmarks"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-full"
          />
        </div>

        <button
          onClick={() => setShowDialog(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Preview &amp; Approve
        </button>
      </div>

      {showDialog && (
        <BulkApproveConfirmDialog
          criteria={criteria}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            setShowDialog(false)
            window.location.href = '/teacher/content'
          }}
        />
      )}
    </div>
  )
}
