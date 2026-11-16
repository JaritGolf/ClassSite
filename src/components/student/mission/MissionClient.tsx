'use client'

/**
 * Decides, on the device, how a mission page opens:
 *
 *   - not reached yet        → a "not open yet" panel
 *   - already mastered       → the read-only review
 *   - anything else          → the mission flow
 *
 * The server sent the same mission content it would send anyone. Whether THIS
 * student has reached or finished it is known only here.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { missionAvailability } from '@/lib/local-progress/engine'
import { useStudentShell } from '@/components/student/shell/StudentShell'
import { Mascot } from '@/components/ui/Mascot'
import { MissionFlow, type MissionData } from './MissionFlow'
import { MissionReview } from './MissionReview'

type Mode = 'flow' | 'review' | 'locked' | 'coming-soon'

export function MissionClient({ mission, playable }: { mission: MissionData; playable: boolean }) {
  const shell = useStudentShell()
  const { progress, hydrated } = useLocalProgress()
  // Chosen ONCE, on arrival. Mastering the mission while on this page must not
  // swap the flow out for the review mid-celebration.
  const [mode, setMode] = useState<Mode | null>(null)

  useEffect(() => {
    if (!hydrated || mode !== null) return
    if (!playable) {
      setMode('coming-soon')
      return
    }
    const node = missionAvailability(shell.missions, progress).get(mission.benchmarkCode)
    if (!node?.openable) setMode('locked')
    else if (progress.missions[mission.benchmarkCode]?.status === 'MASTERED') setMode('review')
    else setMode('flow')
  }, [hydrated, mode, playable, progress, shell.missions, mission.benchmarkCode])

  if (mode === null) {
    return <p className="py-12 text-center text-base text-gray-600">Loading your mission…</p>
  }

  if (mode === 'locked' || mode === 'coming-soon') {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-6 text-center shadow-card">
        <Mascot pose="thinking" className="mx-auto h-24 w-24" />
        <h2 className="font-display text-xl font-bold text-gray-900">
          {mode === 'locked' ? 'This mission is not open yet' : 'This mission is coming soon'}
        </h2>
        <p className="text-base text-gray-700">
          {mode === 'locked'
            ? 'Finish the mission before this one on your map and it will open.'
            : 'There is nothing to do here yet — it will open when it is ready.'}
        </p>
        <Link
          href="/student/map"
          className="inline-block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
        >
          Back to the Mission Map
        </Link>
      </div>
    )
  }

  if (mode === 'review') {
    const record = progress.missions[mission.benchmarkCode]
    return (
      <MissionReview
        mission={{
          benchmarkCode: mission.benchmarkCode,
          benchmarkTitle: mission.benchmarkTitle,
          lessonSummary: mission.lessonSummary,
          lessonBody: mission.lessonBody,
          studentFriendlyTarget: mission.studentFriendlyTarget,
          lessonSteps: mission.lessonSteps,
          terms: mission.terms,
          glossaryTerms: mission.glossaryTerms,
          masteryAttempts: record?.masteryAttempts ?? [],
          completionCode: record?.completionCode ?? null,
        }}
      />
    )
  }

  return <MissionFlow mission={mission} />
}
