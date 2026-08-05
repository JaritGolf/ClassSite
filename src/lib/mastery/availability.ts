/**
 * Which missions a student may open, and how each one should look on the map.
 *
 * ── The bug this replaces ────────────────────────────────────────────────────
 * `unlockNextBenchmark` grants access by creating a StudentProgress row with
 * status NOT_STARTED. The map read that status and rendered a padlock. So the
 * engine's word for "unlocked" was the UI's word for "locked", and a student who
 * mastered a mission was shown the next one behind a lock telling them to master
 * the mission they had just mastered.
 *
 * ── Why this is NOT "a row exists means it's open" ───────────────────────────
 * That rule looks right and is self-widening. `POST /api/mission/progress`
 * upserts a StudentProgress row on any visit, and nothing server-side stops a
 * student typing `/student/mission/SS.7.CG.1.10`. Under a row-existence rule,
 * visiting a locked mission and advancing one training step would permanently
 * unlock it. The rule below therefore keys on a STATUS ALLOWLIST, never on the
 * presence of a row.
 *
 * `IN_PROGRESS` is deliberately excluded from the granting statuses. It is
 * written ONLY on the create branch of that same upsert — `status.ts`'s update
 * branch touches `attemptsCount` alone, so a grant survives an attempt. An
 * IN_PROGRESS row is the literal signature of a row that access never granted.
 *
 * ── The rule ─────────────────────────────────────────────────────────────────
 *   playable(b) = b.readyForStudents
 *                 AND an APPROVED MASTERY_CHALLENGE with >0 questions exists
 *                 AND an APPROVED lesson exists
 *
 *   reached(b)  = b is the first playable benchmark in course order
 *                 OR row(b).status grants or records real work
 *                 OR some earlier p is terminal, with no playable benchmark
 *                    between p and b
 *
 *   openable(b) = reached(b) AND playable(b)
 *
 * The "no playable benchmark between" clause is what carries a student across a
 * unit boundary and over benchmarks that have no content yet, without a write.
 * Deriving this rather than storing it also repairs teacher `MARK_MASTERED`,
 * which sets a terminal status but never calls `unlockNextBenchmark` — under a
 * stored scheme that intervention strands the very student it was meant to help.
 */

import { prisma } from '@/lib/db'
import type { Prisma, StudentProgressStatus } from '@prisma/client'

/**
 * THE definition of "a student could actually play this mission".
 *
 * Deliberately one exported Prisma fragment rather than a condition re-typed at
 * each call site. The badge engine, the map, and the dashboard all need this
 * question answered, and the entire class of bug being fixed here came from
 * several surfaces each answering it slightly differently.
 *
 * `readyForStudents` is the teacher's explicit switch; the other two are the
 * content floor. All three must hold — the flag gates, it does not substitute.
 */
export const PLAYABLE_BENCHMARK_WHERE = {
  readyForStudents: true,
  assessments: {
    some: {
      assessmentType: 'MASTERY_CHALLENGE',
      approvalStatus: 'APPROVED',
      questions: { some: {} },
    },
  },
  lessons: { some: { approvalStatus: 'APPROVED' } },
} satisfies Prisma.BenchmarkWhereInput

/** Ids of every benchmark a student could play today, across all active units. */
export async function getPlayableBenchmarkIds(): Promise<Set<string>> {
  const rows = await prisma.benchmark.findMany({
    where: { ...PLAYABLE_BENCHMARK_WHERE, unit: { active: true } },
    select: { id: true },
  })
  return new Set(rows.map((r) => r.id))
}

/**
 * Statuses that mean the student finished with this benchmark one way or
 * another. A terminal predecessor is what carries reachability forward.
 *
 * TEACHER_OVERRIDE is listed defensively — `ACTION_STATUS_MAP` in override.ts
 * never actually writes it today, but the enum value exists and a future mapping
 * change should not silently strand students.
 */
const TERMINAL_STATUSES = new Set<StudentProgressStatus>([
  'MASTERED',
  'EXPOSURE_COMPLETE',
  'TEACHER_OVERRIDE',
])

/**
 * Statuses that constitute a grant of access.
 *
 * Only `NOT_STARTED` — and only because `unlock.ts` and `override.ts` are the
 * sole writers of it. See the header for why IN_PROGRESS is not here.
 */
const GRANTED_STATUSES = new Set<StudentProgressStatus>(['NOT_STARTED'])

/**
 * Statuses only the mastery/remediation engine can write, and only after a
 * server-graded attempt. They imply the student was legitimately working in this
 * mission, so they count as reached — a student mid-remediation must never be
 * locked out by a content change or a re-ordered course.
 *
 * Reaching one of these without a grant would require actually passing the
 * benchmark's readiness check, which is demonstrating the content, not bypassing
 * it. IN_PROGRESS is excluded because a plain page visit writes it.
 */
const ENGINE_WRITTEN_STATUSES = new Set<StudentProgressStatus>([
  'READY_FOR_MASTERY',
  'NEEDS_REMEDIATION',
  'REMEDIATION_COMPLETE',
  'INTERVENTION_REQUIRED',
])

/** How a mission node should render. Drives appearance AND clickability. */
export type MissionNodeState =
  | StudentProgressStatus
  /** Reached, playable, not yet begun. The "you can start this now" state. */
  | 'AVAILABLE'
  /** Playable, but the student has not reached it yet. */
  | 'LOCKED'
  /** No content authored yet. Not the student's doing — never reads as a lock. */
  | 'COMING_SOON'

export interface MissionAvailability {
  benchmarkId: string
  state: MissionNodeState
  /** Whether the student may open this mission. */
  openable: boolean
}

/** One benchmark in course order, with everything the rule needs to judge it. */
export interface AvailabilityBenchmark {
  id: string
  /** Per PLAYABLE_BENCHMARK_WHERE — resolved by the loader, not re-derived here. */
  playable: boolean
}

export interface AvailabilityInputs {
  /** Active-unit benchmarks, already sorted by (unit order, benchmark order). */
  ordered: AvailabilityBenchmark[]
  /** The student's progress rows. Rows for benchmarks not in `ordered` are ignored. */
  progressRows: { benchmarkId: string; status: StudentProgressStatus }[]
}

/**
 * Pure. Given course order and the student's rows, decide every mission's state.
 *
 * Kept free of Prisma so every branch is testable from fixtures — the original
 * bug was a disagreement between two places that each derived this themselves.
 */
export function computeAvailability(inputs: AvailabilityInputs): Map<string, MissionAvailability> {
  const { ordered, progressRows } = inputs
  const statusById = new Map(progressRows.map((r) => [r.benchmarkId, r.status]))
  const playable = ordered.map((b) => b.playable)

  const firstPlayableIndex = playable.indexOf(true)

  // Walking forward, track whether some earlier benchmark is terminal with no
  // playable benchmark since. That is precisely "the student cleared everything
  // available up to here", and it is what crosses unit boundaries and steps over
  // benchmarks that have no content yet.
  let carriedFromTerminal = false

  const result = new Map<string, MissionAvailability>()

  ordered.forEach((benchmark, index) => {
    const status = statusById.get(benchmark.id) ?? null
    const thisIsPlayable = playable[index]

    const reached =
      index === firstPlayableIndex ||
      carriedFromTerminal ||
      (status !== null &&
        (GRANTED_STATUSES.has(status) ||
          TERMINAL_STATUSES.has(status) ||
          ENGINE_WRITTEN_STATUSES.has(status)))

    const openable = reached && thisIsPlayable

    let state: MissionNodeState
    if (status !== null && TERMINAL_STATUSES.has(status)) {
      // Finished work is history. It outranks everything else on display — a
      // mission whose content was later pulled must not stop reading as mastered.
      state = status
    } else if (!thisIsPlayable) {
      state = 'COMING_SOON'
    } else if (!reached) {
      state = 'LOCKED'
    } else if (status !== null && status !== 'NOT_STARTED') {
      state = status
    } else {
      state = 'AVAILABLE'
    }

    result.set(benchmark.id, { benchmarkId: benchmark.id, state, openable })

    // Update the carry AFTER judging this benchmark: a terminal benchmark
    // carries to what follows it, not to itself. A playable-but-uncleared
    // benchmark stops the carry — that is the wall the student must climb.
    if (status !== null && TERMINAL_STATUSES.has(status)) {
      carriedFromTerminal = true
    } else if (thisIsPlayable) {
      carriedFromTerminal = false
    }
  })

  return result
}

/**
 * Load everything `computeAvailability` needs for one student.
 *
 * Deliberately the ONLY loader. Every consumer goes through it so the map, the
 * dashboard, and the teacher profile cannot drift apart again — which is exactly
 * how the original bug survived: four surfaces each deciding "locked" for
 * themselves.
 */
export async function loadAvailabilityInputs(studentId: string): Promise<AvailabilityInputs> {
  const [units, playableIds, progressRows] = await Promise.all([
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { sequenceOrder: 'asc' },
      select: {
        benchmarks: {
          orderBy: { sequenceOrder: 'asc' },
          select: { id: true },
        },
      },
    }),
    // A separate query on purpose. Inlining the content conditions as `select`
    // sub-queries here would be one round-trip cheaper and would fork the
    // definition of "playable" away from PLAYABLE_BENCHMARK_WHERE — the exact
    // divergence this module exists to prevent.
    getPlayableBenchmarkIds(),
    prisma.studentProgress.findMany({
      where: { studentId },
      select: { benchmarkId: true, status: true },
    }),
  ])

  const ordered: AvailabilityBenchmark[] = units.flatMap((unit) =>
    unit.benchmarks.map((b) => ({ id: b.id, playable: playableIds.has(b.id) }))
  )

  return { ordered, progressRows }
}

/** Convenience: load + compute in one call. */
export async function getMissionAvailability(
  studentId: string
): Promise<Map<string, MissionAvailability>> {
  return computeAvailability(await loadAvailabilityInputs(studentId))
}

/**
 * Whether the student may open one specific mission.
 *
 * Used by `POST /api/mission/progress` to refuse creating a resume bookmark for
 * a mission the student was never granted — the write that made the naive
 * row-existence rule self-widening.
 */
export async function canOpenMission(studentId: string, benchmarkId: string): Promise<boolean> {
  const availability = await getMissionAvailability(studentId)
  return availability.get(benchmarkId)?.openable ?? false
}

/** States that mean there is something for the student to do in this mission. */
const ACTIONABLE_STATES = new Set<MissionNodeState>([
  'AVAILABLE',
  'IN_PROGRESS',
  'READY_FOR_MASTERY',
  'NEEDS_REMEDIATION',
  'REMEDIATION_COMPLETE',
  'INTERVENTION_REQUIRED',
])

/**
 * "The mission you're in right now" — the earliest one in course order the
 * student can actually act on.
 *
 * Pure, and shared on purpose. At least five surfaces derive a "current mission"
 * with subtly different rules (dashboard, student profile, parent summary, daily
 * report, status distribution). Every one that routes through here is one fewer
 * place that can disagree with the map about where a student stands.
 *
 * Relies on `computeAvailability` returning a Map in course order, which it does
 * — insertion order follows the `ordered` array.
 */
export function pickCurrentMissionId(
  availability: Map<string, MissionAvailability>
): string | null {
  for (const node of availability.values()) {
    if (node.openable && ACTIONABLE_STATES.has(node.state)) return node.benchmarkId
  }
  return null
}
