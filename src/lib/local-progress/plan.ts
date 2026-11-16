/**
 * "What should I do next?" — computed on the device from device-local
 * progress. The ranking itself is the existing pure resolver
 * (src/lib/student-next-step/rank); this file only gathers its inputs from
 * LocalProgress instead of from database rows.
 */

import { TERMINAL_STATUSES } from '@/lib/mastery/availability-core'
import { buildStudentPlan, type RankInputs } from '@/lib/student-next-step/rank'
import type { NextStepIcon, StudentPlan } from '@/lib/student-next-step/types'
import {
  currentMissionCode,
  dueReviewCodes,
  missionAvailability,
  openRemediations,
  strategyOwed,
  type MissionCatalogEntry,
} from './engine'
import type { LocalProgress } from './types'

export interface PlanContext {
  catalog: MissionCatalogEntry[]
  /** Strategy mission codes and the per-strategy target (0 = no target). */
  strategyCodes: string[]
  strategyRequired: number
}

export function buildRankInputs(
  progress: LocalProgress,
  ctx: PlanContext,
  now: Date
): RankInputs {
  const availability = missionAvailability(ctx.catalog, progress)
  const titleByCode = new Map(ctx.catalog.map((m) => [m.code, m.title]))

  const remediation = openRemediations(progress)
    .slice()
    .sort((a, b) => a.assignedAt.localeCompare(b.assignedAt))[0]

  const currentCode = currentMissionCode(ctx.catalog, progress)
  const currentState = currentCode ? availability.get(currentCode)?.state : undefined

  let finished = 0
  for (const node of availability.values()) {
    if (node.state !== 'AVAILABLE' && node.state !== 'LOCKED' && node.state !== 'COMING_SOON') {
      if (TERMINAL_STATUSES.has(node.state)) finished += 1
    }
  }

  const last = progress.lastActivity

  return {
    remediation: remediation
      ? {
          remediationItemId: remediation.itemId,
          title: remediation.title,
          benchmarkTitle: titleByCode.get(remediation.benchmarkCode) ?? null,
        }
      : null,
    mission:
      currentCode && currentState
        ? {
            benchmarkCode: currentCode,
            title: titleByCode.get(currentCode) ?? currentCode,
            state: currentState,
            readinessPassed: Boolean(progress.missions[currentCode]?.readinessPassedAt),
          }
        : null,
    drillDueCount: dueReviewCodes(progress, now).length,
    strategyOwed: strategyOwed(progress, ctx.strategyCodes, ctx.strategyRequired),
    masteredCount: finished,
    lastActivity: last
      ? {
          label: last.label,
          subLabel: last.subLabel,
          href: last.href,
          icon: last.icon as NextStepIcon,
        }
      : null,
  }
}

export function buildLocalPlan(progress: LocalProgress, ctx: PlanContext, now: Date): StudentPlan {
  return buildStudentPlan(buildRankInputs(progress, ctx, now))
}
