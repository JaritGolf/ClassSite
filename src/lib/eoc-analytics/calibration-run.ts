/**
 * EOC Calibration Run Engine
 *
 * Computes Pearson correlations between EOC readiness metrics and actual
 * scaled scores, then recommends reporting-category weight changes.
 *
 * Non-negotiable rules:
 *   1. Admin must explicitly approve before any weight change is recorded as applied.
 *   2. REPORTING_CATEGORY_WEIGHTS constant is NEVER mutated by this module.
 *   3. Calibration runs require at least 1 actual score; otherwise throw NO_ACTUAL_SCORES.
 *
 * Spec reference: Section 20.5 (EOC Calibration Feedback Loop)
 */

import { prisma } from '@/lib/db'
import type { EocCalibrationRun } from '@prisma/client'
import { pearsonCorrelation, correlationByBucket } from './correlation'
import { REPORTING_CATEGORY_WEIGHTS } from './readiness'

// ── Error Types ────────────────────────────────────────────────────────────────

export class CalibrationError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_ACTUAL_SCORES' | 'INSUFFICIENT_SAMPLE'
  ) {
    super(message)
    this.name = 'CalibrationError'
  }
}

// ── Result Types ───────────────────────────────────────────────────────────────

export interface CalibrationRunResult {
  runId: string
  schoolYear: string
  correlationReadinessToScaled: number | null
  correlationByReportingCategory: Record<string, number>
  correlationByStimulusType: Record<string, number>
  correlationByComplexity: Record<string, number>
  correlationByReadingLoad: Record<string, number>
  correlationByConfidenceCalibration: number | null
  recommendedWeightChanges: Record<
    string,
    { current: number; recommended: number; deltaPercent: number }
  >
  applied: false
  runAt: Date
  auditLogId: string
}

// ── Weight Recommendation Logic ────────────────────────────────────────────────

/**
 * Compute recommended weights from per-RC correlations.
 *
 * Algorithm:
 *   1. For each RC: recommended_raw = current_weight * (rc_correlation / mean_correlation)
 *      - If rc_correlation is NaN (insufficient data), treat as 0
 *      - If mean_correlation is 0 or NaN, keep current weights unchanged
 *   2. Clamp each recommended_raw to [0.10, 0.40]
 *   3. Renormalize so weights sum to 1.0
 *
 * @param rcCorrelations - Map of RC name → Pearson r (may contain NaN)
 * @returns recommended weight changes per RC name
 */
function computeRecommendedWeights(
  rcCorrelations: Record<string, number>
): Record<string, { current: number; recommended: number; deltaPercent: number }> {
  const result: Record<string, { current: number; recommended: number; deltaPercent: number }> = {}

  // Compute mean correlation (treating NaN as 0)
  const rcEntries = Object.entries(REPORTING_CATEGORY_WEIGHTS)
  const correlationValues = rcEntries.map(([name]) => {
    const r = rcCorrelations[name]
    return isNaN(r) ? 0 : r
  })
  const meanCorrelation = correlationValues.reduce((s, v) => s + v, 0) / correlationValues.length

  // If mean correlation is 0 or negative, keep current weights
  const useMeanAdjustment = meanCorrelation > 0

  const rawRecommended: Record<string, number> = {}
  for (const [name, currentWeight] of rcEntries) {
    const r = rcCorrelations[name]
    const safeR = isNaN(r) ? 0 : r

    if (useMeanAdjustment) {
      rawRecommended[name] = currentWeight * (safeR / meanCorrelation)
    } else {
      rawRecommended[name] = currentWeight
    }
  }

  // Clamp to [0.10, 0.40]
  const clamped: Record<string, number> = {}
  for (const [name, raw] of Object.entries(rawRecommended)) {
    clamped[name] = Math.min(0.40, Math.max(0.10, raw))
  }

  // Renormalize to sum=1.0
  const clampedSum = Object.values(clamped).reduce((s, v) => s + v, 0)
  for (const [name, clampedWeight] of Object.entries(clamped)) {
    const currentWeight = REPORTING_CATEGORY_WEIGHTS[name] ?? 0.25
    const recommended = clampedSum === 0 ? currentWeight : clampedWeight / clampedSum
    const deltaPercent = currentWeight === 0 ? 0 : ((recommended - currentWeight) / currentWeight) * 100
    result[name] = {
      current: currentWeight,
      recommended: Math.round(recommended * 10000) / 10000, // 4 decimal places
      deltaPercent: Math.round(deltaPercent * 100) / 100,
    }
  }

  return result
}

// ── Main Functions ─────────────────────────────────────────────────────────────

/**
 * Create a calibration run for the given school year.
 *
 * Loads all EocActualScore rows for the school year, pairs them with
 * EocReadinessSnapshot data, computes 5 Pearson correlations, recommends
 * weight changes, and writes one EocCalibrationRun + one AuditLog.
 *
 * @throws CalibrationError('NO_ACTUAL_SCORES') if no scores exist for the year
 */
export async function createCalibrationRun(
  actorUserId: string,
  schoolYear: string
): Promise<CalibrationRunResult> {
  // 1. Load all actual scores for the school year
  const actualScores = await prisma.eocActualScore.findMany({
    where: { schoolYear },
    select: {
      studentId: true,
      scaledScore: true,
      achievementLevel: true,
    },
  })

  if (actualScores.length === 0) {
    throw new CalibrationError(
      `No EocActualScore rows found for school year ${schoolYear}`,
      'NO_ACTUAL_SCORES'
    )
  }

  const studentIds = actualScores.map((s) => s.studentId)
  const sampleSize = studentIds.length

  // 2. Load latest EocReadinessSnapshot per student per reporting category
  // We use the most recent snapshot (max createdAt) for each student+RC pair
  const snapshots = await prisma.eocReadinessSnapshot.findMany({
    where: { studentId: { in: studentIds } },
    select: {
      studentId: true,
      reportingCategoryId: true,
      readinessScore: true,
      createdAt: true,
      reportingCategory: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Keep only the latest snapshot per (studentId, reportingCategoryId)
  const latestSnapshotKey = new Map<string, (typeof snapshots)[0]>()
  for (const snap of snapshots) {
    const key = `${snap.studentId}::${snap.reportingCategoryId}`
    if (!latestSnapshotKey.has(key)) {
      latestSnapshotKey.set(key, snap)
    }
  }

  // 3. Build xs/ys arrays for overall readiness → scaled score correlation
  const scoreMap = new Map(actualScores.map((s) => [s.studentId, s.scaledScore]))

  // Overall readiness per student = mean readinessScore across all RC snapshots
  const studentReadinessMap = new Map<string, { total: number; count: number }>()
  for (const snap of latestSnapshotKey.values()) {
    const entry = studentReadinessMap.get(snap.studentId) ?? { total: 0, count: 0 }
    entry.total += snap.readinessScore
    entry.count++
    studentReadinessMap.set(snap.studentId, entry)
  }

  const overallXs: number[] = []
  const overallYs: number[] = []
  for (const [studentId, agg] of studentReadinessMap.entries()) {
    const scaledScore = scoreMap.get(studentId)
    if (scaledScore != null) {
      overallXs.push(agg.total / agg.count)
      overallYs.push(scaledScore)
    }
  }

  const correlationReadinessToScaled =
    overallXs.length >= 2 ? pearsonCorrelation(overallXs, overallYs) : null

  // 4a. Correlation by Reporting Category
  const rcRows: Array<{ bucket: string; x: number; y: number }> = []
  for (const snap of latestSnapshotKey.values()) {
    const scaledScore = scoreMap.get(snap.studentId)
    if (scaledScore != null) {
      rcRows.push({
        bucket: snap.reportingCategory.name,
        x: snap.readinessScore,
        y: scaledScore,
      })
    }
  }
  const correlationByReportingCategory = correlationByBucket(rcRows)

  // 4b. Load AttemptResponse data for by-dimension correlations (last 30 days)
  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId: { in: studentIds },
        voided: false,
        submittedAt: { gte: since30Days },
      },
    },
    select: {
      attempt: { select: { studentId: true } },
      isCorrect: true,
      confidence: true,
      question: {
        select: {
          readingLoadLevel: true,
          cognitiveComplexity: true,
          stimulus: { select: { stimulusType: true } },
        },
      },
    },
  })

  // 4b-i. Stimulus type correlation (per-student correct rate by stimulus type → scaled score)
  const stimulusStudentMap = new Map<string, Map<string, { correct: number; total: number }>>()
  for (const r of responses) {
    const sType = r.question.stimulus?.stimulusType ?? 'NONE'
    const sid = r.attempt.studentId
    const byStim = stimulusStudentMap.get(sType) ?? new Map()
    const entry = byStim.get(sid) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byStim.set(sid, entry)
    stimulusStudentMap.set(sType, byStim)
  }

  const stimRows: Array<{ bucket: string; x: number; y: number }> = []
  for (const [sType, byStudent] of stimulusStudentMap.entries()) {
    for (const [sid, agg] of byStudent.entries()) {
      const scaledScore = scoreMap.get(sid)
      if (scaledScore != null && agg.total > 0) {
        stimRows.push({ bucket: sType, x: agg.correct / agg.total, y: scaledScore })
      }
    }
  }
  const correlationByStimulusType = correlationByBucket(stimRows)

  // 4b-ii. Complexity correlation
  const complexityStudentMap = new Map<string, Map<string, { correct: number; total: number }>>()
  for (const r of responses) {
    const cx = r.question.cognitiveComplexity
    const sid = r.attempt.studentId
    const byCx = complexityStudentMap.get(cx) ?? new Map()
    const entry = byCx.get(sid) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byCx.set(sid, entry)
    complexityStudentMap.set(cx, byCx)
  }

  const complexityRows: Array<{ bucket: string; x: number; y: number }> = []
  for (const [cx, byStudent] of complexityStudentMap.entries()) {
    for (const [sid, agg] of byStudent.entries()) {
      const scaledScore = scoreMap.get(sid)
      if (scaledScore != null && agg.total > 0) {
        complexityRows.push({ bucket: cx, x: agg.correct / agg.total, y: scaledScore })
      }
    }
  }
  const correlationByComplexity = correlationByBucket(complexityRows)

  // 4b-iii. Reading load correlation
  const rlStudentMap = new Map<string, Map<string, { correct: number; total: number }>>()
  for (const r of responses) {
    const rl = String(r.question.readingLoadLevel)
    const sid = r.attempt.studentId
    const byRl = rlStudentMap.get(rl) ?? new Map()
    const entry = byRl.get(sid) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byRl.set(sid, entry)
    rlStudentMap.set(rl, byRl)
  }

  const rlRows: Array<{ bucket: string; x: number; y: number }> = []
  for (const [rl, byStudent] of rlStudentMap.entries()) {
    for (const [sid, agg] of byStudent.entries()) {
      const scaledScore = scoreMap.get(sid)
      if (scaledScore != null && agg.total > 0) {
        rlRows.push({ bucket: rl, x: agg.correct / agg.total, y: scaledScore })
      }
    }
  }
  const correlationByReadingLoad = correlationByBucket(rlRows)

  // 4b-iv. Confidence calibration correlation (proportion very-sure-and-correct vs scaled score)
  const confStudentMap = new Map<string, { correct: number; total: number }>()
  for (const r of responses) {
    if (r.confidence == null) continue
    const sid = r.attempt.studentId
    const entry = confStudentMap.get(sid) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    confStudentMap.set(sid, entry)
  }

  const confXs: number[] = []
  const confYs: number[] = []
  for (const [sid, agg] of confStudentMap.entries()) {
    const scaledScore = scoreMap.get(sid)
    if (scaledScore != null && agg.total > 0) {
      confXs.push(agg.correct / agg.total)
      confYs.push(scaledScore)
    }
  }
  const correlationByConfidenceCalibration =
    confXs.length >= 2 ? pearsonCorrelation(confXs, confYs) : null

  // 5. Compute recommended weight changes
  const recommendedWeightChanges = computeRecommendedWeights(correlationByReportingCategory)

  // 6. $transaction: write EocCalibrationRun + AuditLog
  const { runId, auditLogId } = await prisma.$transaction(async (tx) => {
    const run = await tx.eocCalibrationRun.create({
      data: {
        schoolYear,
        correlationReadinessToScaled:
          correlationReadinessToScaled != null && !isNaN(correlationReadinessToScaled)
            ? correlationReadinessToScaled
            : null,
        correlationByReportingCategory,
        correlationByStimulusType,
        correlationByComplexity,
        correlationByReadingLoad,
        correlationByConfidenceCalibration:
          correlationByConfidenceCalibration != null && !isNaN(correlationByConfidenceCalibration)
            ? correlationByConfidenceCalibration
            : undefined,
        recommendedWeightChanges,
        applied: false,
        runAt: new Date(),
      },
      select: { id: true, runAt: true },
    })

    const auditLog = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'CALIBRATION_RUN_CREATED',
        entityType: 'EocCalibrationRun',
        entityId: run.id,
        metadataJson: {
          schoolYear,
          sampleSize,
          recommendedWeightChanges,
        },
      },
      select: { id: true },
    })

    return { runId: run.id, runAt: run.runAt, auditLogId: auditLog.id }
  })

  return {
    runId,
    schoolYear,
    correlationReadinessToScaled:
      correlationReadinessToScaled != null && !isNaN(correlationReadinessToScaled)
        ? correlationReadinessToScaled
        : null,
    correlationByReportingCategory,
    correlationByStimulusType,
    correlationByComplexity,
    correlationByReadingLoad,
    correlationByConfidenceCalibration:
      correlationByConfidenceCalibration != null && !isNaN(correlationByConfidenceCalibration)
        ? correlationByConfidenceCalibration
        : null,
    recommendedWeightChanges,
    applied: false,
    runAt: new Date(),
    auditLogId,
  }
}

/**
 * Get calibration status for a given school year.
 *
 * Status meanings:
 *   YEAR_ONE_NO_SCORES      — No EocActualScore rows exist for this year
 *   AWAITING_FIRST_RUN      — Scores exist but no calibration run has been created
 *   RUN_PENDING_APPROVAL    — Latest run has applied=false
 *   RUN_APPROVED            — Latest run has applied=true
 */
export async function getCalibrationStatus(schoolYear: string): Promise<{
  status: 'YEAR_ONE_NO_SCORES' | 'AWAITING_FIRST_RUN' | 'RUN_PENDING_APPROVAL' | 'RUN_APPROVED'
  latestRun: EocCalibrationRun | null
  scoreCount: number
}> {
  const scoreCount = await prisma.eocActualScore.count({ where: { schoolYear } })

  if (scoreCount === 0) {
    return { status: 'YEAR_ONE_NO_SCORES', latestRun: null, scoreCount }
  }

  const latestRun = await prisma.eocCalibrationRun.findFirst({
    where: { schoolYear },
    orderBy: { runAt: 'desc' },
  })

  if (!latestRun) {
    return { status: 'AWAITING_FIRST_RUN', latestRun: null, scoreCount }
  }

  const status = latestRun.applied ? 'RUN_APPROVED' : 'RUN_PENDING_APPROVAL'
  return { status, latestRun, scoreCount }
}
