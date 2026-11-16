'use client'

/**
 * Source Decoder track. Which levels are finished is remembered on this
 * device; nothing is sent anywhere when a level is completed.
 */

import { SourceDecoderMission } from './SourceDecoderMission'
import type { SourceDecoderMission as MissionDef } from '@/lib/reading-load'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import {
  completeSourceDecoderLevel,
  recordStreakActivity,
  setLastActivity,
} from '@/lib/local-progress/engine'

interface SourceDecoderTrackProps {
  missions: MissionDef[]
  sampleStimulus?: string
}

export function SourceDecoderTrack({ missions, sampleStimulus }: SourceDecoderTrackProps) {
  const { progress, hydrated, update } = useLocalProgress()

  if (!hydrated) {
    return <p className="py-8 text-center text-base text-gray-600">Loading your levels…</p>
  }

  const completed = new Set(Object.keys(progress.sourceDecoder).map(Number))

  function handleComplete(level: number) {
    const now = new Date()
    update((p) =>
      setLastActivity(
        recordStreakActivity(completeSourceDecoderLevel(p, level, now), now),
        { label: 'Source Decoder', subLabel: 'Keep levelling up your reading', href: '/student/source-decoder', icon: 'search' },
        now
      )
    )
  }

  return (
    <div className="space-y-4">
      {missions.map((mission) => (
        <SourceDecoderMission
          key={mission.level}
          mission={mission}
          isCompleted={completed.has(mission.level)}
          isLocked={mission.level > 1 && !completed.has(mission.level - 1)}
          stimulusContent={sampleStimulus}
          onComplete={() => handleComplete(mission.level)}
        />
      ))}
    </div>
  )
}
