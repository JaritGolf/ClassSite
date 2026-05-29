/**
 * Unit Tests: Confidence Calibration Breakdown — Pure Functions
 *
 * No database. Verifies the (confidence × correctness) tally that drives the
 * student-facing calibration feedback (spec §17.4) and persisted snapshots.
 */

import {
  computeCalibrationBreakdown,
  emptyBreakdown,
  type CalibrationGrade,
} from '@/lib/metacognition/breakdown'

describe('computeCalibrationBreakdown', () => {
  it('returns an all-zero breakdown for no grades', () => {
    expect(computeCalibrationBreakdown([])).toEqual(emptyBreakdown())
  })

  it('buckets by confidence level (2=high, 1=medium, 0=low)', () => {
    const grades: CalibrationGrade[] = [
      { confidence: 2, isCorrect: true },
      { confidence: 2, isCorrect: false },
      { confidence: 1, isCorrect: true },
      { confidence: 0, isCorrect: false },
      { confidence: 0, isCorrect: false },
    ]
    expect(computeCalibrationBreakdown(grades)).toEqual({
      high: { correct: 1, incorrect: 1 },
      medium: { correct: 1, incorrect: 0 },
      low: { correct: 0, incorrect: 2 },
    })
  })

  it('ignores responses with null/undefined confidence', () => {
    const grades: CalibrationGrade[] = [
      { confidence: null, isCorrect: true },
      { confidence: undefined as unknown as number, isCorrect: false },
      { confidence: 2, isCorrect: true },
    ]
    const result = computeCalibrationBreakdown(grades)
    expect(result.high).toEqual({ correct: 1, incorrect: 0 })
    expect(result.medium).toEqual({ correct: 0, incorrect: 0 })
    expect(result.low).toEqual({ correct: 0, incorrect: 0 })
  })

  it('treats any confidence >= 2 as high (defensive)', () => {
    const result = computeCalibrationBreakdown([{ confidence: 5, isCorrect: true }])
    expect(result.high.correct).toBe(1)
  })
})
