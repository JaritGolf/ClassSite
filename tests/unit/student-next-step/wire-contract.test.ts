/**
 * Wire contract for `GET /api/student/next-step`.
 *
 * `StudentPlan` is a TypeScript type shared by the route and the client
 * components, so the FIELD NAMES cannot drift the way the questionId / position
 * / confidence bugs did. What a compile-time type cannot catch is whether the
 * value actually survives JSON: a `Date` silently becomes a string, an
 * `undefined` silently vanishes, and the client's types would keep insisting
 * otherwise.
 *
 * So this parses the real ranker output, after a real JSON round-trip, through a
 * schema written independently of the implementation.
 */

import { z } from 'zod'
import { buildStudentPlan, type RankInputs } from '@/lib/student-next-step/rank'

const NextStepSchema = z
  .object({
    kind: z.enum([
      'REMEDIATION',
      'MISSION_RESUME',
      'DRILL',
      'MISSION_START',
      'STRATEGY',
      'REPUBLIC_CHALLENGE',
      'LAST_ACTIVITY',
      'ALL_CAUGHT_UP',
    ]),
    label: z.string().min(1),
    subLabel: z.string().min(1),
    // Must be an in-app path: a next step is never an external destination
    // (rule #9) and never a bare fragment the router cannot resolve.
    href: z.string().regex(/^\/student\/[\w\-[\]./]*$/),
    icon: z.string().min(1),
    ctaLabel: z.string().min(1),
    estimatedMinutes: z.number().int().positive().nullable(),
    count: z.number().int().nonnegative().optional(),
  })
  // Strict: an added field is a wire change and should fail here rather than
  // reach a client that does not know about it.
  .strict()

const StudentPlanSchema = z
  .object({
    primary: NextStepSchema,
    then: z.array(NextStepSchema),
  })
  .strict()

const FULL_INPUTS: RankInputs = {
  remediation: {
    studentRemediationId: 'rem-1',
    title: 'Separation of Powers — reteach',
    benchmarkTitle: 'Branches of Government',
  },
  mission: {
    benchmarkCode: 'SS.7.CG.1.5',
    title: 'The Bill of Rights',
    state: 'IN_PROGRESS',
    readinessPassed: false,
  },
  drillDueCount: 7,
  strategyOwed: 2,
  masteredCount: 3,
  lastActivity: {
    label: 'Source Decoder',
    subLabel: 'Level 3',
    href: '/student/source-decoder',
    icon: 'search',
  },
}

const EMPTY_INPUTS: RankInputs = {
  remediation: null,
  mission: null,
  drillDueCount: 0,
  strategyOwed: 0,
  masteredCount: 0,
  lastActivity: null,
}

/** Exactly what the route does to the plan on its way out. */
function overTheWire(inputs: RankInputs): unknown {
  return JSON.parse(JSON.stringify(buildStudentPlan(inputs)))
}

describe('StudentPlan wire contract', () => {
  it('survives JSON serialization with every step still valid', () => {
    expect(() => StudentPlanSchema.parse(overTheWire(FULL_INPUTS))).not.toThrow()
  })

  it('is valid in the nothing-to-do case too', () => {
    expect(() => StudentPlanSchema.parse(overTheWire(EMPTY_INPUTS))).not.toThrow()
  })

  it('loses no field to JSON (no undefined-only or Date values)', () => {
    const before = buildStudentPlan(FULL_INPUTS)
    const after = overTheWire(FULL_INPUTS)
    // A Date or undefined in the tree would make these diverge.
    expect(after).toEqual(JSON.parse(JSON.stringify(before)))
    expect(Object.keys(before.primary).sort()).toEqual(
      Object.keys((after as typeof before).primary).sort()
    )
  })

  it('carries no assessment internals — this is a navigation payload', () => {
    // Cheap standing guard: the plan is fetched by clients mid-assessment, so it
    // must never grow a field that leaks grading data (rules #1 and #2).
    const serialized = JSON.stringify(buildStudentPlan(FULL_INPUTS))
    for (const forbidden of ['isCorrect', 'pointsAwarded', 'answerKey', 'optionId']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
