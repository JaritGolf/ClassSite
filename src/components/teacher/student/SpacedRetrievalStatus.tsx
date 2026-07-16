import type { StudentProfileVM } from '@/lib/student-profile'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface SpacedRetrievalStatusProps {
  spacedRetrieval: StudentProfileVM['spacedRetrieval']
  decayFlags: StudentProfileVM['decayFlags']
}

export function SpacedRetrievalStatus({
  spacedRetrieval,
  decayFlags,
}: SpacedRetrievalStatusProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Spaced Retrieval"
        text="This student's SM-2 review schedule — the questions they're due to see again in their Daily Drill, spaced out based on how well they've remembered them."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Spaced Retrieval</h2>
      </ExplainerHover>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{spacedRetrieval.itemsDueCount}</p>
          <ExplainerHover
            title="Items Due"
            text="How many review items are due today across all this student's mastered benchmarks."
            theme="admin"
          >
            <p className="text-xs text-gray-400 mt-0.5">Items Due</p>
          </ExplainerHover>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-700">
            {spacedRetrieval.avgIntervalDays}d
          </p>
          <ExplainerHover
            title="Avg Interval"
            text="The average number of days between reviews across this student's items — longer means the SM-2 schedule trusts their memory more."
            theme="admin"
          >
            <p className="text-xs text-gray-400 mt-0.5">Avg Interval</p>
          </ExplainerHover>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs font-medium text-gray-600">
            {spacedRetrieval.nextReviewAt
              ? new Date(spacedRetrieval.nextReviewAt).toLocaleDateString()
              : '—'}
          </p>
          <ExplainerHover
            title="Next Review"
            text="The soonest date this student has an item due for spaced review."
            theme="admin"
          >
            <p className="text-xs text-gray-400 mt-0.5">Next Review</p>
          </ExplainerHover>
        </div>
      </div>

      {decayFlags.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-gray-600">Decaying Benchmarks</p>
            <AlertBadge tone="warn">{decayFlags.length}</AlertBadge>
          </div>
          <ul className="space-y-1" role="list">
            {decayFlags.map((d, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md bg-yellow-50 px-2.5 py-1.5 text-xs"
              >
                <span className="font-mono text-yellow-700">{d.benchmarkCode}</span>
                <span className="text-gray-500">
                  Quality {d.lastQuality} · {d.daysOverdue}d overdue
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
