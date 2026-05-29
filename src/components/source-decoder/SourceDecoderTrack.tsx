'use client'

/**
 * SourceDecoderTrack
 *
 * Client wrapper that renders the 4-level Source Decoder progression and wires
 * each level's completion to POST /api/source-decoder/[level]/complete.
 * A level is locked until the previous level is completed (spec §16.4).
 */

import { useState } from 'react'
import { SourceDecoderMission } from './SourceDecoderMission'
import type { SourceDecoderMission as MissionDef } from '@/lib/reading-load'

interface SourceDecoderTrackProps {
  missions: MissionDef[]
  /** Levels (1-4) the student has already completed */
  completedLevels: number[]
  /** Optional sample passage shown with the missions */
  sampleStimulus?: string
}

export function SourceDecoderTrack({
  missions,
  completedLevels,
  sampleStimulus,
}: SourceDecoderTrackProps) {
  const [completed, setCompleted] = useState<Set<number>>(new Set(completedLevels))
  const [error, setError] = useState<string | null>(null)

  async function handleComplete(level: number) {
    setError(null)
    try {
      const res = await fetch(`/api/source-decoder/${level}/complete`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not save your progress.')
      }
      setCompleted((prev) => new Set(prev).add(level))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your progress.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {missions.map((mission) => {
        const isCompleted = completed.has(mission.level)
        const isLocked = mission.level > 1 && !completed.has(mission.level - 1)
        return (
          <SourceDecoderMission
            key={mission.level}
            mission={mission}
            isCompleted={isCompleted}
            isLocked={isLocked}
            stimulusContent={sampleStimulus}
            onComplete={() => handleComplete(mission.level)}
          />
        )
      })}
    </div>
  )
}
