/**
 * Resolves the one StudentLastActivity row into display-ready shorthand for
 * the dashboard "pick up where you left off" card: a label, an optional
 * sub-label (benchmark/mission/level context), an icon, and a resume link.
 *
 * Labels/icons deliberately mirror existing student-facing terminology —
 * StepIndicator.tsx's step labels for mission phases, Hub.tsx's mode titles
 * for Republic Challenge — rather than inventing new copy.
 */

import { prisma } from '@/lib/db'
import { getStrategyMission } from '@/lib/strategy-track'
import type { AssessmentType, RepublicChallengeMode } from '@prisma/client'

/** Subset of TrackIconName — structurally assignable wherever a TrackIconName is expected. */
export type LastActivityIcon =
  | 'sparkle'
  | 'compass'
  | 'book'
  | 'bolt'
  | 'target'
  | 'shield'
  | 'star'
  | 'flag'
  | 'medal'
  | 'search'

export interface LastActivityView {
  label: string
  subLabel: string | null
  href: string
  icon: LastActivityIcon
  occurredAt: Date
}

const ASSESSMENT_TYPE_META: Partial<Record<AssessmentType, { label: string; icon: LastActivityIcon }>> = {
  PRE_CHECK: { label: 'Pre-Check', icon: 'compass' },
  VOCAB_CHECK: { label: 'Key Terms', icon: 'book' },
  PRACTICE: { label: 'Practice', icon: 'bolt' },
  READINESS_CHECK: { label: 'Readiness Check', icon: 'target' },
  MASTERY_CHALLENGE: { label: 'Mastery Challenge', icon: 'shield' },
  UNIT_REVIEW: { label: 'Unit Review', icon: 'star' },
  REASSESSMENT: { label: 'Reassessment', icon: 'shield' },
  DIAGNOSTIC: { label: 'Diagnostic', icon: 'compass' },
}

const RC_MODE_LABELS: Partial<Record<RepublicChallengeMode, string>> = {
  QUICK_REVIEW: 'Quick Review',
  CATEGORY_CHALLENGE: 'Category Challenge',
  MIXED_MISSION: 'Mixed Mission',
  MISTAKE_REPLAY: 'Mistake Replay',
  SOURCE_SPRINT: 'Source Sprint',
  ENDURANCE_TRIAL: 'Endurance Trial',
  FINAL_REPUBLIC_TRIAL: 'Final Republic Trial',
}

interface AssessmentShape {
  assessmentType: AssessmentType
  mode: RepublicChallengeMode | null
  benchmark: { code: string; title: string } | null
}

/**
 * Pure mapping from an Assessment's shape to display data — no DB access, so
 * every AssessmentType/RepublicChallengeMode combination is directly
 * unit-testable. REPUBLIC_CHALLENGE/FINAL_TRIAL can't deep-resume the same
 * question (reopening starts a fresh attempt), so they route to the hub
 * rather than a specific mission page when benchmark-less.
 */
export function resolveAssessmentActivity(
  assessment: AssessmentShape
): Omit<LastActivityView, 'occurredAt'> {
  if (assessment.assessmentType === 'REPUBLIC_CHALLENGE' || assessment.assessmentType === 'FINAL_TRIAL') {
    const modeLabel = assessment.mode ? RC_MODE_LABELS[assessment.mode] : null
    return {
      label: assessment.assessmentType === 'FINAL_TRIAL' ? 'Final Republic Trial' : modeLabel ?? 'Republic Challenge',
      subLabel: assessment.benchmark?.title ?? null,
      href: assessment.benchmark ? `/student/mission/${assessment.benchmark.code}` : '/student/republic-challenge',
      icon: 'flag',
    }
  }

  const meta = ASSESSMENT_TYPE_META[assessment.assessmentType] ?? { label: 'Assessment', icon: 'compass' as const }
  return {
    label: meta.label,
    subLabel: assessment.benchmark?.title ?? null,
    href: assessment.benchmark ? `/student/mission/${assessment.benchmark.code}` : '/student/map',
    icon: meta.icon,
  }
}

export async function getLastActivityForStudent(studentId: string): Promise<LastActivityView | null> {
  const row = await prisma.studentLastActivity.findUnique({ where: { studentId } })
  if (!row || !row.referenceId) return null
  const referenceId = row.referenceId

  try {
    switch (row.activityType) {
      case 'MISSION_TRAINING': {
        const benchmark = await prisma.benchmark.findUnique({
          where: { id: referenceId },
          select: { code: true, title: true },
        })
        if (!benchmark) return null
        return {
          label: 'Training',
          subLabel: benchmark.title,
          href: `/student/mission/${benchmark.code}`,
          icon: 'sparkle',
          occurredAt: row.occurredAt,
        }
      }

      case 'ASSESSMENT': {
        const assessment = await prisma.assessment.findUnique({
          where: { id: referenceId },
          select: {
            assessmentType: true,
            mode: true,
            benchmark: { select: { code: true, title: true } },
          },
        })
        if (!assessment) return null
        return { ...resolveAssessmentActivity(assessment), occurredAt: row.occurredAt }
      }

      case 'DAILY_DRILL': {
        const benchmark = await prisma.benchmark.findUnique({
          where: { id: referenceId },
          select: { title: true },
        })
        return {
          label: 'Daily Republic Drill',
          subLabel: benchmark?.title ?? null,
          href: '/student/daily-drill',
          icon: 'bolt',
          occurredAt: row.occurredAt,
        }
      }

      case 'STRATEGY_TRACK': {
        const mission = getStrategyMission(referenceId)
        if (!mission) return null
        return {
          label: 'Strategist Track',
          subLabel: mission.title,
          href: '/student/strategy',
          icon: 'medal',
          occurredAt: row.occurredAt,
        }
      }

      case 'SOURCE_DECODER': {
        return {
          label: 'Source Decoder',
          subLabel: `Level ${referenceId}`,
          href: '/student/source-decoder',
          icon: 'search',
          occurredAt: row.occurredAt,
        }
      }

      case 'REMEDIATION': {
        const remediation = await prisma.studentRemediation.findUnique({
          where: { id: referenceId },
          select: { studentId: true, remediationItem: { select: { title: true } } },
        })
        if (!remediation || remediation.studentId !== studentId) return null
        return {
          label: 'Training Mission',
          subLabel: remediation.remediationItem.title,
          href: `/student/remediation/${referenceId}`,
          icon: 'target',
          occurredAt: row.occurredAt,
        }
      }

      default:
        return null
    }
  } catch (err) {
    console.error('[student-activity/resolve]', err instanceof Error ? err.message : err)
    return null
  }
}
