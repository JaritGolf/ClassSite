/**
 * Progress checkpoints — pure level math.
 *
 * A teacher sets, for each of the four nine-week checkpoints, an end date and up
 * to four target missions on the mission map. A student's standing at a
 * checkpoint is a LEVEL: how far along that ladder they had reached.
 *
 * No DB access here. No dates from the ambient clock — every function that needs
 * "now" takes it as an argument, so behavior is testable and deterministic.
 */

/** Levels are 1..4; 0 means "not yet at Level 1". */
export const MIN_LEVEL = 1
export const MAX_LEVEL = 4
export const LEVELS = [1, 2, 3, 4] as const

/** A configured target: reach this mission to earn this level. */
export interface LevelTarget {
  level: number
  benchmarkId: string
  /** Position on the mission map. Used only for ordering validation. */
  sequenceOrder: number
}

export interface LevelOutcome {
  /** Highest level fully earned, 0 if none. */
  level: number
  /** Highest level this checkpoint can award, given which targets are set. */
  maxLevel: number
  /** The next level up, or null when already at maxLevel. */
  nextLevel: number | null
  /** Target for `nextLevel`, or null when there is nothing further to reach. */
  nextTarget: LevelTarget | null
}

/**
 * Compute a student's level at a checkpoint.
 *
 * Rule: the highest N such that the targets for levels 1..N are ALL cleared —
 * a prefix rule, not simply "the highest cleared target".
 *
 * Why prefix: a teacher's UNLOCK_BENCHMARK override lets a student skip ahead,
 * so "highest cleared" could award Level 4 to a student who never cleared the
 * Level 2 target. In the normal sequential case the two rules agree.
 *
 * Levels with no configured target are treated as absent, not as uncleared: a
 * checkpoint with only levels 1-2 set simply caps at Level 2. Gaps are skipped,
 * so targets set for levels 1, 2 and 4 cap at 4 and ignore the missing 3.
 */
export function computeCheckpointLevel(
  targets: LevelTarget[],
  clearedBenchmarkIds: ReadonlySet<string>
): LevelOutcome {
  const byLevel = new Map<number, LevelTarget>()
  for (const t of targets) {
    if (t.level >= MIN_LEVEL && t.level <= MAX_LEVEL) byLevel.set(t.level, t)
  }

  const configured = [...byLevel.keys()].sort((a, b) => a - b)
  const maxLevel = configured.length > 0 ? configured[configured.length - 1] : 0

  let level = 0
  for (const candidate of configured) {
    const target = byLevel.get(candidate)!
    if (!clearedBenchmarkIds.has(target.benchmarkId)) break
    level = candidate
  }

  const nextLevel = configured.find((l) => l > level) ?? null
  const nextTarget = nextLevel === null ? null : byLevel.get(nextLevel)!

  return { level, maxLevel, nextLevel, nextTarget }
}

/**
 * Count how many of an ordered mission list a student has cleared up to and
 * including a given target — i.e. "N missions to go" for the student card.
 *
 * `orderedSequenceOrders` must be the reachable missions in map order.
 */
export function missionsRemainingToTarget(
  orderedSequenceOrders: number[],
  clearedSequenceOrders: ReadonlySet<number>,
  targetSequenceOrder: number
): number {
  return orderedSequenceOrders.filter(
    (s) => s <= targetSequenceOrder && !clearedSequenceOrders.has(s)
  ).length
}

// ── Target ordering validation ────────────────────────────────────────────────

export interface TargetOrderProblem {
  code: 'NOT_INCREASING' | 'DUPLICATE_LEVEL' | 'LEVEL_OUT_OF_RANGE'
  message: string
}

/**
 * Validate that a checkpoint's targets advance along the map as the level rises.
 *
 * STRICTLY increasing, deliberately: two levels sharing one target mission would
 * both fire at the same moment, making the displayed level jump (e.g. 2 -> 4) and
 * making one level unreachable on its own.
 */
export function validateTargetOrder(targets: LevelTarget[]): TargetOrderProblem[] {
  const problems: TargetOrderProblem[] = []
  const seenLevels = new Set<number>()

  for (const t of targets) {
    if (t.level < MIN_LEVEL || t.level > MAX_LEVEL) {
      problems.push({
        code: 'LEVEL_OUT_OF_RANGE',
        message: `Level ${t.level} is outside the allowed range ${MIN_LEVEL}-${MAX_LEVEL}.`,
      })
    }
    if (seenLevels.has(t.level)) {
      problems.push({
        code: 'DUPLICATE_LEVEL',
        message: `Level ${t.level} has more than one target.`,
      })
    }
    seenLevels.add(t.level)
  }

  const sorted = [...targets].sort((a, b) => a.level - b.level)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (cur.sequenceOrder <= prev.sequenceOrder) {
      problems.push({
        code: 'NOT_INCREASING',
        message:
          `Level ${cur.level}'s target must come later on the mission map than ` +
          `Level ${prev.level}'s.`,
      })
    }
  }

  return problems
}

/**
 * Validate that consecutive checkpoints keep advancing: checkpoint 2's Level 1
 * target cannot sit before checkpoint 1's highest target.
 *
 * `checkpoints` must be ordered by checkpoint number; empty target lists are
 * skipped so a not-yet-configured checkpoint never blocks saving.
 */
export function validateCheckpointProgression(
  checkpoints: { checkpointNumber: number; targets: LevelTarget[] }[]
): TargetOrderProblem[] {
  const problems: TargetOrderProblem[] = []
  let previousMax: { checkpointNumber: number; sequenceOrder: number } | null = null

  for (const cp of [...checkpoints].sort((a, b) => a.checkpointNumber - b.checkpointNumber)) {
    if (cp.targets.length === 0) continue
    const min = Math.min(...cp.targets.map((t) => t.sequenceOrder))
    const max = Math.max(...cp.targets.map((t) => t.sequenceOrder))

    if (previousMax !== null && min <= previousMax.sequenceOrder) {
      problems.push({
        code: 'NOT_INCREASING',
        message:
          `Checkpoint ${cp.checkpointNumber}'s first target must come later on the ` +
          `mission map than checkpoint ${previousMax.checkpointNumber}'s last target.`,
      })
    }
    previousMax = { checkpointNumber: cp.checkpointNumber, sequenceOrder: max }
  }

  return problems
}

// ── Date handling ─────────────────────────────────────────────────────────────

/**
 * The school's timezone. Single-district app (Palm Beach County), so this is a
 * constant rather than a per-class setting.
 */
export const SCHOOL_TIME_ZONE = 'America/New_York'

/**
 * Exclusive upper bound for "cleared by the end of `endsOn`".
 *
 * `endsOn` is a date-only column, which Prisma hands back as UTC midnight.
 * Comparing timestamps directly against it — or against `endsOn + 1 day` in UTC —
 * would cut students off at 8pm Eastern on the due date, because UTC midnight
 * falls during the previous evening locally. This resolves the start of the next
 * calendar day in the school's own timezone, so a student working at 11pm on the
 * due date still counts.
 *
 * Returns an instant to compare with `<` (exclusive).
 */
export function endOfSchoolDayUtc(endsOn: Date): Date {
  // Read the calendar date as it appears in UTC (that is how a @db.Date arrives).
  const y = endsOn.getUTCFullYear()
  const m = endsOn.getUTCMonth()
  const d = endsOn.getUTCDate()

  // Midnight local time on the day AFTER endsOn, expressed as a UTC instant.
  // Start from the naive UTC guess, then correct by the zone's offset on that date.
  const naiveNextMidnightUtc = Date.UTC(y, m, d + 1, 0, 0, 0, 0)
  const offsetMs = schoolZoneOffsetMs(new Date(naiveNextMidnightUtc))
  return new Date(naiveNextMidnightUtc + offsetMs)
}

/**
 * How far behind UTC the school timezone is, in milliseconds, at a given instant.
 * Positive for western zones (EST = +5h, EDT = +4h), so adding it to a naive-UTC
 * wall-clock reading converts that wall clock into a real UTC instant.
 */
function schoolZoneOffsetMs(at: Date): number {
  // Format the instant in the school zone, then reinterpret those wall-clock
  // fields as if they were UTC. The difference is the zone's offset.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  // Intl can emit hour 24 for midnight under hour12:false; normalize to 0.
  const hour = get('hour') % 24

  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  )
  return at.getTime() - asIfUtc
}

/** Whether a checkpoint's end date has passed as of `now`. */
export function isCheckpointClosed(endsOn: Date, now: Date): boolean {
  return now.getTime() >= endOfSchoolDayUtc(endsOn).getTime()
}

/**
 * Decide which missions count as cleared "as of" an instant.
 *
 * A mission is cleared when it was mastered or off-ramped. Both carry their own
 * timestamp (`masteredAt`, `offRampTriggeredAt`) — the teacher-override path
 * stamps those same columns, so no separate override lookup is needed.
 *
 * Rows that are cleared by status but carry NO timestamp cannot be dated. They
 * count in the live view (`asOf` null) and are excluded from a closed
 * checkpoint, which is the conservative choice: a snapshot never claims a
 * student had reached something before it can be shown they did.
 */
export interface ClearableRow {
  benchmarkId: string
  status: string
  masteredAt: Date | null
  offRampTriggeredAt: Date | null
}

/** Statuses that mean "the student got past this mission". */
export const CLEARED_STATUSES = new Set([
  'MASTERED',
  'EXPOSURE_COMPLETE',
  'TEACHER_OVERRIDE',
])

export function clearedBenchmarkIdsAsOf(
  rows: ClearableRow[],
  asOf: Date | null
): Set<string> {
  const cleared = new Set<string>()

  for (const row of rows) {
    if (!CLEARED_STATUSES.has(row.status)) continue

    if (asOf === null) {
      cleared.add(row.benchmarkId)
      continue
    }

    const stamps = [row.masteredAt, row.offRampTriggeredAt].filter(
      (d): d is Date => d instanceof Date
    )
    if (stamps.length === 0) continue // undateable — excluded from a closed checkpoint

    const earliest = Math.min(...stamps.map((d) => d.getTime()))
    if (earliest < asOf.getTime()) cleared.add(row.benchmarkId)
  }

  return cleared
}
