/**
 * EOC Readiness Trend
 *
 * Reads EocReadinessSnapshot (student scope) or ClassReadinessSnapshot (class scope),
 * buckets by day or ISO week, and returns ordered TrendPoint[].
 *
 * Spec reference: Section 20.4 (Trend Analysis)
 */

import { prisma } from '@/lib/db'
import { startOfUtcDay, getOrCreateDailyClassSnapshot } from './snapshot'

// ── Types ──────────────────────────────────────────────────────────────────────

export type GranularityType = 'day' | 'week'

export const TrendGranularity = { DAY: 'day', WEEK: 'week' } as const

export interface TrendPoint {
  bucketStart: Date
  value: number    // 0..100 readiness percent
  sampleSize: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Return the Monday of the ISO week containing the given UTC date. */
function startOfUtcWeek(d: Date): Date {
  const result = new Date(d)
  const day = result.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  result.setUTCDate(result.getUTCDate() + diff)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

function getBucketStart(date: Date, granularity: GranularityType): Date {
  return granularity === 'day' ? startOfUtcDay(date) : startOfUtcWeek(date)
}

// ── Main Function ──────────────────────────────────────────────────────────────

/**
 * Return trend points for the given scope and granularity.
 *
 * Empty fixtures return [] (not an error).
 * Points are ordered by bucketStart ascending.
 */
export async function getReadinessTrend(opts: {
  scope: { type: 'student'; studentId: string } | { type: 'class'; classId: string }
  granularity: GranularityType
  windowDays?: number
}): Promise<TrendPoint[]> {
  const { scope, granularity, windowDays = 90 } = opts
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  if (scope.type === 'student') {
    const snapshots = await prisma.eocReadinessSnapshot.findMany({
      where: {
        studentId: scope.studentId,
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        readinessScore: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (snapshots.length === 0) return []

    const byBucket = new Map<string, { total: number; count: number; bucketStart: Date }>()
    for (const snap of snapshots) {
      const bucketStart = getBucketStart(snap.createdAt, granularity)
      const key = bucketStart.toISOString()
      const entry = byBucket.get(key) ?? { total: 0, count: 0, bucketStart }
      entry.total += snap.readinessScore
      entry.count++
      byBucket.set(key, entry)
    }

    return Array.from(byBucket.values())
      .map((b) => ({
        bucketStart: b.bucketStart,
        value: (b.total / b.count) * 100,
        sampleSize: b.count,
      }))
      .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
  } else {
    // Class scope — ensure today's snapshot exists
    await getOrCreateDailyClassSnapshot(scope.classId)

    const snapshots = await prisma.classReadinessSnapshot.findMany({
      where: {
        classId: scope.classId,
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        readinessScore: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (snapshots.length === 0) return []

    const byBucket = new Map<string, { total: number; count: number; bucketStart: Date }>()
    for (const snap of snapshots) {
      const bucketStart = getBucketStart(snap.createdAt, granularity)
      const key = bucketStart.toISOString()
      const entry = byBucket.get(key) ?? { total: 0, count: 0, bucketStart }
      entry.total += snap.readinessScore
      entry.count++
      byBucket.set(key, entry)
    }

    return Array.from(byBucket.values())
      .map((b) => ({
        bucketStart: b.bucketStart,
        value: (b.total / b.count) * 100,
        sampleSize: b.count,
      }))
      .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
  }
}
