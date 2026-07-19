/**
 * Daily Class Report
 *
 * A per-class, "open it each morning" snapshot for the teacher: what every
 * student's status is right now, plus a prioritized plan of what to address
 * for THIS class today (off-ramp, decay spikes, overdue remediation,
 * overconfidence, reteach small groups, drill backlog).
 *
 * Unlike the whole-roster `class-analytics` functions, this module is scoped
 * to a single Class — the teacher picks a class/period and gets a report for
 * exactly those students. Authorization is enforced via
 * `assertClassOwnedByTeacher` before any data is read.
 *
 * Privacy: aggregate + status data only. No question options, no `isCorrect`
 * per item, no distractor content — same posture as the export allowlist.
 */

import { prisma } from '@/lib/db'
import type { StudentProgressStatus } from '@prisma/client'
import {
  getTeacherRoster,
  assertClassOwnedByTeacher,
  RosterError,
} from '@/lib/teacher-roster'
import { getRecommendedSmallGroups, type SmallGroup } from '@/lib/class-analytics'
import { computeClassReadiness } from '@/lib/eoc-analytics'
import type { ReadinessByCategory } from '@/lib/eoc-analytics'

// ── Tunables ─────────────────────────────────────────────────────────────────

/** SM-2 quality below this signals decay (matches spaced-retrieval/decay.ts). */
const DECAY_QUALITY_THRESHOLD = 3
/** Class-wide decay spike alert threshold, in percent. */
const DECAY_SPIKE_PERCENT = 50
/** Remediation assigned longer ago than this (days) and still open is "overdue". */
const REMEDIATION_OVERDUE_DAYS = 7
/** High-confidence accuracy this far below 100% flags overconfidence. */
const OVERCONFIDENCE_GAP = 0.3
/** Minimum "very sure" responses before overconfidence is judged. */
const OVERCONFIDENCE_MIN_RESPONSES = 5
/** Due-review items above this count surface a student in the drill-backlog plan. */
const DRILL_BACKLOG_THRESHOLD = 8

/** Progress statuses that count as a student's live "current mission". */
const ACTIVE_STATUSES: StudentProgressStatus[] = [
  'IN_PROGRESS',
  'READY_FOR_MASTERY',
  'NEEDS_REMEDIATION',
  'REMEDIATION_COMPLETE',
  'INTERVENTION_REQUIRED',
]

// ── Types ────────────────────────────────────────────────────────────────────

export type DailyFlag =
  | 'OFF_RAMP'
  | 'DECAY'
  | 'REMEDIATION_OVERDUE'
  | 'OVERCONFIDENCE'
  | 'DRILL_DUE'
  | 'INTERVENTION'

export interface DailyStudentRow {
  studentId: string
  displayName: string
  gradeLevel: number
  ellStatus: string | null
  eseStatus: boolean
  currentMission: {
    benchmarkCode: string
    title: string
    status: StudentProgressStatus
  } | null
  masteredCount: number
  itemsDueToday: number
  flags: DailyFlag[]
}

export type ActionCategory =
  | 'OFF_RAMP'
  | 'DECAY_SPIKE'
  | 'REMEDIATION_OVERDUE'
  | 'SMALL_GROUP'
  | 'OVERCONFIDENCE'
  | 'DRILL_BACKLOG'

export interface DailyActionItem {
  /** Lower = more urgent. Used to sort the plan. */
  priority: number
  category: ActionCategory
  headline: string
  detail: string
  benchmarkCode?: string
  studentNames: string[]
}

export interface DailyStatusSummary {
  notStarted: number
  inProgress: number
  readyForMastery: number
  needsRemediation: number
  remediationComplete: number
  mastered: number
  exposureComplete: number
  teacherOverride: number
  interventionRequired: number
}

export interface DailyReadiness {
  overallPercent: number
  byCategory: ReadinessByCategory[]
}

export interface DailyClassReport {
  classInfo: {
    id: string
    name: string
    period: string | null
    subPrepNotes: string | null
    studentCount: number
  }
  generatedAt: Date
  statusSummary: DailyStatusSummary
  roster: DailyStudentRow[]
  actionPlan: DailyActionItem[]
  smallGroups: SmallGroup[]
  readiness: DailyReadiness | null
  counts: {
    flaggedStudents: number
    drillItemsDue: number
    offRampStudents: number
    decayingStudents: number
    remediationOverdueStudents: number
    overconfidentStudents: number
  }
}

// ── Builder ──────────────────────────────────────────────────────────────────

function emptyStatusSummary(): DailyStatusSummary {
  return {
    notStarted: 0,
    inProgress: 0,
    readyForMastery: 0,
    needsRemediation: 0,
    remediationComplete: 0,
    mastered: 0,
    exposureComplete: 0,
    teacherOverride: 0,
    interventionRequired: 0,
  }
}

/**
 * Build the daily report for a single class.
 *
 * @param teacherUserId - The teacher's User.id (from the session).
 * @param classId - The Class.id the teacher selected. Must belong to them.
 * @throws RosterError('FORBIDDEN') if the class is not the teacher's.
 */
export async function buildDailyClassReport(
  teacherUserId: string,
  classId: string
): Promise<DailyClassReport> {
  // Authorize: the class must belong to this teacher (or admin).
  await assertClassOwnedByTeacher(teacherUserId, classId)

  const roster = await getTeacherRoster(teacherUserId)
  const cls = roster.classes.find((c) => c.id === classId)
  // assertClassOwnedByTeacher already guarantees ownership; if the class isn't
  // in the active roster it's inactive/empty — treat as an empty report.
  if (!cls) {
    throw new RosterError('NOT_FOUND', 'Class not found in active roster')
  }

  const studentIds = cls.studentIds
  const now = new Date()

  const classInfo = {
    id: cls.id,
    name: cls.name,
    period: cls.period,
    subPrepNotes: cls.subPrepNotes,
    studentCount: studentIds.length,
  }

  if (studentIds.length === 0) {
    return {
      classInfo,
      generatedAt: now,
      statusSummary: emptyStatusSummary(),
      roster: [],
      actionPlan: [],
      smallGroups: [],
      readiness: null,
      counts: {
        flaggedStudents: 0,
        drillItemsDue: 0,
        offRampStudents: 0,
        decayingStudents: 0,
        remediationOverdueStudents: 0,
        overconfidentStudents: 0,
      },
    }
  }

  const overdueDate = new Date(now.getTime() - REMEDIATION_OVERDUE_DAYS * 86_400_000)

  const [
    students,
    progressRows,
    dueStates,
    decayStates,
    overdueRemediations,
    confidenceResponses,
    allSmallGroups,
    classReadiness,
  ] = await Promise.all([
    // Names + attributes
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        gradeLevel: true,
        ellStatus: true,
        eseStatus: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    // All progress rows for these students
    prisma.studentProgress.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        studentId: true,
        status: true,
        offRampTriggeredAt: true,
        benchmark: { select: { code: true, title: true, sequenceOrder: true } },
      },
    }),
    // Spaced-review items due today (or overdue)
    prisma.spacedReviewState.findMany({
      where: { studentId: { in: studentIds }, dueAt: { lte: now } },
      select: {
        studentId: true,
        benchmark: { select: { code: true } },
      },
    }),
    // Decay signal: most-recent review quality < 3
    prisma.spacedReviewState.findMany({
      where: {
        studentId: { in: studentIds },
        lastQuality: { not: null, lt: DECAY_QUALITY_THRESHOLD },
      },
      select: {
        studentId: true,
        benchmarkId: true,
        benchmark: { select: { code: true } },
      },
    }),
    // Remediation assigned > N days ago, still open
    prisma.studentRemediation.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        assignedAt: { lt: overdueDate },
      },
      select: { studentId: true },
    }),
    // Recent confidence-tagged responses for overconfidence detection
    prisma.attemptResponse.findMany({
      where: {
        attempt: { studentId: { in: studentIds }, voided: false },
        confidence: { not: null },
      },
      select: {
        attempt: { select: { studentId: true } },
        confidence: true,
        isCorrect: true,
      },
      orderBy: { attempt: { startedAt: 'desc' } },
      take: studentIds.length * 20,
    }),
    // Reteach small groups (whole-roster; re-scoped to this class below)
    getRecommendedSmallGroups(teacherUserId),
    // Class-native EOC readiness
    computeClassReadiness(classId).catch(() => null),
  ])

  const studentIdSet = new Set(studentIds)
  const nameById = new Map<string, string>()
  for (const s of students) {
    nameById.set(s.id, `${s.user.firstName} ${s.user.lastName}`)
  }

  // ── Per-student aggregates ──────────────────────────────────────────────
  const masteredCountByStudent = new Map<string, number>()
  const currentMissionByStudent = new Map<
    string,
    { benchmarkCode: string; title: string; status: StudentProgressStatus; seq: number }
  >()
  const offRampByStudent = new Map<string, string[]>() // studentId -> benchmark codes
  const interventionStudents = new Set<string>()
  const statusSummary = emptyStatusSummary()

  for (const row of progressRows) {
    // Status distribution
    switch (row.status) {
      case 'NOT_STARTED': statusSummary.notStarted++; break
      case 'IN_PROGRESS': statusSummary.inProgress++; break
      case 'READY_FOR_MASTERY': statusSummary.readyForMastery++; break
      case 'NEEDS_REMEDIATION': statusSummary.needsRemediation++; break
      case 'REMEDIATION_COMPLETE': statusSummary.remediationComplete++; break
      case 'MASTERED': statusSummary.mastered++; break
      case 'EXPOSURE_COMPLETE': statusSummary.exposureComplete++; break
      case 'TEACHER_OVERRIDE': statusSummary.teacherOverride++; break
      case 'INTERVENTION_REQUIRED': statusSummary.interventionRequired++; break
    }

    if (row.status === 'MASTERED' || row.status === 'TEACHER_OVERRIDE') {
      masteredCountByStudent.set(
        row.studentId,
        (masteredCountByStudent.get(row.studentId) ?? 0) + 1
      )
    }

    if (row.status === 'INTERVENTION_REQUIRED') {
      interventionStudents.add(row.studentId)
    }

    if (row.offRampTriggeredAt) {
      const codes = offRampByStudent.get(row.studentId) ?? []
      codes.push(row.benchmark.code)
      offRampByStudent.set(row.studentId, codes)
    }

    // Current mission = the furthest-along active benchmark
    if (ACTIVE_STATUSES.includes(row.status)) {
      const existing = currentMissionByStudent.get(row.studentId)
      if (!existing || row.benchmark.sequenceOrder > existing.seq) {
        currentMissionByStudent.set(row.studentId, {
          benchmarkCode: row.benchmark.code,
          title: row.benchmark.title,
          status: row.status,
          seq: row.benchmark.sequenceOrder,
        })
      }
    }
  }

  // Due-today counts per student + per benchmark
  const dueCountByStudent = new Map<string, number>()
  for (const s of dueStates) {
    dueCountByStudent.set(s.studentId, (dueCountByStudent.get(s.studentId) ?? 0) + 1)
  }
  const drillItemsDue = dueStates.length

  // ── Class decay: aggregate per benchmark, flag spikes ───────────────────
  const decayByBenchmark = new Map<
    string,
    { code: string; studentIds: Set<string> }
  >()
  const decayingStudents = new Set<string>()
  for (const d of decayStates) {
    decayingStudents.add(d.studentId)
    const entry = decayByBenchmark.get(d.benchmarkId) ?? {
      code: d.benchmark.code,
      studentIds: new Set<string>(),
    }
    entry.studentIds.add(d.studentId)
    decayByBenchmark.set(d.benchmarkId, entry)
  }
  const decaySpikes = Array.from(decayByBenchmark.values())
    .map((e) => ({
      code: e.code,
      studentIds: [...e.studentIds],
      ratePercent:
        studentIds.length === 0
          ? 0
          : Math.round((e.studentIds.size / studentIds.length) * 100),
    }))
    .filter((e) => e.ratePercent >= DECAY_SPIKE_PERCENT)
    .sort((a, b) => b.ratePercent - a.ratePercent)

  // ── Overdue remediation students ────────────────────────────────────────
  const remediationOverdueStudents = new Set<string>()
  for (const r of overdueRemediations) remediationOverdueStudents.add(r.studentId)

  // ── Overconfidence ──────────────────────────────────────────────────────
  const highConfByStudent = new Map<string, { total: number; correct: number }>()
  for (const r of confidenceResponses) {
    if (r.confidence !== 2) continue
    const sid = r.attempt.studentId
    const entry = highConfByStudent.get(sid) ?? { total: 0, correct: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    highConfByStudent.set(sid, entry)
  }
  const overconfidentStudents = new Set<string>()
  for (const [sid, stats] of highConfByStudent.entries()) {
    if (stats.total < OVERCONFIDENCE_MIN_RESPONSES) continue
    const gap = 1 - stats.correct / stats.total
    if (gap >= OVERCONFIDENCE_GAP) overconfidentStudents.add(sid)
  }

  // ── Re-scope small groups to this class only ────────────────────────────
  const smallGroups: SmallGroup[] = allSmallGroups
    .map((g) => ({
      ...g,
      studentIds: g.studentIds.filter((id) => studentIdSet.has(id)),
    }))
    .filter((g) => g.studentIds.length >= 2)

  // ── Build per-student roster rows ───────────────────────────────────────
  const rosterRows: DailyStudentRow[] = students
    .map((s) => {
      const mission = currentMissionByStudent.get(s.id)
      const itemsDueToday = dueCountByStudent.get(s.id) ?? 0
      const flags: DailyFlag[] = []
      if (offRampByStudent.has(s.id)) flags.push('OFF_RAMP')
      if (interventionStudents.has(s.id)) flags.push('INTERVENTION')
      if (decayingStudents.has(s.id)) flags.push('DECAY')
      if (remediationOverdueStudents.has(s.id)) flags.push('REMEDIATION_OVERDUE')
      if (overconfidentStudents.has(s.id)) flags.push('OVERCONFIDENCE')
      if (itemsDueToday >= DRILL_BACKLOG_THRESHOLD) flags.push('DRILL_DUE')
      return {
        studentId: s.id,
        displayName: nameById.get(s.id) ?? 'Unknown',
        gradeLevel: s.gradeLevel,
        ellStatus: s.ellStatus,
        eseStatus: s.eseStatus,
        currentMission: mission
          ? {
              benchmarkCode: mission.benchmarkCode,
              title: mission.title,
              status: mission.status,
            }
          : null,
        masteredCount: masteredCountByStudent.get(s.id) ?? 0,
        itemsDueToday,
        flags,
      }
    })
    // Flagged students first (most flags → top), then alphabetical.
    .sort((a, b) => {
      if (b.flags.length !== a.flags.length) return b.flags.length - a.flags.length
      return a.displayName.localeCompare(b.displayName)
    })

  // ── Build the prioritized action plan ───────────────────────────────────
  const actionPlan: DailyActionItem[] = []
  const nameList = (ids: string[]) =>
    ids.map((id) => nameById.get(id) ?? 'Unknown').sort()

  // 1. Off-ramp — students stuck; conference + unlock decision.
  const offRampByBenchmark = new Map<string, string[]>()
  for (const [sid, codes] of offRampByStudent.entries()) {
    for (const code of codes) {
      const arr = offRampByBenchmark.get(code) ?? []
      arr.push(sid)
      offRampByBenchmark.set(code, arr)
    }
  }
  for (const [code, ids] of offRampByBenchmark.entries()) {
    const names = nameList(ids)
    actionPlan.push({
      priority: 1,
      category: 'OFF_RAMP',
      benchmarkCode: code,
      headline: `Off-ramp conference on ${code}`,
      detail: `${names.length} student${names.length === 1 ? '' : 's'} hit the off-ramp on ${code} (3 failed mastery attempts + remediation + 7 days). Check in, confirm the next benchmark unlocked, and note extra spaced review is now scheduled.`,
      studentNames: names,
    })
  }

  // 2. Decay spikes — class-wide re-prime.
  for (const spike of decaySpikes) {
    const names = nameList(spike.studentIds)
    actionPlan.push({
      priority: 2,
      category: 'DECAY_SPIKE',
      benchmarkCode: spike.code,
      headline: `Re-prime ${spike.code} (${spike.ratePercent}% of class decaying)`,
      detail: `Recall is slipping on ${spike.code} across ${names.length} student${names.length === 1 ? '' : 's'}. A quick whole-class re-prime or a targeted drill is worth 5 minutes today.`,
      studentNames: names,
    })
  }

  // 3. Overdue remediation.
  if (remediationOverdueStudents.size > 0) {
    const names = nameList([...remediationOverdueStudents])
    actionPlan.push({
      priority: 3,
      category: 'REMEDIATION_OVERDUE',
      headline: `Nudge ${names.length} student${names.length === 1 ? '' : 's'} on overdue remediation`,
      detail: `Assigned review activities have been open more than ${REMEDIATION_OVERDUE_DAYS} days without completion. A short check-in or in-class time to finish keeps them from stalling.`,
      studentNames: names,
    })
  }

  // 4. Small-group reteach.
  for (const g of smallGroups) {
    const names = nameList(g.studentIds)
    actionPlan.push({
      priority: 4,
      category: 'SMALL_GROUP',
      benchmarkCode: g.benchmarkCode,
      headline: `Small group: reteach ${g.benchmarkCode}`,
      detail:
        g.misconceptionCodes.length > 0
          ? `${names.length} students share the same misconception(s): ${g.misconceptionCodes.join(', ')}. Pull them for a focused reteach.`
          : `${names.length} students would benefit from a focused reteach on ${g.benchmarkCode}.`,
      studentNames: names,
    })
  }

  // 5. Overconfidence — calibration coaching.
  if (overconfidentStudents.size > 0) {
    const names = nameList([...overconfidentStudents])
    actionPlan.push({
      priority: 5,
      category: 'OVERCONFIDENCE',
      headline: `Calibration check for ${names.length} student${names.length === 1 ? '' : 's'}`,
      detail: `These students answer "Very sure" but miss often. A brief "slow down and check" prompt helps them calibrate confidence to accuracy.`,
      studentNames: names,
    })
  }

  // 6. Drill backlog — remind students with a large due queue.
  const backlogStudents = rosterRows
    .filter((r) => r.itemsDueToday >= DRILL_BACKLOG_THRESHOLD)
    .map((r) => r.studentId)
  if (backlogStudents.length > 0) {
    const names = nameList(backlogStudents)
    actionPlan.push({
      priority: 6,
      category: 'DRILL_BACKLOG',
      headline: `Remind ${names.length} student${names.length === 1 ? '' : 's'} to run the Daily Republic Drill`,
      detail: `Each has ${DRILL_BACKLOG_THRESHOLD}+ spaced-review items due. Two minutes of drill clears the backlog before it snowballs.`,
      studentNames: names,
    })
  }

  actionPlan.sort((a, b) => a.priority - b.priority)

  // ── Flagged-student count (any flag) ────────────────────────────────────
  const flaggedStudents = rosterRows.filter((r) => r.flags.length > 0).length

  return {
    classInfo,
    generatedAt: now,
    statusSummary,
    roster: rosterRows,
    actionPlan,
    smallGroups,
    readiness: classReadiness
      ? {
          overallPercent: classReadiness.overallPercent,
          byCategory: classReadiness.byCategory,
        }
      : null,
    counts: {
      flaggedStudents,
      drillItemsDue,
      offRampStudents: offRampByStudent.size,
      decayingStudents: decayingStudents.size,
      remediationOverdueStudents: remediationOverdueStudents.size,
      overconfidentStudents: overconfidentStudents.size,
    },
  }
}
