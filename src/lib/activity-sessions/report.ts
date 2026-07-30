/**
 * Activity Sessions — the read model.
 *
 * Answers the three questions the teacher actually asked: when did each student
 * get on, how long did they work, and what did they get done in that stretch.
 *
 * Progress is attributed to a session by TIME WINDOW against the tables that
 * already carry timestamps (attempts, review events, mastery, remediation,
 * badges). No session id is stamped onto student work rows — see
 * docs/adrs/0019-student-activity-sessions.md for why.
 *
 * Privacy: aggregate counts and scores only. No question text, no options, no
 * per-item correctness, no distractor data — the same posture as the export
 * allowlist and the daily report.
 */

import { prisma } from '@/lib/db'
import {
  assertClassOwnedByTeacher,
  getTeacherRoster,
  RosterError,
} from '@/lib/teacher-roster'
import { AREA_LABELS, isActivityArea, type ActivityArea } from './config'
import {
  activeMinutes,
  areaBreakdown,
  mergeAdjacentSessions,
  presenceState,
  spanMinutes,
  type PresenceState,
} from './sessionize'
import { closeStaleSessions } from './touch'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SessionProgress {
  questionsAnswered: number
  assessmentsSubmitted: number
  /** Score percentages of assessments submitted in this session, in order. */
  assessmentScores: number[]
  benchmarksMastered: string[]
  drillReviews: number
  drillCorrect: number
  remediationsCompleted: number
  badgesEarned: number
}

export interface SessionRow {
  sessionId: string
  startedAt: Date
  endedAt: Date | null
  lastActiveAt: Date
  /** Engaged minutes — the headline number. Excludes idle and hidden-tab time. */
  activeMinutes: number
  /** Wall-clock first-to-last activity, always >= activeMinutes. */
  spanMinutes: number
  /** True when a real sign-in opened this session. */
  startedByLogin: boolean
  areas: Array<{ area: ActivityArea; label: string; minutes: number }>
  progress: SessionProgress
}

export interface StudentActivitySummary {
  studentId: string
  displayName: string
  sessionCount: number
  totalActiveMinutes: number
  longestSessionMinutes: number
  lastActiveAt: Date | null
  progress: SessionProgress
}

export interface ClassActivityReport {
  classInfo: { id: string; name: string; period: string | null; studentCount: number }
  range: { from: Date; to: Date }
  generatedAt: Date
  summaries: StudentActivitySummary[]
  /** Per-student session detail, keyed by studentId. */
  sessionsByStudent: Record<string, SessionRow[]>
  totals: {
    studentsWithActivity: number
    studentsWithNoActivity: number
    totalActiveMinutes: number
    medianSessionMinutes: number
    sessionCount: number
  }
}

export interface LivePresenceRow {
  studentId: string
  displayName: string
  state: PresenceState
  /** Null when the student has no session at all in the live window. */
  lastActiveAt: Date | null
  /** Engaged minutes in the current session so far. */
  activeMinutes: number
  /** Where they were most recently spending time, if known. */
  currentArea: { area: ActivityArea; label: string } | null
}

export interface LivePresence {
  classInfo: { id: string; name: string; period: string | null; studentCount: number }
  checkedAt: Date
  onNow: LivePresenceRow[]
  idle: LivePresenceRow[]
  offline: LivePresenceRow[]
}

export interface DateRange {
  from: Date
  to: Date
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyProgress(): SessionProgress {
  return {
    questionsAnswered: 0,
    assessmentsSubmitted: 0,
    assessmentScores: [],
    benchmarksMastered: [],
    drillReviews: 0,
    drillCorrect: 0,
    remediationsCompleted: 0,
    badgesEarned: 0,
  }
}

function addProgress(a: SessionProgress, b: SessionProgress): SessionProgress {
  return {
    questionsAnswered: a.questionsAnswered + b.questionsAnswered,
    assessmentsSubmitted: a.assessmentsSubmitted + b.assessmentsSubmitted,
    assessmentScores: [...a.assessmentScores, ...b.assessmentScores],
    benchmarksMastered: [...a.benchmarksMastered, ...b.benchmarksMastered],
    drillReviews: a.drillReviews + b.drillReviews,
    drillCorrect: a.drillCorrect + b.drillCorrect,
    remediationsCompleted: a.remediationsCompleted + b.remediationsCompleted,
    badgesEarned: a.badgesEarned + b.badgesEarned,
  }
}

function labelAreas(
  raw: unknown
): Array<{ area: ActivityArea; label: string; minutes: number }> {
  return areaBreakdown(raw).map((row) => ({
    ...row,
    label: AREA_LABELS[row.area] ?? row.area,
  }))
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/**
 * Fetch every timestamped work event for these students across the whole range
 * in one pass, then bucket them into session windows in memory.
 *
 * One query set for the range beats one per session: a class of 25 over a week
 * can easily have 200+ sessions.
 */
async function fetchWorkEvents(studentIds: readonly string[], range: DateRange) {
  const ids = [...studentIds]
  const window = { gte: range.from, lte: range.to }

  const [attempts, reviews, mastered, remediations, badges] = await Promise.all([
    // Attempts count when SUBMITTED in-window; practice attempts never submit,
    // so they count when STARTED in-window instead (see CLAUDE.md decisions).
    prisma.assessmentAttempt.findMany({
      where: {
        studentId: { in: ids },
        voided: false,
        OR: [{ submittedAt: window }, { AND: [{ submittedAt: null }, { startedAt: window }] }],
      },
      select: {
        studentId: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        _count: { select: { responses: true } },
      },
    }),
    prisma.spacedReviewEvent.findMany({
      where: { studentId: { in: ids }, occurredAt: window },
      select: { studentId: true, occurredAt: true, isCorrect: true },
    }),
    prisma.studentProgress.findMany({
      where: { studentId: { in: ids }, masteredAt: window },
      select: {
        studentId: true,
        masteredAt: true,
        benchmark: { select: { code: true } },
      },
    }),
    prisma.studentRemediation.findMany({
      where: { studentId: { in: ids }, completedAt: window },
      select: { studentId: true, completedAt: true },
    }),
    prisma.studentBadge.findMany({
      where: { studentId: { in: ids }, awardedAt: window },
      select: { studentId: true, awardedAt: true },
    }),
  ])

  return { attempts, reviews, mastered, remediations, badges }
}

type WorkEvents = Awaited<ReturnType<typeof fetchWorkEvents>>

/** Sum the work that falls inside one session's window. */
function progressInWindow(
  events: WorkEvents,
  studentId: string,
  from: Date,
  to: Date
): SessionProgress {
  const inWindow = (d: Date | null): boolean =>
    d !== null && d >= from && d <= to
  const progress = emptyProgress()

  for (const a of events.attempts) {
    if (a.studentId !== studentId) continue
    // An attempt belongs to the session it finished in; unsubmitted practice
    // attempts belong to the session they started in.
    const anchor = a.submittedAt ?? a.startedAt
    if (!inWindow(anchor)) continue
    progress.questionsAnswered += a._count.responses
    if (a.submittedAt !== null) {
      progress.assessmentsSubmitted += 1
      if (a.score !== null) progress.assessmentScores.push(Math.round(a.score))
    }
  }

  for (const r of events.reviews) {
    if (r.studentId !== studentId || !inWindow(r.occurredAt)) continue
    progress.drillReviews += 1
    if (r.isCorrect) progress.drillCorrect += 1
  }

  for (const m of events.mastered) {
    if (m.studentId !== studentId || !inWindow(m.masteredAt)) continue
    progress.benchmarksMastered.push(m.benchmark.code)
  }

  for (const rem of events.remediations) {
    if (rem.studentId !== studentId || !inWindow(rem.completedAt)) continue
    progress.remediationsCompleted += 1
  }

  for (const b of events.badges) {
    if (b.studentId !== studentId || !inWindow(b.awardedAt)) continue
    progress.badgesEarned += 1
  }

  return progress
}

// ── Per-student history ──────────────────────────────────────────────────────

/**
 * Session history for one student, newest first.
 *
 * Caller is responsible for authorization — the teacher-facing page reaches
 * this through `getStudentProfileForTeacher`'s roster guard, and the class
 * report below guards via `assertClassOwnedByTeacher`.
 */
export async function getStudentSessionHistory(
  studentId: string,
  options: { from?: Date; to?: Date; limit?: number } = {}
): Promise<SessionRow[]> {
  const to = options.to ?? new Date()
  const from = options.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  const limit = options.limit ?? 20

  const rows = await prisma.studentActivitySession.findMany({
    where: { studentId, startedAt: { gte: from, lte: to } },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
  if (rows.length === 0) return []

  const merged = mergeAdjacentSessions(rows)
  const events = await fetchWorkEvents([studentId], {
    from: merged[0].startedAt,
    to,
  })

  return merged
    .map((s) => toSessionRow(s, events, studentId))
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
}

function toSessionRow(
  session: {
    id: string
    startedAt: Date
    lastActiveAt: Date
    endedAt: Date | null
    activeSeconds: number
    areaSeconds: unknown
    startedByLogin: boolean
  },
  events: WorkEvents,
  studentId: string
): SessionRow {
  const windowEnd = session.endedAt ?? session.lastActiveAt
  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    lastActiveAt: session.lastActiveAt,
    activeMinutes: activeMinutes(session),
    spanMinutes: spanMinutes(session),
    startedByLogin: session.startedByLogin,
    areas: labelAreas(session.areaSeconds),
    progress: progressInWindow(events, studentId, session.startedAt, windowEnd),
  }
}

// ── Class report ─────────────────────────────────────────────────────────────

/**
 * Session activity for one class over a date range.
 *
 * Authorization first, exactly like `buildDailyClassReport`: a teacher can only
 * read a class they own, and only the students enrolled in it.
 */
export async function getClassSessionActivity(
  teacherUserId: string,
  classId: string,
  range: DateRange
): Promise<ClassActivityReport> {
  await assertClassOwnedByTeacher(teacherUserId, classId)

  const roster = await getTeacherRoster(teacherUserId)
  const klass = roster.classes.find((c) => c.id === classId)
  if (!klass) {
    throw new RosterError('NOT_FOUND', `Class ${classId} not found`)
  }

  const classInfo = {
    id: klass.id,
    name: klass.name,
    period: klass.period,
    studentCount: klass.studentIds.length,
  }
  const generatedAt = new Date()

  if (klass.studentIds.length === 0) {
    return {
      classInfo,
      range,
      generatedAt,
      summaries: [],
      sessionsByStudent: {},
      totals: {
        studentsWithActivity: 0,
        studentsWithNoActivity: 0,
        totalActiveMinutes: 0,
        medianSessionMinutes: 0,
        sessionCount: 0,
      },
    }
  }

  // Report hygiene: close sessions the student has clearly walked away from.
  await closeStaleSessions(klass.studentIds, generatedAt)

  const [students, sessions, events] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: klass.studentIds } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.studentActivitySession.findMany({
      where: {
        studentId: { in: klass.studentIds },
        startedAt: { gte: range.from, lte: range.to },
      },
      orderBy: { startedAt: 'desc' },
    }),
    fetchWorkEvents(klass.studentIds, range),
  ])

  const nameById = new Map(
    students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`])
  )

  const sessionsByStudent: Record<string, SessionRow[]> = {}
  for (const studentId of klass.studentIds) {
    const own = sessions.filter((s) => s.studentId === studentId)
    if (own.length === 0) continue
    sessionsByStudent[studentId] = mergeAdjacentSessions(own)
      .map((s) => toSessionRow(s, events, studentId))
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  const summaries: StudentActivitySummary[] = students
    .map((s) => {
      const rows = sessionsByStudent[s.id] ?? []
      return {
        studentId: s.id,
        displayName: nameById.get(s.id) ?? 'Unknown',
        sessionCount: rows.length,
        totalActiveMinutes: rows.reduce((sum, r) => sum + r.activeMinutes, 0),
        longestSessionMinutes: rows.reduce(
          (max, r) => Math.max(max, r.activeMinutes),
          0
        ),
        lastActiveAt:
          rows.length === 0
            ? null
            : rows.reduce<Date>(
                (latest, r) => (r.lastActiveAt > latest ? r.lastActiveAt : latest),
                rows[0].lastActiveAt
              ),
        progress: rows.reduce(
          (acc, r) => addProgress(acc, r.progress),
          emptyProgress()
        ),
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const allSessionMinutes = Object.values(sessionsByStudent)
    .flat()
    .map((r) => r.activeMinutes)

  return {
    classInfo,
    range,
    generatedAt,
    summaries,
    sessionsByStudent,
    totals: {
      studentsWithActivity: summaries.filter((s) => s.sessionCount > 0).length,
      studentsWithNoActivity: summaries.filter((s) => s.sessionCount === 0).length,
      totalActiveMinutes: summaries.reduce(
        (sum, s) => sum + s.totalActiveMinutes,
        0
      ),
      medianSessionMinutes: median(allSessionMinutes),
      sessionCount: allSessionMinutes.length,
    },
  }
}

// ── Live presence ────────────────────────────────────────────────────────────

/**
 * Who is working right now, for the mid-class view.
 *
 * Deliberately cheap: one session query for the class plus one name lookup. No
 * progress attribution — that is the historical report's job.
 */
export async function getLivePresence(
  teacherUserId: string,
  classId: string,
  now: Date = new Date()
): Promise<LivePresence> {
  await assertClassOwnedByTeacher(teacherUserId, classId)

  const roster = await getTeacherRoster(teacherUserId)
  const klass = roster.classes.find((c) => c.id === classId)
  if (!klass) {
    throw new RosterError('NOT_FOUND', `Class ${classId} not found`)
  }

  const classInfo = {
    id: klass.id,
    name: klass.name,
    period: klass.period,
    studentCount: klass.studentIds.length,
  }

  if (klass.studentIds.length === 0) {
    return { classInfo, checkedAt: now, onNow: [], idle: [], offline: [] }
  }

  // Only today's sessions can possibly be live.
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const [students, sessions] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: klass.studentIds } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.studentActivitySession.findMany({
      where: {
        studentId: { in: klass.studentIds },
        lastActiveAt: { gte: startOfDay },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        studentId: true,
        lastActiveAt: true,
        activeSeconds: true,
        lastArea: true,
      },
    }),
  ])

  // Most recent session per student.
  const latestByStudent = new Map<string, (typeof sessions)[number]>()
  for (const s of sessions) {
    if (!latestByStudent.has(s.studentId)) latestByStudent.set(s.studentId, s)
  }

  const rows: LivePresenceRow[] = students
    .map((s) => {
      const latest = latestByStudent.get(s.id)
      // Where they are NOW, from the most recent touch — not the area with the
      // most accumulated time, which would misreport a student who just moved.
      const area = isActivityArea(latest?.lastArea) ? latest.lastArea : null
      return {
        studentId: s.id,
        displayName: `${s.user.firstName} ${s.user.lastName}`,
        state: latest ? presenceState(latest.lastActiveAt, now) : 'offline',
        lastActiveAt: latest?.lastActiveAt ?? null,
        activeMinutes: latest ? Math.round(latest.activeSeconds / 60) : 0,
        currentArea: area ? { area, label: AREA_LABELS[area] } : null,
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return {
    classInfo,
    checkedAt: now,
    onNow: rows.filter((r) => r.state === 'online'),
    idle: rows.filter((r) => r.state === 'idle'),
    offline: rows.filter((r) => r.state === 'offline'),
  }
}
