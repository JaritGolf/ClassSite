/**
 * Device-local progress rules — mastery, unlock, off-ramp, form rotation,
 * remediation, SM-2 review, badges. All pure: no storage, no network.
 */

import {
  applyDrillReview,
  assignRemediations,
  completeRemediation,
  completeSourceDecoderLevel,
  currentMissionCode,
  dueReviewCodes,
  emptyProgress,
  evaluateBadges,
  markMissionOpened,
  missionAvailability,
  noteQuestions,
  pickMasteryForm,
  recordMasteryAttempt,
  recordReadinessPassed,
  recordStrategyUse,
  saveMissionFlow,
  strategyOwed,
  type LocalProgress,
  type MissionCatalogEntry,
} from '@/lib/local-progress'
import { buildLocalPlan } from '@/lib/local-progress/plan'

const CATALOG: MissionCatalogEntry[] = [
  { code: 'SS.7.CG.1.1', title: 'One', playable: true, unitId: 'u1', reportingCategory: 'Origins and Purposes' },
  { code: 'SS.7.CG.1.2', title: 'Two', playable: true, unitId: 'u1', reportingCategory: 'Origins and Purposes' },
  { code: 'SS.7.CG.1.3', title: 'Three', playable: false, unitId: 'u1', reportingCategory: 'Origins and Purposes' },
  { code: 'SS.7.CG.1.4', title: 'Four', playable: true, unitId: 'u2', reportingCategory: 'Organization and Function' },
]
const A = 'SS.7.CG.1.1'
const B = 'SS.7.CG.1.2'
const D = 'SS.7.CG.1.4'
const day = (n: number) => new Date(Date.UTC(2026, 8, n, 15))

function attempt(p: LocalProgress, code: string, passed: boolean, now: Date, remediation: { itemId: string; title: string }[] = []) {
  return recordMasteryAttempt(p, {
    code,
    formId: 'form',
    score: passed ? 1 : 0.4,
    passed,
    completionCode: passed ? 'MCC-TEST' : null,
    remediation,
    now,
  })
}
const state = (p: LocalProgress, code: string) => missionAvailability(CATALOG, p).get(code)!

describe('a brand-new device', () => {
  const fresh = emptyProgress()

  it('opens exactly the first playable mission', () => {
    expect(state(fresh, A)).toMatchObject({ state: 'AVAILABLE', openable: true })
    expect(state(fresh, B)).toMatchObject({ state: 'LOCKED', openable: false })
    expect(state(fresh, D)).toMatchObject({ state: 'LOCKED', openable: false })
    expect(currentMissionCode(CATALOG, fresh)).toBe(A)
  })

  it('shows an unbuilt mission as coming soon, never as locked', () => {
    expect(state(fresh, 'SS.7.CG.1.3')).toMatchObject({ state: 'COMING_SOON', openable: false })
  })
})

describe('opening a mission', () => {
  it('marks it in progress and keeps the resume point', () => {
    let p = markMissionOpened(emptyProgress(), A)
    expect(p.missions[A].status).toBe('IN_PROGRESS')
    p = saveMissionFlow(p, A, { step: 'training', completed: ['plan'], trainingIndex: 3, trainingStepId: 's3' })
    expect(p.missions[A].flow).toMatchObject({ step: 'training', trainingIndex: 3 })
  })

  it('merely opening a LOCKED mission does not unlock it (IN_PROGRESS is not a grant)', () => {
    const p = markMissionOpened(emptyProgress(), D)
    expect(state(p, D).openable).toBe(false)
  })

  it('never downgrades a mastered mission', () => {
    const p = attempt(emptyProgress(), A, true, day(1)).progress
    expect(markMissionOpened(p, A).missions[A].status).toBe('MASTERED')
    expect(saveMissionFlow(p, A, { step: 'plan', completed: [], trainingIndex: 0 }).missions[A].status).toBe('MASTERED')
  })
})

describe('mastery (80% decided by the server, remembered by the device)', () => {
  it('a pass masters the mission, opens the next, and schedules review for tomorrow', () => {
    const { progress: p, outcome } = attempt(emptyProgress(), A, true, day(1))
    expect(outcome).toBe('MASTERED')
    expect(p.missions[A]).toMatchObject({ status: 'MASTERED', masteryScore: 1, completionCode: 'MCC-TEST' })
    expect(state(p, B)).toMatchObject({ state: 'AVAILABLE', openable: true })
    expect(p.review[A].dueAt).toBe(day(2).toISOString())
    expect(dueReviewCodes(p, day(1))).toEqual([])
    expect(dueReviewCodes(p, day(2))).toEqual([A])
  })

  it('unlock skips over a mission that is not built yet', () => {
    let p = attempt(emptyProgress(), A, true, day(1)).progress
    p = attempt(p, B, true, day(2)).progress
    expect(state(p, 'SS.7.CG.1.3').state).toBe('COMING_SOON')
    expect(state(p, D)).toMatchObject({ state: 'AVAILABLE', openable: true })
  })

  it('a second pass keeps the first mastery date and does not reset SM-2 state', () => {
    let p = attempt(emptyProgress(), A, true, day(1)).progress
    p = applyDrillReview(p, A, { isCorrect: true, confidence: 2, questionId: 'q1' }, day(2)).progress
    const reviewBefore = p.review[A]
    p = attempt(p, A, true, day(9)).progress
    expect(p.missions[A].masteredAt).toBe(day(1).toISOString())
    expect(p.review[A]).toEqual(reviewBefore)
  })

  it('a fail assigns the suggested remediation and does not open the next mission', () => {
    const { progress: p, outcome } = attempt(emptyProgress(), A, false, day(1), [{ itemId: 'r1', title: 'Reteach' }])
    expect(outcome).toBe('NEEDS_REMEDIATION')
    expect(p.missions[A].status).toBe('NEEDS_REMEDIATION')
    expect(p.remediations).toHaveLength(1)
    expect(state(p, B).openable).toBe(false)
    expect(state(p, A).openable).toBe(true)
  })

  it('does not assign the same open remediation twice', () => {
    let p = attempt(emptyProgress(), A, false, day(1), [{ itemId: 'r1', title: 'Reteach' }]).progress
    p = attempt(p, A, false, day(2), [{ itemId: 'r1', title: 'Reteach' }]).progress
    expect(p.remediations).toHaveLength(1)
  })
})

describe('remediation', () => {
  it('finishing the last one makes the mission ready for a second chance', () => {
    let p = attempt(emptyProgress(), A, false, day(1), [
      { itemId: 'r1', title: 'One' },
      { itemId: 'r2', title: 'Two' },
    ]).progress
    p = completeRemediation(p, 'r1', day(2))
    expect(p.missions[A].status).toBe('NEEDS_REMEDIATION')
    p = completeRemediation(p, 'r2', day(2))
    expect(p.missions[A].status).toBe('REMEDIATION_COMPLETE')
  })

  it('completing an unknown item changes nothing', () => {
    const p = emptyProgress()
    expect(completeRemediation(p, 'nope', day(1))).toBe(p)
  })

  it('assignRemediations ignores an item that is already open', () => {
    let p = assignRemediations(emptyProgress(), A, [{ itemId: 'r1', title: 'One' }], day(1))
    p = assignRemediations(p, A, [{ itemId: 'r1', title: 'One' }], day(2))
    expect(p.remediations).toHaveLength(1)
  })
})

describe('off-ramp (3 fails + a completed remediation + 7 days)', () => {
  function threeFails(lastDay: number, remediate: boolean) {
    let p = attempt(emptyProgress(), A, false, day(1), [{ itemId: 'r1', title: 'One' }]).progress
    if (remediate) p = completeRemediation(p, 'r1', day(2))
    p = attempt(p, A, false, day(3)).progress
    return attempt(p, A, false, day(lastDay))
  }

  it('triggers when all three conditions hold, and opens the next mission', () => {
    const { progress: p, outcome } = threeFails(9, true)
    expect(outcome).toBe('OFF_RAMP')
    expect(p.missions[A].status).toBe('EXPOSURE_COMPLETE')
    expect(p.missions[A].offRampAt).toBe(day(9).toISOString())
    expect(state(p, B)).toMatchObject({ state: 'AVAILABLE', openable: true })
    expect(p.review[A]).toBeDefined()
  })

  it('does not trigger before 7 days have passed', () => {
    expect(threeFails(6, true).outcome).toBe('NEEDS_REMEDIATION')
  })

  it('does not trigger without a completed remediation', () => {
    expect(threeFails(20, false).outcome).toBe('NEEDS_REMEDIATION')
  })

  it('does not trigger on only two fails', () => {
    let p = attempt(emptyProgress(), A, false, day(1), [{ itemId: 'r1', title: 'One' }]).progress
    p = completeRemediation(p, 'r1', day(2))
    expect(attempt(p, A, false, day(20)).outcome).toBe('NEEDS_REMEDIATION')
  })
})

describe('mastery form rotation', () => {
  const forms = ['formA', 'formB']
  it('serves forms round-robin by the number of submitted attempts', () => {
    let p = emptyProgress()
    expect(pickMasteryForm(forms, p, A)).toBe('formA')
    p = attempt(p, A, false, day(1)).progress
    expect(pickMasteryForm(forms, p, A)).toBe('formB')
    p = attempt(p, A, false, day(2)).progress
    expect(pickMasteryForm(forms, p, A)).toBe('formA')
  })

  it('returns null when the benchmark has no form', () => {
    expect(pickMasteryForm([], emptyProgress(), A)).toBeNull()
  })
})

describe('readiness', () => {
  it('a pass stores the token and makes the mission ready for mastery', () => {
    const p = recordReadinessPassed(markMissionOpened(emptyProgress(), A), A, 'R1~token', day(1))
    expect(p.missions[A]).toMatchObject({ status: 'READY_FOR_MASTERY', readinessToken: 'R1~token' })
  })

  it('does not overwrite a mission that is already mastered', () => {
    const p = recordReadinessPassed(attempt(emptyProgress(), A, true, day(1)).progress, A, 't', day(2))
    expect(p.missions[A].status).toBe('MASTERED')
  })
})

describe('Daily Drill — SM-2 on the device', () => {
  const mastered = attempt(emptyProgress(), A, true, day(1)).progress

  it('follows the SM-2 interval ladder 1 → 6 for confident correct answers', () => {
    const first = applyDrillReview(mastered, A, { isCorrect: true, confidence: 2, questionId: 'q1' }, day(2))
    expect(first.outcome).toMatchObject({ quality: 5, newIntervalDays: 1 })
    const second = applyDrillReview(first.progress, A, { isCorrect: true, confidence: 2, questionId: 'q2' }, day(3))
    expect(second.outcome?.newIntervalDays).toBe(6)
    expect(second.progress.reviewCount).toBe(2)
  })

  it('a wrong answer resets the interval and is remembered as missed', () => {
    const r = applyDrillReview(mastered, A, { isCorrect: false, confidence: 2, questionId: 'q9' }, day(2))
    expect(r.outcome).toMatchObject({ quality: 0, newIntervalDays: 1 })
    expect(r.progress.missedQuestionIds).toContain('q9')
  })

  it('does nothing for a benchmark that is not in review', () => {
    const r = applyDrillReview(emptyProgress(), A, { isCorrect: true, confidence: 1, questionId: 'q' }, day(1))
    expect(r.outcome).toBeNull()
  })

  it('a question answered correctly later leaves the missed pile', () => {
    let p = noteQuestions(emptyProgress(), ['q1'], ['q1'])
    expect(p.missedQuestionIds).toEqual(['q1'])
    p = noteQuestions(p, ['q1'], [])
    expect(p.missedQuestionIds).toEqual([])
  })
})

describe('badges', () => {
  const badges = [
    { name: 'First', criteria: { event: 'benchmark_mastered', count: 1 } },
    { name: 'Unit one', criteria: { event: 'unit_complete', unitCode: 'u1' } },
    { name: 'Tagged', criteria: { event: 'benchmark_mastered', tags: ['x'], count: 1 } },
    { name: 'Decoder 1', criteria: { event: 'source_decoder_level', level: 1 } },
    { name: 'Strategist', criteria: { event: 'strategy_mission', missionCode: 'm1' } },
  ]

  it('awards on mastery, once, and keeps the original date', () => {
    const p = attempt(emptyProgress(), A, true, day(1)).progress
    const first = evaluateBadges(p, badges, CATALOG, day(1))
    expect(first.newlyEarned).toEqual(['First'])
    const again = evaluateBadges(first.progress, badges, CATALOG, day(5))
    expect(again.newlyEarned).toEqual([])
    expect(again.progress.badges.First).toBe(day(1).toISOString())
  })

  it('a unit badge counts only PLAYABLE missions in the unit', () => {
    let p = attempt(emptyProgress(), A, true, day(1)).progress
    expect(evaluateBadges(p, badges, CATALOG, day(1)).newlyEarned).not.toContain('Unit one')
    p = attempt(p, B, true, day(2)).progress
    expect(evaluateBadges(p, badges, CATALOG, day(2)).newlyEarned).toContain('Unit one')
  })

  it('never awards a criterion with no data source', () => {
    const p = attempt(emptyProgress(), A, true, day(1)).progress
    expect(evaluateBadges(p, badges, CATALOG, day(1)).newlyEarned).not.toContain('Tagged')
  })

  it('awards source decoder and strategy badges from device progress', () => {
    let p = completeSourceDecoderLevel(emptyProgress(), 1, day(1))
    p = recordStrategyUse(p, 'm1', day(1))
    expect(evaluateBadges(p, badges, CATALOG, day(1)).newlyEarned.sort()).toEqual(['Decoder 1', 'Strategist'])
  })
})

describe('other device-local counters', () => {
  it('source decoder levels unlock in order', () => {
    expect(completeSourceDecoderLevel(emptyProgress(), 2, day(1)).sourceDecoder).toEqual({})
    const p = completeSourceDecoderLevel(completeSourceDecoderLevel(emptyProgress(), 1, day(1)), 2, day(2))
    expect(Object.keys(p.sourceDecoder)).toEqual(['1', '2'])
  })

  it('strategy uses owed counts down against the target', () => {
    const p = recordStrategyUse(emptyProgress(), 'm1', day(1))
    expect(strategyOwed(p, ['m1', 'm2'], 2)).toBe(3)
    expect(strategyOwed(p, ['m1', 'm2'], 0)).toBe(0)
  })
})

describe('next-step plan from device progress', () => {
  const ctx = { catalog: CATALOG, strategyCodes: [], strategyRequired: 0 }

  it('a new student is sent to start the first mission', () => {
    const plan = buildLocalPlan(emptyProgress(), ctx, day(1))
    expect(plan.primary).toMatchObject({ kind: 'MISSION_START', href: `/student/mission/${A}` })
  })

  it('assigned remediation outranks everything and links to the item', () => {
    const p = attempt(emptyProgress(), A, false, day(1), [{ itemId: 'r1', title: 'Reteach' }]).progress
    expect(buildLocalPlan(p, ctx, day(1)).primary).toMatchObject({
      kind: 'REMEDIATION',
      href: '/student/remediation/r1',
    })
  })

  it('a due review appears once a mission is mastered', () => {
    const p = attempt(emptyProgress(), A, true, day(1)).progress
    const kinds = (now: Date) => {
      const plan = buildLocalPlan(p, ctx, now)
      return [plan.primary, ...plan.then].map((s) => s.kind)
    }
    expect(kinds(day(1))).not.toContain('DRILL')
    expect(kinds(day(3))).toContain('DRILL')
  })
})
