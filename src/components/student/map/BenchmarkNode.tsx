import Link from 'next/link'

interface BenchmarkNodeProps {
  id: string
  code: string
  title: string
  status: string
  masteryScore: number | null
}

const STATUS_STYLES: Record<string, string> = {
  MASTERED: 'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  NEEDS_REMEDIATION: 'bg-amber-100 text-amber-800 border-amber-200',
  REMEDIATION_COMPLETE: 'bg-amber-50 text-amber-700 border-amber-100',
  EXPOSURE_COMPLETE: 'bg-gray-100 text-gray-600 border-gray-200',
  TEACHER_OVERRIDE: 'bg-purple-100 text-purple-800 border-purple-200',
  INTERVENTION_REQUIRED: 'bg-red-100 text-red-800 border-red-200',
  NOT_STARTED: 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  MASTERED: 'Mastered',
  IN_PROGRESS: 'In Progress',
  NEEDS_REMEDIATION: 'Needs Remediation',
  REMEDIATION_COMPLETE: 'Remediation Complete',
  EXPOSURE_COMPLETE: 'Exposure Complete',
  TEACHER_OVERRIDE: 'Override',
  INTERVENTION_REQUIRED: 'Intervention Required',
  NOT_STARTED: 'Not Started',
  READY_FOR_MASTERY: 'Ready for Challenge',
}

const LOCKED_STATUSES = new Set(['NOT_STARTED'])

export function BenchmarkNode({ code, title, status, masteryScore }: BenchmarkNodeProps) {
  const locked = LOCKED_STATUSES.has(status)
  const chipStyle = STATUS_STYLES[status] ?? STATUS_STYLES.NOT_STARTED
  const label = STATUS_LABELS[status] ?? status

  const inner = (
    <div
      data-testid="benchmark-node"
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
        locked ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'hover:bg-white border-gray-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex-1">
        <p className="text-xs font-mono text-gray-600">{code}</p>
        <p className="text-sm font-medium text-gray-800">{title}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${chipStyle}`}>
          {label}
        </span>
        {masteryScore !== null && (
          <span className="text-xs text-gray-500">{Math.round(masteryScore * 100)}%</span>
        )}
      </div>
    </div>
  )

  if (locked) return inner

  return (
    <Link href={`/student/mission/${code}`} className="block">
      {inner}
    </Link>
  )
}
