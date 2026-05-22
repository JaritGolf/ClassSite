import type { StudentProfileVM } from '@/lib/student-profile'

interface StudentProfileHeaderProps {
  profile: StudentProfileVM
}

export function StudentProfileHeader({ profile }: StudentProfileHeaderProps) {
  const { student, currentMission, accommodations } = profile
  const activeAccommodations = accommodations.filter((a) => a.active)

  return (
    <div className="rounded-2xl bg-indigo-700 text-white p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{student.displayName}</h1>
          <p className="text-indigo-200 text-sm mt-0.5">
            Grade {student.gradeLevel}
            {student.ellStatus && (
              <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium">
                ELL: {student.ellStatus}
              </span>
            )}
          </p>
        </div>
        {currentMission && (
          <div className="rounded-lg bg-indigo-600 px-3 py-2 text-right shrink-0">
            <p className="text-xs text-indigo-200">Current Mission</p>
            <p className="text-sm font-semibold font-mono">{currentMission.benchmarkCode}</p>
            <p className="text-xs text-indigo-300">{currentMission.status.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>

      {activeAccommodations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1" aria-label="Active accommodations">
          {activeAccommodations.map((a) => (
            <span
              key={a.code}
              className="rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-medium text-white"
              title={a.name}
            >
              {a.code}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
