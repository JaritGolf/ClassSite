/**
 * Confidence Calibration Snapshot writer (spec §17, §29 computeCalibrationSnapshot).
 *
 * Persists a point-in-time calibration tally for a student. Written after every
 * confidence-required assessment submission so the teacher calibration trend
 * (calibration-analytics/*) has real historical data to read.
 */

import { prisma } from '@/lib/db'
import type { CalibrationBreakdown } from './breakdown'

/**
 * @param studentId Student.id
 * @param scope     "overall" or "benchmark:<code>"
 */
export async function recordCalibrationSnapshot(
  studentId: string,
  scope: string,
  breakdown: CalibrationBreakdown
): Promise<void> {
  await prisma.confidenceCalibrationSnapshot.create({
    data: {
      studentId,
      scope,
      highConfidenceCorrect: breakdown.high.correct,
      highConfidenceIncorrect: breakdown.high.incorrect,
      mediumConfidenceCorrect: breakdown.medium.correct,
      mediumConfidenceIncorrect: breakdown.medium.incorrect,
      lowConfidenceCorrect: breakdown.low.correct,
      lowConfidenceIncorrect: breakdown.low.incorrect,
    },
  })
}
