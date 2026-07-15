/**
 * Recommended small groups: students sharing top-2 misconceptions on the
 * same active benchmark, capped at 5 per group, minimum 2.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'

export interface SmallGroup {
  groupId: string
  benchmarkCode: string
  misconceptionCodes: string[]
  studentIds: string[]
  suggestedAction: string
}

const MAX_GROUP_SIZE = 5
const MIN_GROUP_SIZE = 2
const RECENT_RESPONSE_WINDOW = 5

export async function getRecommendedSmallGroups(
  teacherUserId: string
): Promise<SmallGroup[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Get active benchmarks — those where at least one student is in progress or needs remediation
  const activeProgress = await prisma.studentProgress.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      status: { in: ['IN_PROGRESS', 'NEEDS_REMEDIATION', 'REMEDIATION_COMPLETE', 'READY_FOR_MASTERY'] },
    },
    select: {
      studentId: true,
      benchmarkId: true,
      benchmark: { select: { code: true } },
    },
  })

  if (activeProgress.length === 0) return []

  // Get unique active benchmarks
  const activeBenchmarkIds = [...new Set(activeProgress.map((p) => p.benchmarkId))]

  // For each student + benchmark, get their last 5 incorrect responses' misconceptions
  const incorrectResponses = await prisma.attemptResponse.findMany({
    where: {
      isCorrect: false,
      attempt: { studentId: { in: roster.allStudentIds }, voided: false },
      question: { benchmarkId: { in: activeBenchmarkIds } },
      selectedOption: { misconceptionId: { not: null } },
    },
    select: {
      attempt: { select: { studentId: true, startedAt: true } },
      question: {
        select: {
          benchmarkId: true,
          benchmark: { select: { code: true } },
        },
      },
      selectedOption: {
        select: {
          misconceptionId: true,
          misconception: { select: { code: true } },
        },
      },
    },
    orderBy: { attempt: { startedAt: 'desc' } },
  })

  // Per student+benchmark: collect the most recent N misconception codes
  type StudentBenchmarkKey = string // `${studentId}:${benchmarkId}`
  const studentBenchmarkMisconceptions = new Map<
    StudentBenchmarkKey,
    Map<string, { code: string; count: number }>
  >()

  for (const r of incorrectResponses) {
    const sid = r.attempt.studentId
    const bid = r.question.benchmarkId
    const mcId = r.selectedOption?.misconceptionId
    const mcCode = r.selectedOption?.misconception?.code
    if (!mcId || !mcCode) continue

    const key: StudentBenchmarkKey = `${sid}:${bid}`
    if (!studentBenchmarkMisconceptions.has(key)) {
      studentBenchmarkMisconceptions.set(key, new Map())
    }
    const mcMap = studentBenchmarkMisconceptions.get(key)!
    const existing = mcMap.get(mcId) ?? { code: mcCode, count: 0 }

    // Only count up to RECENT_RESPONSE_WINDOW responses per student+benchmark
    const currentTotal = Array.from(mcMap.values()).reduce(
      (s, v) => s + v.count,
      0
    )
    if (currentTotal < RECENT_RESPONSE_WINDOW) {
      existing.count++
      mcMap.set(mcId, existing)
    }
  }

  // Per student+benchmark: get top-2 misconception IDs
  const studentBenchmarkTopMisconceptions = new Map<
    StudentBenchmarkKey,
    string[]
  >()
  for (const [key, mcMap] of studentBenchmarkMisconceptions.entries()) {
    const sorted = Array.from(mcMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2)
      .map(([mcId]) => mcId)
    studentBenchmarkTopMisconceptions.set(key, sorted)
  }

  // Group students by (benchmarkId, top-2 misconceptions signature)
  const groups = new Map<
    string, // `${benchmarkId}:${mc1},${mc2}`
    {
      benchmarkCode: string
      misconceptionCodes: string[]
      studentIds: string[]
    }
  >()

  for (const [key, mcIds] of studentBenchmarkTopMisconceptions.entries()) {
    if (mcIds.length === 0) continue
    const [sid, bid] = key.split(':')
    const progress = activeProgress.find(
      (p) => p.studentId === sid && p.benchmarkId === bid
    )
    if (!progress) continue

    const sortedMcIds = [...mcIds].sort()
    const groupKey = `${bid}:${sortedMcIds.join(',')}`

    const existing = groups.get(groupKey)
    if (existing) {
      if (existing.studentIds.length < MAX_GROUP_SIZE) {
        existing.studentIds.push(sid)
      }
    } else {
      // Get misconception codes from the map
      const mcCodes = mcIds
        .map((mcId) => {
          for (const [, mcMap] of studentBenchmarkMisconceptions.entries()) {
            const mc = mcMap.get(mcId)
            if (mc) return mc.code
          }
          return mcId
        })
        .filter(Boolean)

      groups.set(groupKey, {
        benchmarkCode: progress.benchmark.code,
        misconceptionCodes: mcCodes,
        studentIds: [sid],
      })
    }
  }

  // Filter groups with >= MIN_GROUP_SIZE members
  const result: SmallGroup[] = []
  let groupIndex = 0
  for (const [, group] of groups.entries()) {
    if (group.studentIds.length < MIN_GROUP_SIZE) continue
    result.push({
      groupId: `sg-${groupIndex++}`,
      benchmarkCode: group.benchmarkCode,
      misconceptionCodes: group.misconceptionCodes,
      studentIds: group.studentIds,
      suggestedAction: `Reteach ${group.benchmarkCode}: address misconceptions ${group.misconceptionCodes.join(', ')}`,
    })
  }

  return result
}
