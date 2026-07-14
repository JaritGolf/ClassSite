/**
 * Badge Award Engine
 *
 * Evaluates seed/badges.ts criteriaJson against current DB state and awards
 * any newly-earned badges. Until this existed, badges were defined but NEVER
 * awarded — the entire motivation loop was inert.
 *
 * Design: rather than dispatching on fine-grained events, every hook call
 * re-evaluates all not-yet-awarded badges against DB truth. That makes awards
 * idempotent (upsert on the (studentId, badgeId) unique), retroactive (a
 * student who earned a badge before this engine shipped gets it on their next
 * activity), and immune to event-mapping bugs. Criteria kinds with no data
 * source yet (reading-track counters, tag-filtered mastery) evaluate to false
 * and are simply never awarded — forward-compatible.
 *
 * Called non-fatally (like the mastery hook) from the assessment submit,
 * drill review, and practice answer routes.
 */

import { prisma } from '@/lib/db'

interface BadgeCriteria {
  event?: string
  count?: number
  tags?: string[]
  tag?: string
  unitCode?: string
  category?: string
  threshold?: number
  level?: number
  missionCode?: string
}

/**
 * Evaluate all badges for a student and award any newly earned.
 * Returns the names of badges awarded by THIS call (empty when none).
 */
export async function evaluateAndAwardBadges(studentId: string): Promise<string[]> {
  const [badges, existing] = await Promise.all([
    prisma.badge.findMany({ select: { id: true, name: true, criteriaJson: true } }),
    prisma.studentBadge.findMany({ where: { studentId }, select: { badgeId: true } }),
  ])
  const alreadyAwarded = new Set(existing.map((b) => b.badgeId))

  const newlyAwarded: string[] = []
  for (const badge of badges) {
    if (alreadyAwarded.has(badge.id)) continue

    let met = false
    try {
      met = await criteriaMet(studentId, badge.criteriaJson as BadgeCriteria)
    } catch {
      // A single malformed criterion must never break the loop.
      continue
    }
    if (!met) continue

    await prisma.studentBadge.upsert({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
      update: {},
      create: { studentId, badgeId: badge.id },
    })
    newlyAwarded.push(badge.name)
  }
  return newlyAwarded
}

async function criteriaMet(studentId: string, c: BadgeCriteria): Promise<boolean> {
  switch (c.event) {
    case 'benchmark_mastered': {
      // Tag-scoped variants have no benchmark-tag data source yet — never met.
      if (c.tags && c.tags.length > 0) return false
      const mastered = await prisma.studentProgress.count({
        where: { studentId, status: 'MASTERED' },
      })
      return mastered >= (c.count ?? 1)
    }

    case 'unit_complete': {
      if (!c.unitCode) return false
      const benchmarks = await prisma.benchmark.findMany({
        where: { unitId: c.unitCode, code: { startsWith: 'SS.7.CG.' } },
        select: { id: true },
      })
      if (benchmarks.length === 0) return false
      const mastered = await prisma.studentProgress.count({
        where: {
          studentId,
          status: 'MASTERED',
          benchmarkId: { in: benchmarks.map((b) => b.id) },
        },
      })
      return mastered === benchmarks.length
    }

    case 'reporting_category_mastered': {
      if (!c.category) return false
      const benchmarks = await prisma.benchmark.findMany({
        where: {
          code: { startsWith: 'SS.7.CG.' },
          reportingCategory: { name: c.category },
        },
        select: { id: true },
      })
      if (benchmarks.length === 0) return false
      const mastered = await prisma.studentProgress.count({
        where: {
          studentId,
          status: 'MASTERED',
          benchmarkId: { in: benchmarks.map((b) => b.id) },
        },
      })
      return mastered === benchmarks.length
    }

    case 'mastery_score_above': {
      // Tag-scoped (all seeded ones are) — no benchmark-tag data source yet.
      if (c.tag) return false
      if (c.threshold === undefined) return false
      const attempt = await prisma.assessmentAttempt.findFirst({
        where: {
          studentId,
          voided: false,
          passed: true,
          score: { gte: c.threshold },
          assessment: { assessmentType: 'MASTERY_CHALLENGE' },
        },
        select: { id: true },
      })
      return attempt !== null
    }

    case 'streak_days': {
      // longestLength so a once-earned streak badge can't be "unearned".
      const streak = await prisma.streakState.findUnique({
        where: { studentId },
        select: { currentLength: true, longestLength: true },
      })
      if (!streak) return false
      return Math.max(streak.currentLength, streak.longestLength) >= (c.count ?? 1)
    }

    case 'drill_complete': {
      const events = await prisma.spacedReviewEvent.count({ where: { studentId } })
      return events >= (c.count ?? 1)
    }

    case 'source_decoder_level': {
      if (c.level === undefined) return false
      const row = await prisma.sourceDecoderProgress.findUnique({
        where: { studentId_level: { studentId, level: c.level } },
        select: { completedAt: true },
      })
      return row?.completedAt != null
    }

    case 'strategy_mission': {
      if (!c.missionCode) return false
      const row = await prisma.strategyTrackProgress.findUnique({
        where: { studentId_missionCode: { studentId, missionCode: c.missionCode } },
        select: { completedAt: true },
      })
      return row?.completedAt != null
    }

    case 'strategy_track_complete': {
      const completed = await prisma.strategyTrackProgress.count({
        where: { studentId, completedAt: { not: null } },
      })
      return completed >= (c.count ?? 7)
    }

    // Reading-track counters (source_analysis_complete, claim_identified,
    // source_decoder_purpose, source_decoder_compare) have no per-item
    // tracking table yet — never met until one exists.
    default:
      return false
  }
}
