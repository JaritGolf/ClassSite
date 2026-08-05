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
import { getPlayableBenchmarkIds } from '@/lib/mastery'
import { resolveStrategyRequirements } from '@/lib/strategy-track'

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

  // Memoized per evaluation run. Five seeded badges ask "which benchmarks can
  // this student actually play", and the answer cannot change mid-loop — without
  // this each one issued its own identical query. That matters because this
  // function runs on four of the hottest student write paths (every drill
  // answer, assessment submit, practice answer, and strategy round).
  //
  // Lazy on purpose: a student who already holds those five badges never
  // triggers the query at all.
  const playableOnce = memoizePlayableBenchmarkIds()

  const newlyAwarded: string[] = []
  for (const badge of badges) {
    if (alreadyAwarded.has(badge.id)) continue

    let met = false
    try {
      met = await criteriaMet(studentId, badge.criteriaJson as BadgeCriteria, playableOnce)
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

/** Resolves the playable set at most once, and only if something asks for it. */
function memoizePlayableBenchmarkIds(): () => Promise<Set<string>> {
  let pending: Promise<Set<string>> | null = null
  return () => (pending ??= getPlayableBenchmarkIds())
}

async function criteriaMet(
  studentId: string,
  c: BadgeCriteria,
  playableOnce: () => Promise<Set<string>> = memoizePlayableBenchmarkIds()
): Promise<boolean> {
  switch (c.event) {
    case 'benchmark_mastered': {
      // Tag-scoped variants have no benchmark-tag data source yet — never met.
      if (c.tags && c.tags.length > 0) return false
      const mastered = await prisma.studentProgress.count({
        where: { studentId, status: 'MASTERED' },
      })
      return mastered >= (c.count ?? 1)
    }

    // ── "Master a whole group" badges ────────────────────────────────────────
    //
    // Both of these count against the benchmarks a student can ACTUALLY PLAY,
    // not against every benchmark on the books.
    //
    // The original `mastered === benchmarks.length` made them unwinnable. The
    // course has 36 benchmarks and 8 with content, by design — the build scope
    // is deliberately limited while the platform is validated. So "Origins"
    // spans 11 benchmarks of which 8 are playable, and a student who masters
    // every mission in front of them still scores 8 !== 11 and gets nothing.
    // The badge did not misfire; it could not fire at all.
    //
    // Consequence worth knowing: these badges are earned against the content
    // that exists at the time. When new missions ship, an already-awarded badge
    // stays awarded (awards are idempotent upserts, never revoked) — which is
    // the right call. Taking a badge back off a 12-year-old because the teacher
    // published more content would be indefensible.
    case 'unit_complete': {
      if (!c.unitCode) return false
      const playable = await playableOnce()
      const benchmarks = await prisma.benchmark.findMany({
        where: { unitId: c.unitCode, code: { startsWith: 'SS.7.CG.' } },
        select: { id: true },
      })
      const target = benchmarks.filter((b) => playable.has(b.id)).map((b) => b.id)
      if (target.length === 0) return false
      const mastered = await prisma.studentProgress.count({
        where: { studentId, status: 'MASTERED', benchmarkId: { in: target } },
      })
      return mastered === target.length
    }

    case 'reporting_category_mastered': {
      if (!c.category) return false
      const playable = await playableOnce()
      const benchmarks = await prisma.benchmark.findMany({
        where: {
          code: { startsWith: 'SS.7.CG.' },
          reportingCategory: { name: c.category },
        },
        select: { id: true },
      })
      const target = benchmarks.filter((b) => playable.has(b.id)).map((b) => b.id)
      if (target.length === 0) return false
      const mastered = await prisma.studentProgress.count({
        where: { studentId, status: 'MASTERED', benchmarkId: { in: target } },
      })
      return mastered === target.length
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
      // Counts missions that MEET THEIR REQUIREMENT, not ones merely touched.
      //
      // `completedAt` is stamped on the very first correct round, so with a
      // class requirement above 1 the old count contradicted the student's own
      // screen: the Strategy page said "2 to go" on a mission this badge had
      // already scored as done. Requirements are per-student (class global plus
      // any teacher override or waiver), so they are resolved rather than
      // assumed.
      const [progress, requirements] = await Promise.all([
        prisma.strategyTrackProgress.findMany({
          where: { studentId, completedAt: { not: null } },
          select: { missionCode: true, useCount: true },
        }),
        resolveStrategyRequirements(studentId),
      ])
      const met = progress.filter((p) => {
        const req = requirements.byCode.get(p.missionCode)
        // A mission with no requirement entry is not part of the track.
        if (!req) return false
        // required 0 (feature off, or waived) → one correct round is enough.
        return p.useCount >= Math.max(req.required, 1)
      }).length
      return met >= (c.count ?? 7)
    }

    // Reading-track counters (source_analysis_complete, claim_identified,
    // source_decoder_purpose, source_decoder_compare) have no per-item
    // tracking table yet — never met until one exists.
    default:
      return false
  }
}

/** Criteria events with no data source behind them. See `criteriaMet`'s default. */
const UNSUPPORTED_EVENTS = new Set([
  'source_analysis_complete',
  'claim_identified',
  'source_decoder_purpose',
  'source_decoder_compare',
])

/**
 * Whether a badge's criteria could EVER be satisfied by the current engine.
 *
 * Exported so student-facing surfaces can hide badges that are impossible to
 * earn. Showing a 12-year-old a locked medal they cannot win no matter what they
 * do is worse than showing them nothing: it reads as a goal, and the goal is a
 * lie. When the missing tracking lands, delete the entry here and the badge
 * reappears on its own.
 *
 * Deliberately lives beside `criteriaMet` rather than in the page — one file
 * decides both "can this fire" and "did it fire", so they cannot drift.
 */
export function isCriteriaWinnable(criteria: unknown): boolean {
  const c = criteria as BadgeCriteria | null
  if (!c || typeof c.event !== 'string') return false
  if (UNSUPPORTED_EVENTS.has(c.event)) return false
  // Tag-scoped variants short-circuit to false in criteriaMet for the same
  // reason: nothing tags a benchmark or an attempt with these yet.
  if (c.event === 'benchmark_mastered' && c.tags && c.tags.length > 0) return false
  if (c.event === 'mastery_score_above' && c.tag) return false
  return true
}
