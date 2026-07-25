import { resolveAssessmentActivity } from '@/lib/student-activity'

describe('resolveAssessmentActivity', () => {
  const benchmark = { code: 'SS.7.CG.1.1', title: 'The Enlightenment' }

  it('maps mission-phase assessment types to their student-facing labels', () => {
    expect(
      resolveAssessmentActivity({ assessmentType: 'PRE_CHECK', mode: null, benchmark })
    ).toEqual({ label: 'Pre-Check', subLabel: benchmark.title, href: '/student/mission/SS.7.CG.1.1', icon: 'compass' })

    expect(
      resolveAssessmentActivity({ assessmentType: 'VOCAB_CHECK', mode: null, benchmark })
    ).toMatchObject({ label: 'Key Terms', icon: 'book' })

    expect(
      resolveAssessmentActivity({ assessmentType: 'PRACTICE', mode: null, benchmark })
    ).toMatchObject({ label: 'Practice', icon: 'bolt' })

    expect(
      resolveAssessmentActivity({ assessmentType: 'READINESS_CHECK', mode: null, benchmark })
    ).toMatchObject({ label: 'Readiness Check', icon: 'target' })

    expect(
      resolveAssessmentActivity({ assessmentType: 'MASTERY_CHALLENGE', mode: null, benchmark })
    ).toMatchObject({ label: 'Mastery Challenge', icon: 'shield' })

    expect(
      resolveAssessmentActivity({ assessmentType: 'UNIT_REVIEW', mode: null, benchmark })
    ).toMatchObject({ label: 'Unit Review', icon: 'star' })
  })

  it('links mission-phase assessments to the mission page', () => {
    const result = resolveAssessmentActivity({ assessmentType: 'MASTERY_CHALLENGE', mode: null, benchmark })
    expect(result.href).toBe('/student/mission/SS.7.CG.1.1')
  })

  it('falls back to the mission map when a mission-phase assessment has no benchmark', () => {
    const result = resolveAssessmentActivity({ assessmentType: 'PRACTICE', mode: null, benchmark: null })
    expect(result.href).toBe('/student/map')
    expect(result.subLabel).toBeNull()
  })

  it.each([
    ['QUICK_REVIEW', 'Quick Review'],
    ['CATEGORY_CHALLENGE', 'Category Challenge'],
    ['MIXED_MISSION', 'Mixed Mission'],
    ['MISTAKE_REPLAY', 'Mistake Replay'],
    ['SOURCE_SPRINT', 'Source Sprint'],
    ['ENDURANCE_TRIAL', 'Endurance Trial'],
  ] as const)('maps Republic Challenge mode %s to label %s', (mode, label) => {
    const result = resolveAssessmentActivity({ assessmentType: 'REPUBLIC_CHALLENGE', mode, benchmark: null })
    expect(result.label).toBe(label)
    expect(result.icon).toBe('flag')
  })

  it('routes benchmark-less Republic Challenge modes to the hub, not a mission page', () => {
    const result = resolveAssessmentActivity({
      assessmentType: 'REPUBLIC_CHALLENGE',
      mode: 'QUICK_REVIEW',
      benchmark: null,
    })
    expect(result.href).toBe('/student/republic-challenge')
  })

  it('routes a Category Challenge (benchmark-scoped) run to that mission page', () => {
    const result = resolveAssessmentActivity({
      assessmentType: 'REPUBLIC_CHALLENGE',
      mode: 'CATEGORY_CHALLENGE',
      benchmark,
    })
    expect(result.href).toBe('/student/mission/SS.7.CG.1.1')
  })

  it('labels Final Republic Trial distinctly from its mode', () => {
    const result = resolveAssessmentActivity({
      assessmentType: 'FINAL_TRIAL',
      mode: 'FINAL_REPUBLIC_TRIAL',
      benchmark: null,
    })
    expect(result.label).toBe('Final Republic Trial')
    expect(result.href).toBe('/student/republic-challenge')
  })

  it('falls back to a generic label for an unmapped assessment type', () => {
    const result = resolveAssessmentActivity({ assessmentType: 'REASSESSMENT', mode: null, benchmark })
    expect(result.label).toBe('Reassessment')
  })
})
