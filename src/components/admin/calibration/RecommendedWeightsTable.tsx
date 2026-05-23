interface WeightChange {
  current: number
  recommended: number
  deltaPercent: number
}

interface RecommendedWeightsTableProps {
  recommendedWeightChanges: Record<string, WeightChange>
}

export function RecommendedWeightsTable({ recommendedWeightChanges }: RecommendedWeightsTableProps) {
  const entries = Object.entries(recommendedWeightChanges)
  if (entries.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Reporting Category</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Current Weight</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Recommended</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map(([name, change]) => {
            const delta = change.deltaPercent
            const deltaColor = delta > 2 ? 'text-green-600' : delta < -2 ? 'text-red-600' : 'text-gray-500'
            return (
              <tr key={name} className="bg-white">
                <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {(change.current * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                  {(change.recommended * 100).toFixed(1)}%
                </td>
                <td className={`px-4 py-3 text-right font-medium ${deltaColor}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
