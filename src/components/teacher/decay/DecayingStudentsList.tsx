/**
 * DecayingStudentsList — list of students currently showing decay on a given benchmark.
 * Used within the benchmark detail page's spaced health section.
 */

interface DecayingStudent {
  studentId: string
  displayName: string
  benchmarkCode: string
  lastQuality: number
}

interface Props {
  students: DecayingStudent[]
}

export function DecayingStudentsList({ students }: Props) {
  if (students.length === 0) return null

  return (
    <ul className="mt-3 space-y-1" role="list">
      {students.map((s) => (
        <li
          key={`${s.studentId}-${s.benchmarkCode}`}
          className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-1.5 text-xs"
        >
          <span className="font-medium text-red-800">{s.displayName}</span>
          <span className="text-red-600">
            {s.benchmarkCode} — quality {s.lastQuality}
          </span>
        </li>
      ))}
    </ul>
  )
}
