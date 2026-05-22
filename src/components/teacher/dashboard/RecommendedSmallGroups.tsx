import type { SmallGroup } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

interface RecommendedSmallGroupsProps {
  groups: SmallGroup[]
}

export function RecommendedSmallGroups({ groups }: RecommendedSmallGroupsProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Recommended Small Groups</h2>
        <EmptyState title="No groups suggested yet" body="Groups form when 2+ students share the same top misconceptions on an active benchmark." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Recommended Small Groups</h2>
      <ul className="space-y-3" role="list">
        {groups.map((group) => (
          <li key={group.groupId} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-medium text-indigo-700">{group.benchmarkCode}</span>
              <span className="text-xs text-gray-500">{group.studentIds.length} students</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">
              Misconceptions: {group.misconceptionCodes.join(', ')}
            </p>
            <p className="text-xs text-indigo-600 italic">{group.suggestedAction}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
