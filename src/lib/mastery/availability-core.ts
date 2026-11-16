/**
 * Mission availability — the PURE rule, shared by the browser and the server.
 *
 * No database, no Prisma, no Next.js: this file is imported by client
 * components, because a student's progress now lives only on their device
 * (src/lib/local-progress). The rule itself is unchanged from the server-side
 * engine it was extracted from.
 */

/** Status of one mission in a student's own (device-local) progress. */
export type MissionProgressStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_MASTERY'
  | 'NEEDS_REMEDIATION'
  | 'REMEDIATION_COMPLETE'
  | 'MASTERED'
  | 'EXPOSURE_COMPLETE'

/** A mission that is finished, whichever way it finished. */
export const TERMINAL_STATUSES: ReadonlySet<MissionProgressStatus> = new Set([
  'MASTERED',
  'EXPOSURE_COMPLETE',
])

/** Written only as the outcome of real work on a mission that was open. */
const ENGINE_WRITTEN_STATUSES: ReadonlySet<MissionProgressStatus> = new Set([
  'READY_FOR_MASTERY',
  'NEEDS_REMEDIATION',
  'REMEDIATION_COMPLETE',
])

/**
 * What a map node looks like. A stored status, or one of three derived states.
 *
 * COMING_SOON is deliberately distinct from LOCKED: a lock tells a 12-year-old
 * they failed to earn something; an unbuilt mission is nobody's failure.
 */
export type MissionNodeState = MissionProgressStatus | 'AVAILABLE' | 'LOCKED' | 'COMING_SOON'

export interface MissionAvailability {
  benchmarkId: string
  state: MissionNodeState
  openable: boolean
}

export interface AvailabilityBenchmark {
  id: string
  playable: boolean
}

export interface AvailabilityInputs {
  /** Every benchmark in active units, in curriculum order. */
  ordered: AvailabilityBenchmark[]
  progressRows: { benchmarkId: string; status: MissionProgressStatus }[]
}

/**
 * Decide, for every benchmark, what the map shows and whether it opens.
 *
 * A mission is reached when it is the first playable one, when the playable
 * mission before it is finished (unplayable ones are skipped over), or when it
 * already carries a status that only real work can produce. IN_PROGRESS alone
 * never counts — it only records that a page was opened.
 */
export function computeAvailability(inputs: AvailabilityInputs): Map<string, MissionAvailability> {
  const { ordered, progressRows } = inputs
  const statusById = new Map(progressRows.map((r) => [r.benchmarkId, r.status]))
  const playable = ordered.map((b) => b.playable)
  const firstPlayableIndex = playable.indexOf(true)

  let carriedFromTerminal = false
  const result = new Map<string, MissionAvailability>()

  ordered.forEach((benchmark, index) => {
    const status = statusById.get(benchmark.id) ?? null
    const thisIsPlayable = playable[index]

    const reached =
      index === firstPlayableIndex ||
      carriedFromTerminal ||
      (status !== null && (TERMINAL_STATUSES.has(status) || ENGINE_WRITTEN_STATUSES.has(status)))

    const openable = reached && thisIsPlayable

    let state: MissionNodeState
    if (status !== null && TERMINAL_STATUSES.has(status)) {
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

    if (status !== null && TERMINAL_STATUSES.has(status)) {
      carriedFromTerminal = true
    } else if (thisIsPlayable) {
      carriedFromTerminal = false
    }
  })

  return result
}

const ACTIONABLE_STATES: ReadonlySet<MissionNodeState> = new Set([
  'AVAILABLE',
  'IN_PROGRESS',
  'READY_FOR_MASTERY',
  'NEEDS_REMEDIATION',
  'REMEDIATION_COMPLETE',
])

/** The mission a student should be working on: the first open, unfinished one. */
export function pickCurrentMissionId(
  availability: Map<string, MissionAvailability>
): string | null {
  for (const node of availability.values()) {
    if (node.openable && ACTIONABLE_STATES.has(node.state)) return node.benchmarkId
  }
  return null
}

/**
 * Off-ramp rule (non-negotiable rule #4): three failed Mastery Challenges, at
 * least one completed remediation, and seven days since the first failure.
 * Off-ramp is not failure — it opens the next mission and increases review.
 */
export function isOffRampConditionMet(
  failedAttemptCount: number,
  completedRemediationCount: number,
  firstAttemptDate: Date,
  now: Date
): boolean {
  if (failedAttemptCount < 3) return false
  if (completedRemediationCount < 1) return false
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  return now.getTime() - firstAttemptDate.getTime() >= sevenDaysMs
}

/**
 * Mastery form rotation: forms are served round-robin by the number of
 * Mastery Challenges already submitted, so a retry gets different questions.
 */
export function pickMasteryFormIndex(formCount: number, submittedAttempts: number): number {
  if (formCount <= 0) return -1
  return Math.max(0, submittedAttempts) % formCount
}
