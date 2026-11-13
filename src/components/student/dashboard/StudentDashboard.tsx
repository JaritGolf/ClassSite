'use client'

/**
 * Student dashboard — built entirely from device-local progress.
 *
 * One dominant "do this next" card, a quiet ordered list of what follows, then
 * status. The server contributed the curriculum catalog (via the layout) and
 * nothing else; it never sees any of the numbers shown here.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import {
  currentMissionCode,
  markStorySceneRead,
  masteredCount,
  recordStreakActivity,
} from '@/lib/local-progress/engine'
import { getBeatsForUnitCode } from '@/lib/narrative'
import { useStudentPlan, useStudentShell } from '@/components/student/shell/StudentShell'
import { NextStepCard } from './NextStepCard'
import { ThenList } from './ThenList'
import { ReadinessMeter } from './ReadinessMeter'
import { StreakWidget } from './StreakWidget'
import { BadgeRack } from './BadgeRack'
import { NarrativeOverlay } from '@/components/student/layout/NarrativeOverlay'
import { ProgressBackup } from '@/components/student/ProgressBackup'

export function StudentDashboard() {
  const shell = useStudentShell()
  const { progress, hydrated, update } = useLocalProgress()
  const plan = useStudentPlan()
  const [sceneDismissed, setSceneDismissed] = useState(false)

  // A visit counts toward the streak (once per day; idempotent).
  useEffect(() => {
    if (hydrated) update((p) => recordStreakActivity(p, new Date()))
  }, [hydrated, update])

  // Story scene for the unit the student is currently working in.
  const scene = useMemo(() => {
    if (!hydrated || progress.settings.skipStoryScenes) return null
    const code = currentMissionCode(shell.missions, progress)
    const mission = shell.missions.find((m) => m.code === code)
    const unit =
      shell.units.find((u) => u.id === mission?.unitId) ?? shell.units[0] ?? null
    if (!unit) return null
    const beat = getBeatsForUnitCode(`unit-${unit.sequenceOrder}`).find(
      (b) => !progress.storyScenesRead.includes(b.beatKey)
    )
    return beat ? { beatKey: beat.beatKey, npcName: beat.npcName, dialogue: beat.dialogue } : null
  }, [hydrated, progress, shell])

  if (!hydrated || !plan) {
    return <p className="py-16 text-center text-base text-gray-600">Loading your dashboard…</p>
  }

  const mastered = masteredCount(progress)
  const total = shell.missions.length
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0

  const recentBadges = Object.entries(progress.badges)
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, 3)
    .map(([name]) => shell.badges.find((b) => b.name === name))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map((b) => ({ id: b.name, name: b.name, iconKey: b.iconKey, description: b.description }))

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="animate-pop-in">
        <NextStepCard step={plan.primary} />
      </div>

      {plan.then.length > 0 && (
        <div className="animate-pop-in [animation-delay:90ms]">
          <ThenList steps={plan.then} />
        </div>
      )}

      {/* Everything below is status, not a call to action. */}
      <div className="pt-4 animate-pop-in [animation-delay:180ms]">
        <h2 className="px-1 font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
          Your progress
        </h2>
        <div className="mt-2 space-y-4">
          <ReadinessMeter pct={pct} ciLow={Math.max(0, pct - 5)} ciHigh={Math.min(100, pct + 5)} />
          <StreakWidget
            currentLength={progress.streak.currentLength}
            longestLength={progress.streak.longestLength}
            freezeTokens={progress.streak.freezeTokens}
          />
          <BadgeRack badges={recentBadges} />
          <ProgressBackup />
          <p className="px-1 text-sm text-gray-600">
            <Link href="/student/summary" className="font-semibold text-indigo-700 underline">
              Print a summary of your progress
            </Link>{' '}
            to take home or show your teacher.
          </p>
        </div>
      </div>

      <NarrativeOverlay
        beat={sceneDismissed ? null : scene}
        onDismiss={() => {
          if (scene) update((p) => markStorySceneRead(p, scene.beatKey))
          setSceneDismissed(true)
        }}
      />
    </div>
  )
}
