/**
 * Confidence Calibration Breakdown — Pure Functions
 *
 * No database calls. Computes, from a set of graded responses, how many were
 * correct vs. incorrect at each confidence level. This drives both the
 * student-facing calibration feedback (spec §17.4) and the persisted
 * ConfidenceCalibrationSnapshot rows read by the teacher dashboards (§17.6).
 *
 * Confidence encoding (matches grader.ts):
 *   0 = "Not sure"   (low)
 *   1 = "Pretty sure" (medium)
 *   2 = "Very sure"  (high)
 * Responses with null confidence are ignored (e.g. ungraded pre-checks).
 */

export interface ConfidenceTally {
  correct: number
  incorrect: number
}

export interface CalibrationBreakdown {
  high: ConfidenceTally
  medium: ConfidenceTally
  low: ConfidenceTally
}

export interface CalibrationGrade {
  confidence: number | null
  isCorrect: boolean
}

export function emptyBreakdown(): CalibrationBreakdown {
  return {
    high: { correct: 0, incorrect: 0 },
    medium: { correct: 0, incorrect: 0 },
    low: { correct: 0, incorrect: 0 },
  }
}

/**
 * Tally correct/incorrect by confidence level. Null-confidence responses are
 * skipped so the breakdown reflects only items where the student rated themselves.
 */
export function computeCalibrationBreakdown(
  grades: CalibrationGrade[]
): CalibrationBreakdown {
  const breakdown = emptyBreakdown()

  for (const g of grades) {
    if (g.confidence === null || g.confidence === undefined) continue
    const bucket =
      g.confidence >= 2 ? breakdown.high : g.confidence === 1 ? breakdown.medium : breakdown.low
    if (g.isCorrect) bucket.correct += 1
    else bucket.incorrect += 1
  }

  return breakdown
}
