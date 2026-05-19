import Link from 'next/link'

interface DashboardHeroProps {
  currentMission: { benchmarkCode: string; title: string; status: string } | null
  studentName: string | null | undefined
}

export function DashboardHero({ currentMission, studentName }: DashboardHeroProps) {
  return (
    <div className="rounded-2xl bg-indigo-700 text-white p-6 flex flex-col gap-3">
      <h1 className="text-2xl font-bold">
        Welcome back, {studentName ?? 'Founder'}!
      </h1>
      {currentMission ? (
        <>
          <p className="text-indigo-200 text-sm">Current mission</p>
          <p className="text-lg font-semibold">{currentMission.title}</p>
          <p className="text-xs text-indigo-300 font-mono">{currentMission.benchmarkCode}</p>
          <Link
            href={`/student/mission/${currentMission.benchmarkCode}`}
            className="mt-2 self-start rounded-lg bg-white text-indigo-700 px-4 py-2 text-sm font-semibold hover:bg-indigo-50 transition-colors"
          >
            Continue Mission →
          </Link>
        </>
      ) : (
        <>
          <p className="text-indigo-200">Your Republic Campaign awaits.</p>
          <Link
            href="/student/map"
            className="mt-2 self-start rounded-lg bg-white text-indigo-700 px-4 py-2 text-sm font-semibold hover:bg-indigo-50 transition-colors"
          >
            View Mission Map →
          </Link>
        </>
      )}
    </div>
  )
}
