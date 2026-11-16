'use client'

/**
 * The Mission Map, with each node's state worked out on the device from
 * device-local progress. The server supplied the missions; it does not know
 * which ones this student has finished.
 */

import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { missionAvailability } from '@/lib/local-progress/engine'
import { useStudentShell } from '@/components/student/shell/StudentShell'
import { MissionMap } from './MissionMap'

export function MissionMapClient() {
  const shell = useStudentShell()
  const { progress, hydrated } = useLocalProgress()

  if (!hydrated) {
    return <p className="py-12 text-center text-base text-gray-600">Loading your map…</p>
  }

  const availability = missionAvailability(shell.missions, progress)

  const map = shell.units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    sequenceOrder: unit.sequenceOrder,
    gameRegionName: unit.gameRegionName,
    benchmarks: unit.benchmarks.map((b) => {
      const node = availability.get(b.code)
      return {
        id: b.code,
        code: b.code,
        title: b.title,
        state: node?.state ?? ('COMING_SOON' as const),
        masteryScore: progress.missions[b.code]?.masteryScore ?? null,
        openable: node?.openable ?? false,
      }
    }),
  }))

  return <MissionMap map={map} />
}
