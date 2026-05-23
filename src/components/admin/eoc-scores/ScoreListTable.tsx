interface EocScore {
  id: string
  studentId: string
  schoolYear: string
  scaledScore: number | null
  achievementLevel: number | null
  enteredAt: string | Date
  consentAcknowledged: boolean
  student: {
    user: {
      email: string | null
      firstName: string | null
      lastName: string | null
    }
  }
}

interface ScoreListTableProps {
  scores: EocScore[]
}

export function ScoreListTable({ scores }: ScoreListTableProps) {
  if (scores.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No scores found for this school year.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Student</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">School Year</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Scaled Score</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Level</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Entered</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.map((score) => (
            <tr key={score.id} className="bg-white hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900">
                {score.student.user.firstName} {score.student.user.lastName}
                <span className="block text-xs text-gray-500">{score.student.user.email}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">{score.schoolYear}</td>
              <td className="px-4 py-3 text-right font-mono text-gray-900">
                {score.scaledScore ?? '—'}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {score.achievementLevel ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(score.enteredAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
