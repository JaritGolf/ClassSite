/**
 * Student Profile View Model
 *
 * Composes all student data into a single VM for the teacher's student
 * profile page. Always authorizes via assertStudentInTeacherClass first.
 */

import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass } from '@/lib/teacher-roster'
import { getDecayingBenchmarks } from '@/lib/spaced-retrieval/decay'
import { getStrategyProgress } from '@/lib/strategy-track'
import type {
  StudentProgressStatus,
  TeacherOverrideAction,
  RemediationStatus,
} from '@prisma/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BenchmarkLite {
  benchmarkId: string
  benchmarkCode: string
  title: string
}

export interface CalibrationTrendPoint {
  weekStart: Date
  highConfCorrectRate: number
  highConfIncorrectRate: number
  calibrationScore: number
}

export interface StudentProfileVM {
  student: {
    id: string
    displayName: string
    gradeLevel: number
    ellStatus: string | null
  }
  currentMission: {
    benchmarkId: string
    benchmarkCode: string
    status: StudentProgressStatus
  } | null
  mastery: {
    mastered: BenchmarkLite[]
    locked: BenchmarkLite[]
    exposureComplete: BenchmarkLite[]
    needsRemediation: BenchmarkLite[]
  }
  attempts: Array<{
    id: string
    assessmentTitle: string
    /** Null for Republic Challenge / Final Trial attempts which span benchmarks. */
    benchmarkCode: string | null
    attemptNumber: number
    score: number | null
    passed: boolean | null
    submittedAt: Date | null
    voided: boolean
  }>
  calibration: {
    trend: CalibrationTrendPoint[]
    overallGap: number
  }
  remediationHistory: Array<{
    id: string
    benchmarkCode: string
    status: RemediationStatus
    assignedAt: Date
    completedAt: Date | null
  }>
  decayFlags: Array<{
    benchmarkCode: string
    lastQuality: number
    daysOverdue: number
  }>
  spacedRetrieval: {
    itemsDueCount: number
    nextReviewAt: Date | null
    avgIntervalDays: number
  }
  badges: Array<{
    name: string
    iconKey: string
    awardedAt: Date
  }>
  overrideHistory: Array<{
    id: string
    action: TeacherOverrideAction
    reason: string
    createdAt: Date
  }>
  accommodations: Array<{
    code: string
    name: string
    grantedAt: Date
    active: boolean
  }>
  strengthsByDimension: {
    byItemType: Array<{ key: string; correctRate: number }>
    byStimulusType: Array<{ key: string; correctRate: number }>
    byReadingLoad: Array<{ level: 1 | 2 | 3; correctRate: number }>
  }
  strategyTrack: {
    totalOwed: number
    missionsMet: number
    missionsRequired: number
    missions: Array<{
      code: string
      title: string
      useCount: number
      required: number
      waived: boolean
      completedAt: Date | null
    }>
  }
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function getStudentProfileForTeacher(
  teacherUserId: string,
  studentId: string
): Promise<StudentProfileVM> {
  // Authorization check first
  await assertStudentInTeacherClass(teacherUserId, studentId)

  // Fetch all needed data in parallel
  const [
    student,
    progressRows,
    attempts,
    calibrationSnapshots,
    remediations,
    spacedStates,
    badges,
    overrides,
    accommodations,
    responses,
    decayingBenchmarks,
    strategyProgress,
  ] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        id: true,
        gradeLevel: true,
        ellStatus: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.studentProgress.findMany({
      where: { studentId },
      select: {
        status: true,
        benchmark: {
          select: {
            id: true,
            code: true,
            title: true,
            sequenceOrder: true,
          },
        },
      },
      orderBy: { benchmark: { sequenceOrder: 'asc' } },
    }),
    prisma.assessmentAttempt.findMany({
      where: { studentId },
      select: {
        id: true,
        attemptNumber: true,
        score: true,
        passed: true,
        submittedAt: true,
        voided: true,
        assessment: {
          select: {
            title: true,
            benchmark: { select: { code: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    prisma.confidenceCalibrationSnapshot.findMany({
      where: { studentId },
      orderBy: { snapshotAt: 'asc' },
    }),
    prisma.studentRemediation.findMany({
      where: { studentId },
      select: {
        id: true,
        status: true,
        assignedAt: true,
        completedAt: true,
        remediationItem: {
          select: { benchmark: { select: { code: true } } },
        },
      },
      orderBy: { assignedAt: 'desc' },
    }),
    prisma.spacedReviewState.findMany({
      where: { studentId },
      select: {
        dueAt: true,
        intervalDays: true,
        lastQuality: true,
      },
    }),
    prisma.studentBadge.findMany({
      where: { studentId },
      select: {
        awardedAt: true,
        badge: { select: { name: true, iconKey: true } },
      },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.teacherOverride.findMany({
      where: { studentId },
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentAccommodation.findMany({
      where: { studentId },
      select: {
        active: true,
        grantedAt: true,
        accommodation: { select: { code: true, name: true } },
      },
      orderBy: { grantedAt: 'desc' },
    }),
    prisma.attemptResponse.findMany({
      where: { attempt: { studentId } },
      select: {
        isCorrect: true,
        question: {
          select: {
            itemType: true,
            readingLoadLevel: true,
            stimulus: { select: { stimulusType: true } },
          },
        },
      },
    }),
    getDecayingBenchmarks(studentId),
    getStrategyProgress(studentId),
  ])

  // ── Build mastery sections ──────────────────────────────────────────────────
  const mastery: StudentProfileVM['mastery'] = {
    mastered: [],
    locked: [],
    exposureComplete: [],
    needsRemediation: [],
  }
  let currentMission: StudentProfileVM['currentMission'] = null

  for (const row of progressRows) {
    const lite: BenchmarkLite = {
      benchmarkId: row.benchmark.id,
      benchmarkCode: row.benchmark.code,
      title: row.benchmark.title,
    }
    switch (row.status) {
      case 'MASTERED':
        mastery.mastered.push(lite)
        break
      case 'NOT_STARTED':
      case 'TEACHER_OVERRIDE':
        mastery.locked.push(lite)
        break
      case 'EXPOSURE_COMPLETE':
        mastery.exposureComplete.push(lite)
        break
      case 'NEEDS_REMEDIATION':
        mastery.needsRemediation.push(lite)
        break
      case 'IN_PROGRESS':
      case 'READY_FOR_MASTERY':
      case 'REMEDIATION_COMPLETE':
      case 'INTERVENTION_REQUIRED':
        if (!currentMission) {
          currentMission = {
            benchmarkId: row.benchmark.id,
            benchmarkCode: row.benchmark.code,
            status: row.status,
          }
        }
        break
    }
  }

  // ── Build calibration trend ─────────────────────────────────────────────────
  // Group snapshots by ISO week
  const weekMap = new Map<
    string,
    { highCC: number; highCI: number; medCC: number; medCI: number; lowCC: number; lowCI: number }
  >()

  for (const snap of calibrationSnapshots) {
    // Compute ISO week start (Monday)
    const d = new Date(snap.snapshotAt)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() + diff)
    weekStart.setHours(0, 0, 0, 0)
    const key = weekStart.toISOString()

    const entry = weekMap.get(key) ?? {
      highCC: 0, highCI: 0, medCC: 0, medCI: 0, lowCC: 0, lowCI: 0,
    }
    entry.highCC += snap.highConfidenceCorrect
    entry.highCI += snap.highConfidenceIncorrect
    entry.medCC += snap.mediumConfidenceCorrect
    entry.medCI += snap.mediumConfidenceIncorrect
    entry.lowCC += snap.lowConfidenceCorrect
    entry.lowCI += snap.lowConfidenceIncorrect
    weekMap.set(key, entry)
  }

  const trend: CalibrationTrendPoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, agg]) => {
      const highTotal = agg.highCC + agg.highCI
      const highConfCorrectRate = highTotal === 0 ? 0 : agg.highCC / highTotal
      const highConfIncorrectRate = highTotal === 0 ? 0 : agg.highCI / highTotal
      // Calibration score: 1 = perfect calibration (high confidence always correct)
      const calibrationScore = highTotal === 0 ? 1 : highConfCorrectRate
      return {
        weekStart: new Date(key),
        highConfCorrectRate,
        highConfIncorrectRate,
        calibrationScore,
      }
    })

  // Overall gap: across all snapshots
  const totalHighCC = calibrationSnapshots.reduce(
    (s, r) => s + r.highConfidenceCorrect, 0
  )
  const totalHighCI = calibrationSnapshots.reduce(
    (s, r) => s + r.highConfidenceIncorrect, 0
  )
  const totalHigh = totalHighCC + totalHighCI
  const overallGap =
    totalHigh === 0 ? 0 : (totalHighCI / totalHigh)

  // ── Build spaced retrieval summary ─────────────────────────────────────────
  const now = new Date()
  const dueItems = spacedStates.filter((s) => s.dueAt <= now)
  const futureItems = spacedStates.filter((s) => s.dueAt > now)
  const nextReviewAt =
    futureItems.length > 0
      ? futureItems.reduce((min, s) =>
          s.dueAt < min ? s.dueAt : min, futureItems[0].dueAt
        )
      : null
  const avgIntervalDays =
    spacedStates.length === 0
      ? 0
      : Math.round(
          spacedStates.reduce((s, r) => s + r.intervalDays, 0) /
            spacedStates.length
        )

  // ── Build decay flags ───────────────────────────────────────────────────────
  const decayFlags = decayingBenchmarks.map((d) => ({
    benchmarkCode: d.benchmarkCode,
    lastQuality: d.lastQuality,
    daysOverdue: Math.max(
      0,
      Math.floor((now.getTime() - d.lastReviewedAt.getTime()) / 86400000)
    ),
  }))

  // ── Build strengths by dimension ───────────────────────────────────────────
  const itemTypeMap = new Map<string, { correct: number; total: number }>()
  const stimulusTypeMap = new Map<string, { correct: number; total: number }>()
  const readingLoadMap = new Map<number, { correct: number; total: number }>()

  for (const r of responses) {
    // By item type
    const it = r.question.itemType as string
    const itEntry = itemTypeMap.get(it) ?? { correct: 0, total: 0 }
    itEntry.total++
    if (r.isCorrect) itEntry.correct++
    itemTypeMap.set(it, itEntry)

    // By stimulus type
    const st = r.question.stimulus?.stimulusType as string | undefined ?? 'NONE'
    const stEntry = stimulusTypeMap.get(st) ?? { correct: 0, total: 0 }
    stEntry.total++
    if (r.isCorrect) stEntry.correct++
    stimulusTypeMap.set(st, stEntry)

    // By reading load level
    const level = r.question.readingLoadLevel
    const rlEntry = readingLoadMap.get(level) ?? { correct: 0, total: 0 }
    rlEntry.total++
    if (r.isCorrect) rlEntry.correct++
    readingLoadMap.set(level, rlEntry)
  }

  const strengthsByDimension: StudentProfileVM['strengthsByDimension'] = {
    byItemType: Array.from(itemTypeMap.entries()).map(([key, agg]) => ({
      key,
      correctRate: agg.total === 0 ? 0 : agg.correct / agg.total,
    })),
    byStimulusType: Array.from(stimulusTypeMap.entries()).map(([key, agg]) => ({
      key,
      correctRate: agg.total === 0 ? 0 : agg.correct / agg.total,
    })),
    byReadingLoad: Array.from(readingLoadMap.entries())
      .filter((entry): entry is [1 | 2 | 3, { correct: number; total: number }] =>
        [1, 2, 3].includes(entry[0])
      )
      .map(([level, agg]) => ({
        level,
        correctRate: agg.total === 0 ? 0 : agg.correct / agg.total,
      })),
  }

  return {
    student: {
      id: student.id,
      displayName: `${student.user.firstName} ${student.user.lastName}`,
      gradeLevel: student.gradeLevel,
      ellStatus: student.ellStatus,
    },
    currentMission,
    mastery,
    attempts: attempts.map((a) => ({
      id: a.id,
      assessmentTitle: a.assessment.title,
      benchmarkCode: a.assessment.benchmark?.code ?? null,
      attemptNumber: a.attemptNumber,
      score: a.score,
      passed: a.passed,
      submittedAt: a.submittedAt,
      voided: a.voided,
    })),
    calibration: { trend, overallGap },
    remediationHistory: remediations.map((r) => ({
      id: r.id,
      benchmarkCode: r.remediationItem.benchmark.code,
      status: r.status,
      assignedAt: r.assignedAt,
      completedAt: r.completedAt,
    })),
    decayFlags,
    spacedRetrieval: {
      itemsDueCount: dueItems.length,
      nextReviewAt,
      avgIntervalDays,
    },
    badges: badges.map((b) => ({
      name: b.badge.name,
      iconKey: b.badge.iconKey,
      awardedAt: b.awardedAt,
    })),
    overrideHistory: overrides.map((o) => ({
      id: o.id,
      action: o.action,
      reason: o.reason,
      createdAt: o.createdAt,
    })),
    accommodations: accommodations.map((a) => ({
      code: a.accommodation.code,
      name: a.accommodation.name,
      grantedAt: a.grantedAt,
      active: a.active,
    })),
    strengthsByDimension,
    strategyTrack: {
      totalOwed: strategyProgress.totalOwed,
      missionsMet: strategyProgress.missionsMet,
      missionsRequired: strategyProgress.missionsRequired,
      missions: strategyProgress.progress.map((p) => ({
        code: p.code,
        title: p.title,
        useCount: p.useCount,
        required: p.required,
        waived: p.waived,
        completedAt: p.completedAt,
      })),
    },
  }
}
