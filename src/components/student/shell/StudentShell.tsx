'use client'

/**
 * The student area's client shell.
 *
 * The server sends curriculum (the mission catalog, the badge catalog, the
 * strategy target) and this component does everything that depends on the
 * person: it reads progress from the device, applies the display options the
 * student chose, and decorates the navigation. None of it goes back to the
 * server.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import {
  dueReviewCodes,
  evaluateBadges,
  openRemediations,
  type MissionCatalogEntry,
} from '@/lib/local-progress/engine'
import { buildLocalPlan, type PlanContext } from '@/lib/local-progress/plan'
import type { StudentPlan } from '@/lib/student-next-step'
import {
  StudentNav,
  isStudentRouteAvailable,
  type StudentNavBadges,
} from '@/components/student/layout/StudentNav'
import { PauseBanner } from '@/components/student/layout/PauseBanner'

export interface ShellUnit {
  id: string
  title: string
  sequenceOrder: number
  gameRegionName: string
  benchmarks: { code: string; title: string }[]
}

export interface ShellBadge {
  name: string
  description: string
  iconKey: string
  track: string
  criteria: unknown
  winnable: boolean
}

export interface StudentShellData {
  units: ShellUnit[]
  missions: MissionCatalogEntry[]
  badges: ShellBadge[]
  strategyCodes: string[]
  strategyRequired: number
}

const ShellContext = createContext<StudentShellData | null>(null)

/** Curriculum facts shared by every student page. */
export function useStudentShell(): StudentShellData {
  const value = useContext(ShellContext)
  if (!value) throw new Error('useStudentShell must be used inside the student layout')
  return value
}

/** The plan context the next-step resolver needs. */
export function usePlanContext(): PlanContext {
  const shell = useStudentShell()
  return useMemo(
    () => ({
      catalog: shell.missions,
      strategyCodes: shell.strategyCodes,
      strategyRequired: shell.strategyRequired,
    }),
    [shell]
  )
}

/** The student's ranked next steps, computed on the device. Null until hydrated. */
export function useStudentPlan(): StudentPlan | null {
  const { progress, hydrated } = useLocalProgress()
  const ctx = usePlanContext()
  return useMemo(() => {
    if (!hydrated) return null
    const plan = buildLocalPlan(progress, ctx, new Date())
    // Never point at a destination that does not exist.
    const steps = [plan.primary, ...plan.then].filter((s) => isStudentRouteAvailable(s.href))
    if (steps.length === 0) {
      return {
        primary: {
          kind: 'ALL_CAUGHT_UP' as const,
          label: "You're all caught up",
          subLabel: 'Nothing is due right now — check back after your next lesson',
          href: '/student/map',
          icon: 'check' as const,
          ctaLabel: 'See the Mission Map',
          estimatedMinutes: null,
        },
        then: [],
      }
    }
    return { primary: steps[0], then: steps.slice(1) }
  }, [progress, hydrated, ctx])
}

export function StudentShell({ data, children }: { data: StudentShellData; children: ReactNode }) {
  const { progress, hydrated, update } = useLocalProgress()
  const settings = progress.settings

  // Badges are awarded here, in one place, whenever progress changes — so no
  // screen has to remember to check. Idempotent; writes only when one is new.
  useEffect(() => {
    if (!hydrated) return
    const result = evaluateBadges(progress, data.badges, data.missions, new Date(), data.strategyRequired)
    if (result.newlyEarned.length > 0) update(() => result.progress)
  }, [hydrated, progress, data, update])

  const navBadges: StudentNavBadges = hydrated
    ? {
        '/student/daily-drill': dueReviewCodes(progress, new Date()).length,
        '/student/dashboard': openRemediations(progress).length,
      }
    : {}

  const themeClass = hydrated
    ? [
        settings.reduceMotion && 'cq-reduce-motion',
        settings.highContrast && 'cq-high-contrast',
        settings.largeText && 'cq-large-text',
      ]
        .filter(Boolean)
        .join(' ')
    : ''

  return (
    <ShellContext.Provider value={data}>
      <div className={themeClass}>
        <StudentNav badges={navBadges} />
        <main className="min-h-screen bg-indigo-50 bg-dots bg-[length:26px_26px]">{children}</main>
        {/* "Extra time" turns the break reminder off. Nothing here is timed. */}
        {hydrated && !settings.extraTime && <PauseBanner pausePointMinutes={settings.pauseMinutes} />}
      </div>
    </ShellContext.Provider>
  )
}
