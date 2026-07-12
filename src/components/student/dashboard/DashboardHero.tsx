import Link from 'next/link'
import { Mascot } from '@/components/ui/Mascot'

interface DashboardHeroProps {
  currentMission: { benchmarkCode: string; title: string; status: string } | null
  studentName: string | null | undefined
}

export function DashboardHero({ currentMission, studentName }: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-b-4 border-indigo-900 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
      {/* Decorative rays */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 text-white/10"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="50" />
        <circle cx="50" cy="50" r="34" className="text-white/10" fill="currentColor" />
      </svg>

      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold leading-tight">
            Welcome back, {studentName ?? 'Founder'}!
          </h1>
          {currentMission ? (
            <>
              <p className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-indigo-200">
                Current mission
              </p>
              <p className="mt-0.5 text-lg font-bold leading-snug">{currentMission.title}</p>
              <p className="font-mono text-xs text-indigo-200">{currentMission.benchmarkCode}</p>
              <Link
                href={`/student/mission/${currentMission.benchmarkCode}`}
                className="mt-4 inline-block rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-5 py-2.5 font-display text-base font-bold text-amber-950 transition-colors hover:bg-amber-300 active:translate-y-[3px] active:border-b-0"
              >
                Continue Mission →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-indigo-100">Your Republic Campaign awaits.</p>
              <Link
                href="/student/map"
                className="mt-4 inline-block rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-5 py-2.5 font-display text-base font-bold text-amber-950 transition-colors hover:bg-amber-300 active:translate-y-[3px] active:border-b-0"
              >
                View Mission Map →
              </Link>
            </>
          )}
        </div>
        <Mascot pose="pointing" className="h-28 w-28 flex-shrink-0 animate-float sm:h-32 sm:w-32" />
      </div>
    </div>
  )
}
