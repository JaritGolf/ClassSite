/**
 * Parent Progress Summary — View Model (Phase 14, spec §23 Phase 1, Audit §36.15)
 *
 * Composes a *teacher-generated*, parent-appropriate progress summary for one
 * student. The VM is built as an ALLOWLIST — it deliberately contains only the
 * fields the spec (§23) permits a parent to see, and never composes from the
 * teacher profile VM (which carries calibration, decay, overrides, and per-item
 * distractor data). Forbidden data therefore cannot leak by accident.
 *
 * Parent view SHOWS: current mission, benchmarks mastered, benchmarks needing
 * review, remediation status, recent assessment summary (score + pass/fail only),
 * EOC readiness summary, suggested at-home review, positive progress indicators.
 *
 * Parent view NEVER shows: answer keys, the item bank, item-level distractor
 * analysis, other students, private teacher notes, confidence-calibration data,
 * internal flags (decay metrics, overrides, accommodations).
 *
 * Authorization is enforced first via assertStudentInTeacherClass — a teacher can
 * only generate a summary for a student on their own roster (satisfies "no other
 * students").
 */

import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass } from '@/lib/teacher-roster'
import { computeStudentReadiness } from '@/lib/eoc-analytics'
import type { StudentProgressStatus } from '@prisma/client'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParentSummaryBenchmark {
  benchmarkCode: string
  title: string
}

export interface ParentSummaryVM {
  student: {
    displayName: string
    gradeLevel: number
  }
  generatedAt: Date
  currentMission: {
    benchmarkCode: string
    title: string
    /** Parent-friendly label — never the raw status enum. */
    statusLabel: string
  } | null
  mastery: {
    mastered: ParentSummaryBenchmark[]
    needsReview: ParentSummaryBenchmark[]
    totalBenchmarks: number
  }
  remediation: {
    assignedCount: number
    inProgressCount: number
    completedCount: number
    active: Array<{ benchmarkCode: string; title: string }>
  }
  /** Secure summary only — score % + pass/fail + date. No questions/options. */
  recentAssessments: Array<{
    title: string
    scorePercent: number
    passed: boolean
    date: Date
  }>
  eocReadiness: {
    overallPercent: number
    byCategory: Array<{ name: string; readinessPercent: number }>
  }
  suggestedReview: string[]
  positiveIndicators: string[]
}

/**
 * Canonical list of section keys included in a parent summary. Recorded in the
 * audit log's `fieldsIncluded` when a teacher shares the report (spec §22).
 */
export const PARENT_SUMMARY_FIELDS = [
  'currentMission',
  'mastery',
  'remediation',
  'recentAssessments',
  'eocReadiness',
  'suggestedReview',
  'positiveIndicators',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map an in-progress StudentProgressStatus to a parent-friendly phrase. */
function missionStatusLabel(status: StudentProgressStatus): string {
  switch (status) {
    case 'READY_FOR_MASTERY':
      return 'Ready for the mastery challenge'
    case 'REMEDIATION_COMPLETE':
      return 'Reviewing before the mastery challenge'
    case 'INTERVENTION_REQUIRED':
      return 'Getting extra support'
    case 'IN_PROGRESS':
    default:
      return 'In progress'
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

export async function getParentSummary(
  teacherUserId: string,
  studentId: string
): Promise<ParentSummaryVM> {
  // Authorization first — roster scope guarantees "own students only".
  await assertStudentInTeacherClass(teacherUserId, studentId)

  const now = new Date()

  const [student, progressRows, attempts, remediations, badges, dueReviews, readiness] =
    await Promise.all([
      prisma.student.findUniqueOrThrow({
        where: { id: studentId },
        select: {
          gradeLevel: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.studentProgress.findMany({
        where: { studentId },
        select: {
          status: true,
          benchmark: { select: { code: true, title: true, sequenceOrder: true } },
        },
        orderBy: { benchmark: { sequenceOrder: 'asc' } },
      }),
      // Secure summary: only graded, non-voided attempts; score/pass/date only.
      prisma.assessmentAttempt.findMany({
        where: { studentId, voided: false, submittedAt: { not: null } },
        select: {
          score: true,
          passed: true,
          submittedAt: true,
          assessment: { select: { title: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
      prisma.studentRemediation.findMany({
        where: { studentId },
        select: {
          status: true,
          remediationItem: {
            select: { title: true, benchmark: { select: { code: true } } },
          },
        },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.studentBadge.findMany({
        where: { studentId },
        select: { badge: { select: { name: true } } },
        orderBy: { awardedAt: 'desc' },
        take: 6,
      }),
      prisma.spacedReviewState.findMany({
        where: { studentId, dueAt: { lte: now } },
        select: { benchmark: { select: { title: true } } },
      }),
      computeStudentReadiness(studentId),
    ])

  // ── Mastery sections ────────────────────────────────────────────────────────
  const mastered: ParentSummaryBenchmark[] = []
  const needsReview: ParentSummaryBenchmark[] = []
  let currentMission: ParentSummaryVM['currentMission'] = null

  for (const row of progressRows) {
    const lite: ParentSummaryBenchmark = {
      benchmarkCode: row.benchmark.code,
      title: row.benchmark.title,
    }
    switch (row.status) {
      case 'MASTERED':
        mastered.push(lite)
        break
      case 'NEEDS_REMEDIATION':
        needsReview.push(lite)
        break
      case 'IN_PROGRESS':
      case 'READY_FOR_MASTERY':
      case 'REMEDIATION_COMPLETE':
      case 'INTERVENTION_REQUIRED':
        if (row.status === 'INTERVENTION_REQUIRED') needsReview.push(lite)
        if (!currentMission) {
          currentMission = {
            benchmarkCode: row.benchmark.code,
            title: row.benchmark.title,
            statusLabel: missionStatusLabel(row.status),
          }
        }
        break
      // NOT_STARTED / TEACHER_OVERRIDE / EXPOSURE_COMPLETE: not surfaced to parents.
    }
  }

  // ── Remediation status ──────────────────────────────────────────────────────
  let assignedCount = 0
  let inProgressCount = 0
  let completedCount = 0
  const active: Array<{ benchmarkCode: string; title: string }> = []
  for (const r of remediations) {
    if (r.status === 'ASSIGNED') {
      assignedCount++
      active.push({ benchmarkCode: r.remediationItem.benchmark.code, title: r.remediationItem.title })
    } else if (r.status === 'IN_PROGRESS') {
      inProgressCount++
      active.push({ benchmarkCode: r.remediationItem.benchmark.code, title: r.remediationItem.title })
    } else if (r.status === 'COMPLETED') {
      completedCount++
    }
  }

  // ── Suggested at-home review (titles only — no internal decay metrics) ──────
  const reviewSet = new Set<string>()
  for (const b of needsReview) reviewSet.add(b.title)
  for (const d of dueReviews) reviewSet.add(d.benchmark.title)
  const suggestedReview = Array.from(reviewSet).slice(0, 8)

  // ── Positive progress indicators ────────────────────────────────────────────
  const positiveIndicators: string[] = []
  if (mastered.length > 0) {
    positiveIndicators.push(
      `Mastered ${mastered.length} of ${progressRows.length} missions`
    )
  }
  if (completedCount > 0) {
    positiveIndicators.push(`Completed ${completedCount} review activit${completedCount === 1 ? 'y' : 'ies'}`)
  }
  for (const b of badges) {
    positiveIndicators.push(`Earned the “${b.badge.name}” badge`)
  }

  return {
    student: {
      displayName: `${student.user.firstName} ${student.user.lastName}`,
      gradeLevel: student.gradeLevel,
    },
    generatedAt: now,
    currentMission,
    mastery: {
      mastered,
      needsReview,
      totalBenchmarks: progressRows.length,
    },
    remediation: {
      assignedCount,
      inProgressCount,
      completedCount,
      active,
    },
    recentAssessments: attempts.map((a) => ({
      title: a.assessment.title,
      scorePercent: Math.round((a.score ?? 0) * 100),
      passed: a.passed ?? false,
      date: a.submittedAt as Date,
    })),
    eocReadiness: {
      overallPercent: Math.round(readiness.overallPercent),
      byCategory: readiness.byCategory.map((c) => ({
        name: c.name,
        readinessPercent: Math.round(c.readinessPercent),
      })),
    },
    suggestedReview,
    positiveIndicators,
  }
}
