/**
 * Pure ranking rule for "what should this student do next".
 *
 * These tests are the reason `rank.ts` has no Prisma in it. The bug class being
 * fixed was several surfaces each deciding this differently, so the decision
 * needs to be cheap to exercise from fixtures at every branch.
 */

import {
  rankNextSteps,
  buildStudentPlan,
  missionLabel,
  type RankInputs,
} from '@/lib/student-next-step/rank'
import { MAX_THEN_STEPS, estimateDrillMinutes } from '@/lib/student-next-step/types'

/** Nothing to do at all. Individual tests switch on only what they care about. */
const EMPTY: RankInputs = {
  remediation: null,
  mission: null,
  drillDueCount: 0,
  strategyOwed: 0,
  masteredCount: 0,
  lastActivity: null,
}

const REMEDIATION = {
  studentRemediationId: 'rem-1',
  title: 'Separation of Powers — reteach',
  benchmarkTitle: 'Branches of Government',
}

function mission(overrides: Partial<RankInputs['mission'] & object> = {}) {
  return {
    benchmarkCode: 'SS.7.CG.1.5',
    title: 'The Bill of Rights',
    state: 'AVAILABLE' as const,
    readinessPassed: false,
    ...overrides,
  }
}

describe('rankNextSteps — always answers', () => {
  it('returns ALL_CAUGHT_UP rather than nothing when there is no work', () => {
    const steps = rankNextSteps(EMPTY)
    expect(steps).toHaveLength(1)
    expect(steps[0].kind).toBe('ALL_CAUGHT_UP')
    // Even the empty state must go somewhere real.
    expect(steps[0].href).toBe('/student/map')
  })

  it('never produces a step without a destination or a CTA', () => {
    const steps = rankNextSteps({
      ...EMPTY,
      remediation: REMEDIATION,
      mission: mission({ state: 'IN_PROGRESS' }),
      drillDueCount: 4,
      strategyOwed: 2,
      masteredCount: 3,
      lastActivity: {
        label: 'Source Decoder',
        subLabel: 'Level 3',
        href: '/student/source-decoder',
        icon: 'search',
      },
    })
    for (const step of steps) {
      expect(step.href).toMatch(/^\/student\//)
      expect(step.ctaLabel.length).toBeGreaterThan(0)
      expect(step.label.length).toBeGreaterThan(0)
      expect(step.subLabel.length).toBeGreaterThan(0)
    }
  })
})

describe('rankNextSteps — order', () => {
  it('puts assigned remediation first, ahead of a resumable mission', () => {
    // The headline rule. A failed Mastery Challenge assigns targeted work and
    // that work gates the off-ramp, so it outranks self-directed progress.
    const steps = rankNextSteps({
      ...EMPTY,
      remediation: REMEDIATION,
      mission: mission({ state: 'IN_PROGRESS' }),
      drillDueCount: 9,
    })
    expect(steps[0].kind).toBe('REMEDIATION')
    expect(steps[0].href).toBe('/student/remediation/rem-1')
  })

  it('resumes an in-progress mission ahead of the drill', () => {
    const steps = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'IN_PROGRESS' }),
      drillDueCount: 6,
    })
    expect(steps.map((s) => s.kind)).toEqual(['MISSION_RESUME', 'DRILL'])
  })

  it('puts the drill ahead of STARTING a new mission', () => {
    // A 3-minute decaying review should not wait behind a 20-minute new mission,
    // even though it must not interrupt work already in flight.
    const steps = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'AVAILABLE' }),
      drillDueCount: 6,
    })
    expect(steps.map((s) => s.kind)).toEqual(['DRILL', 'MISSION_START'])
  })

  it('ranks strategy and cumulative review after the core path', () => {
    const steps = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'AVAILABLE' }),
      strategyOwed: 3,
      masteredCount: 2,
    })
    expect(steps.map((s) => s.kind)).toEqual([
      'MISSION_START',
      'STRATEGY',
      'REPUBLIC_CHALLENGE',
    ])
  })

  it('offers a brand-new student exactly one thing: start the first mission', () => {
    const steps = rankNextSteps({ ...EMPTY, mission: mission({ state: 'AVAILABLE' }) })
    expect(steps).toHaveLength(1)
    expect(steps[0].kind).toBe('MISSION_START')
    expect(steps[0].href).toBe('/student/mission/SS.7.CG.1.5')
  })
})

describe('rankNextSteps — gating', () => {
  it('omits the drill when nothing is due', () => {
    const steps = rankNextSteps({ ...EMPTY, mission: mission(), drillDueCount: 0 })
    expect(steps.map((s) => s.kind)).not.toContain('DRILL')
  })

  it('omits strategy when the teacher set no requirement', () => {
    const steps = rankNextSteps({ ...EMPTY, mission: mission(), strategyOwed: 0 })
    expect(steps.map((s) => s.kind)).not.toContain('STRATEGY')
  })

  it('does not offer cumulative review before anything has been mastered', () => {
    // Nothing to review yet — the Republic Challenge pools would be empty.
    const steps = rankNextSteps({ ...EMPTY, masteredCount: 0 })
    expect(steps.map((s) => s.kind)).not.toContain('REPUBLIC_CHALLENGE')
  })
})

describe('rankNextSteps — mission phrasing names the actual step', () => {
  it('sends an available mission to its plan screen', () => {
    const [step] = rankNextSteps({ ...EMPTY, mission: mission({ state: 'AVAILABLE' }) })
    expect(step.kind).toBe('MISSION_START')
    expect(step.subLabel).toMatch(/mission plan/i)
  })

  it('says "pick up where you left off" for work in flight', () => {
    const [step] = rankNextSteps({ ...EMPTY, mission: mission({ state: 'IN_PROGRESS' }) })
    expect(step.subLabel).toMatch(/pick up where you left off/i)
  })

  it('announces the Mastery Challenge once readiness is passed', () => {
    const [step] = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'IN_PROGRESS', readinessPassed: true }),
    })
    expect(step.subLabel).toMatch(/mastery challenge/i)
    expect(step.ctaLabel).toMatch(/mastery challenge/i)
  })

  it('trusts a passed readiness check over a status that has not caught up', () => {
    // `readinessPassed` is checked before the status precisely because the
    // progress row may still say IN_PROGRESS when the gate is already open.
    const [viaStatus] = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'READY_FOR_MASTERY' }),
    })
    const [viaAttempt] = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'IN_PROGRESS', readinessPassed: true }),
    })
    expect(viaAttempt.subLabel).toBe(viaStatus.subLabel)
  })

  it('points a completed remediation at the Second Chance Challenge', () => {
    const [step] = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'REMEDIATION_COMPLETE' }),
    })
    expect(step.subLabel).toMatch(/second chance/i)
  })

  it('never tells a student a mission is locked — it only ever offers work', () => {
    // LOCKED / COMING_SOON benchmarks are filtered out upstream by
    // pickCurrentMissionId, so anything reaching the ranker is actionable.
    const states = ['IN_PROGRESS', 'NEEDS_REMEDIATION', 'INTERVENTION_REQUIRED'] as const
    for (const state of states) {
      const [step] = rankNextSteps({ ...EMPTY, mission: mission({ state }) })
      expect(step.subLabel).not.toMatch(/locked/i)
      expect(step.href).toBe('/student/mission/SS.7.CG.1.5')
    }
  })
})

describe('rankNextSteps — last activity', () => {
  const sourceDecoder = {
    label: 'Source Decoder',
    subLabel: 'Level 3',
    href: '/student/source-decoder',
    icon: 'search' as const,
  }

  it('surfaces a track the ranker does not otherwise model', () => {
    // This is what preserves the deleted "pick up where you left off" card: the
    // ranker knows nothing about Source Decoder levels.
    const steps = rankNextSteps({ ...EMPTY, mission: mission(), lastActivity: sourceDecoder })
    const last = steps.find((s) => s.kind === 'LAST_ACTIVITY')
    expect(last?.href).toBe('/student/source-decoder')
  })

  it('does not restate a step already in the list', () => {
    const steps = rankNextSteps({
      ...EMPTY,
      mission: mission({ state: 'IN_PROGRESS' }),
      lastActivity: {
        label: 'Training',
        subLabel: 'The Bill of Rights',
        href: '/student/mission/SS.7.CG.1.5',
        icon: 'sparkle',
      },
    })
    expect(steps.filter((s) => s.href === '/student/mission/SS.7.CG.1.5')).toHaveLength(1)
    expect(steps.map((s) => s.kind)).not.toContain('LAST_ACTIVITY')
  })

  it('is not enough on its own to displace ALL_CAUGHT_UP framing order', () => {
    const steps = rankNextSteps({ ...EMPTY, lastActivity: sourceDecoder })
    // With genuinely nothing assigned, the last activity IS the best suggestion.
    expect(steps[0].kind).toBe('LAST_ACTIVITY')
  })
})

describe('estimates stay honest', () => {
  it('derives drill length from the real due count', () => {
    const [step] = rankNextSteps({ ...EMPTY, drillDueCount: 12 })
    expect(step.estimatedMinutes).toBe(estimateDrillMinutes(12))
    expect(step.count).toBe(12)
  })

  it('never claims a drill takes under two minutes', () => {
    expect(estimateDrillMinutes(1)).toBeGreaterThanOrEqual(2)
  })

  it('gives ALL_CAUGHT_UP no duration rather than a made-up one', () => {
    const [step] = rankNextSteps(EMPTY)
    expect(step.estimatedMinutes).toBeNull()
  })

  it('pluralises the drill count', () => {
    const [one] = rankNextSteps({ ...EMPTY, drillDueCount: 1 })
    const [many] = rankNextSteps({ ...EMPTY, drillDueCount: 2 })
    expect(one.subLabel).toMatch(/1 question /)
    expect(many.subLabel).toMatch(/2 questions /)
  })
})

describe('missionLabel', () => {
  it('shortens a well-formed benchmark code', () => {
    expect(missionLabel('SS.7.CG.1.5', 'The Bill of Rights')).toBe(
      'Mission 1.5: The Bill of Rights'
    )
  })

  it('falls back to the bare title for an unexpected code shape', () => {
    // Never render "Mission SS.7.CG.1.5: …" or an empty prefix.
    expect(missionLabel('WEIRD-CODE', 'The Bill of Rights')).toBe('The Bill of Rights')
    expect(missionLabel('SS.7.CG.1.5.9', 'Title')).toBe('Title')
  })
})

describe('buildStudentPlan', () => {
  it('splits into one primary step and a capped shortlist', () => {
    const plan = buildStudentPlan({
      ...EMPTY,
      remediation: REMEDIATION,
      mission: mission({ state: 'IN_PROGRESS' }),
      drillDueCount: 5,
      strategyOwed: 2,
      masteredCount: 4,
      lastActivity: {
        label: 'Source Decoder',
        subLabel: 'Level 3',
        href: '/student/source-decoder',
        icon: 'search',
      },
    })
    expect(plan.primary.kind).toBe('REMEDIATION')
    expect(plan.then.length).toBeLessThanOrEqual(MAX_THEN_STEPS)
    expect(plan.then.map((s) => s.kind)).toEqual(['MISSION_RESUME', 'DRILL', 'STRATEGY'])
    // The primary is never repeated in the shortlist.
    expect(plan.then.map((s) => s.href)).not.toContain(plan.primary.href)
  })

  it('always has a primary, even with no work at all', () => {
    expect(buildStudentPlan(EMPTY).primary.kind).toBe('ALL_CAUGHT_UP')
    expect(buildStudentPlan(EMPTY).then).toEqual([])
  })
})
