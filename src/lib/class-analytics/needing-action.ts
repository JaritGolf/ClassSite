/**
 * Students needing teacher action: off-ramp, decay spike, remediation overdue,
 * or overconfidence.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'

export interface NeedingActionRow {
  studentId: string
  displayName: string
  reason: 'OFF_RAMP' | 'DECAY_SPIKE' | 'REMEDIATION_OVERDUE' | 'OVERCONFIDENCE'
  benchmarkCode?: string
}

const OVERCONFIDENCE_GAP = 0.3
const REMEDIATION_OVERDUE_DAYS = 7

export async function getStudentsNeedingAction(
  teacherUserId: string
): Promise<NeedingActionRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  const results: NeedingActionRow[] = []

  // 1. Students who triggered off-ramp
  const offRampProgress = await prisma.studentProgress.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      offRampTriggeredAt: { not: null },
    },
    select: {
      studentId: true,
      benchmark: { select: { code: true } },
      student: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  for (const row of offRampProgress) {
    results.push({
      studentId: row.studentId,
      displayName: `${row.student.user.firstName} ${row.student.user.lastName}`,
      reason: 'OFF_RAMP',
      benchmarkCode: row.benchmark.code,
    })
  }

  // 2. Students with decay spike — get decay rates and flag students in those benchmarks
  const decayRates = await getClassDecayRates(roster.teacherId)
  const spikedBenchmarkIds = new Set(
    decayRates.filter((d) => d.spikeAlert).map((d) => d.benchmarkId)
  )

  if (spikedBenchmarkIds.size > 0) {
    const decayStates = await prisma.spacedReviewState.findMany({
      where: {
        studentId: { in: roster.allStudentIds },
        benchmarkId: { in: [...spikedBenchmarkIds] },
        lastQuality: { not: null, lt: 3 },
      },
      select: {
        studentId: true,
        benchmark: { select: { code: true } },
        student: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    for (const row of decayStates) {
      results.push({
        studentId: row.studentId,
        displayName: `${row.student.user.firstName} ${row.student.user.lastName}`,
        reason: 'DECAY_SPIKE',
        benchmarkCode: row.benchmark.code,
      })
    }
  }

  // 3. Remediation overdue (assigned > N days ago, still in progress/assigned)
  const overdueDate = new Date(Date.now() - REMEDIATION_OVERDUE_DAYS * 86400000)
  const overdueRemediations = await prisma.studentRemediation.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      assignedAt: { lt: overdueDate },
    },
    select: {
      studentId: true,
      student: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  const seenOverdue = new Set<string>()
  for (const row of overdueRemediations) {
    if (!seenOverdue.has(row.studentId)) {
      seenOverdue.add(row.studentId)
      results.push({
        studentId: row.studentId,
        displayName: `${row.student.user.firstName} ${row.student.user.lastName}`,
        reason: 'REMEDIATION_OVERDUE',
      })
    }
  }

  // 4. Overconfidence: high-confidence correct rate vs high-confidence accuracy
  const recentResponses = await prisma.attemptResponse.findMany({
    where: {
      attempt: { studentId: { in: roster.allStudentIds }, voided: false },
      confidence: { not: null },
    },
    select: {
      attempt: { select: { studentId: true } },
      confidence: true,
      isCorrect: true,
    },
    orderBy: { attempt: { startedAt: 'desc' } },
    take: roster.allStudentIds.length * 20,
  })

  // Group by student, compute overconfidence gap
  const byStudent = new Map<
    string,
    { highTotal: number; highCorrect: number }
  >()
  for (const r of recentResponses) {
    const sid = r.attempt.studentId
    const entry = byStudent.get(sid) ?? { highTotal: 0, highCorrect: 0 }
    if (r.confidence === 2) {
      entry.highTotal++
      if (r.isCorrect) entry.highCorrect++
    }
    byStudent.set(sid, entry)
  }

  // Fetch display names for overconfident students
  const overconfidentIds: string[] = []
  for (const [sid, stats] of byStudent.entries()) {
    if (stats.highTotal < 5) continue // not enough data
    const highConfRate = 1.0 // by definition: these were all "very sure"
    const highConfAccuracy = stats.highCorrect / stats.highTotal
    const gap = highConfRate - highConfAccuracy
    if (gap >= OVERCONFIDENCE_GAP) {
      overconfidentIds.push(sid)
    }
  }

  if (overconfidentIds.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: overconfidentIds } },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    })
    for (const s of students) {
      results.push({
        studentId: s.id,
        displayName: `${s.user.firstName} ${s.user.lastName}`,
        reason: 'OVERCONFIDENCE',
      })
    }
  }

  return results
}

export interface RemediationCompletionRow {
  benchmarkCode: string
  assigned: number
  inProgress: number
  completed: number
  skipped: number
}

export async function getRemediationCompletionStatus(
  teacherUserId: string
): Promise<RemediationCompletionRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  const remediations = await prisma.studentRemediation.findMany({
    where: { studentId: { in: roster.allStudentIds } },
    select: {
      status: true,
      remediationItem: {
        select: {
          benchmark: { select: { code: true } },
        },
      },
    },
  })

  const byBenchmark = new Map<
    string,
    { assigned: number; inProgress: number; completed: number; skipped: number }
  >()

  for (const row of remediations) {
    const code = row.remediationItem.benchmark.code
    const entry = byBenchmark.get(code) ?? {
      assigned: 0,
      inProgress: 0,
      completed: 0,
      skipped: 0,
    }
    switch (row.status) {
      case 'ASSIGNED':
        entry.assigned++
        break
      case 'IN_PROGRESS':
        entry.inProgress++
        break
      case 'COMPLETED':
        entry.completed++
        break
      case 'SKIPPED':
        entry.skipped++
        break
    }
    byBenchmark.set(code, entry)
  }

  return Array.from(byBenchmark.entries()).map(([benchmarkCode, agg]) => ({
    benchmarkCode,
    ...agg,
  }))
}
