/**
 * Republic Challenge — Session Creation
 *
 * Builds the ephemeral Assessment + AssessmentAttempt row pair that backs a
 * single Republic Challenge session. Reuses the existing assessment engine
 * end-to-end:
 *
 *   - `fetchAssessmentForStudent` serves questions safely (no answer-key leak)
 *   - `gradeAndSubmit` grades responses (confidence enforcement already
 *     covers REPUBLIC_CHALLENGE and FINAL_TRIAL — see attempt.ts)
 *
 * Spec reference: §30.1-30.4.
 */

import { prisma } from '@/lib/db'
import type { Mode } from './stamina'
import { resolveSessionLength } from './stamina'
import {
  pickQuickReview,
  pickCategoryChallenge,
  pickMixedMission,
  pickMistakeReplay,
  pickSourceSprint,
  pickEnduranceTrial,
  pickFinalRepublicTrial,
} from './picker'

// ── Errors ────────────────────────────────────────────────────────────────────

export class RepublicChallengeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'EMPTY_POOL'
      | 'INVALID_MODE'
      | 'FEATURE_DISABLED'
      | 'CATEGORY_NOT_FOUND'
      | 'STIMULUS_TYPE_REQUIRED'
  ) {
    super(message)
    this.name = 'RepublicChallengeError'
  }
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  studentId: string
  mode: Mode
  /** Required for CATEGORY_CHALLENGE. */
  reportingCategoryId?: string
  /** Required for SOURCE_SPRINT. */
  stimulusType?: string
  /** Explicit length override; otherwise computed from mode + classConfig + now. */
  length?: number
  /** Optional class config used to resolve session length and feature gate. */
  classConfig?: {
    rcSessionLengthOverride: number | null
    rcStaminaOverride: number | null
    featureEocReviewEnabled: boolean
  } | null
  /** Override "now" for deterministic tests. */
  now?: Date
  /** Optional actor for AuditLog (typically the student's User.id). */
  actorUserId?: string | null
}

export interface CreateSessionResult {
  assessmentId: string
  questionCount: number
  mode: Mode
  assessmentType: 'REPUBLIC_CHALLENGE' | 'FINAL_TRIAL'
}

// ── Audit action codes (Phase 11) ─────────────────────────────────────────────

export const RC_AUDIT_ACTIONS = {
  RC_SESSION_STARTED: 'RC_SESSION_STARTED',
  RC_SESSION_SUBMITTED: 'RC_SESSION_SUBMITTED',
  RC_CLASS_CONFIG_UPDATED: 'RC_CLASS_CONFIG_UPDATED',
} as const

// ── Main entry ────────────────────────────────────────────────────────────────

/**
 * Create a Republic Challenge session for a student.
 *
 * Steps:
 *   1. Honour the feature gate (`featureEocReviewEnabled`).
 *   2. Resolve session length (mode + class override + current date).
 *   3. Pick question IDs via the mode-specific picker.
 *   4. In a single `$transaction`, create the Assessment + AssessmentQuestion
 *      rows + AssessmentAttempt + AuditLog.
 *   5. Return identifiers; caller redirects to `/student/assessment/[id]`.
 */
export async function createRepublicChallengeSession(
  input: CreateSessionInput
): Promise<CreateSessionResult> {
  const now = input.now ?? new Date()

  if (input.classConfig && input.classConfig.featureEocReviewEnabled === false) {
    throw new RepublicChallengeError(
      'Republic Challenge is disabled for this class.',
      'FEATURE_DISABLED'
    )
  }

  // 1. Decide assessmentType from mode.
  const assessmentType: 'REPUBLIC_CHALLENGE' | 'FINAL_TRIAL' =
    input.mode === 'FINAL_REPUBLIC_TRIAL' ? 'FINAL_TRIAL' : 'REPUBLIC_CHALLENGE'

  // 2. Resolve session length.
  const length =
    input.length ?? resolveSessionLength(input.classConfig ?? null, input.mode, now)

  // 3. Validate mode-specific inputs.
  if (input.mode === 'CATEGORY_CHALLENGE' && !input.reportingCategoryId) {
    throw new RepublicChallengeError(
      'CATEGORY_CHALLENGE requires reportingCategoryId.',
      'CATEGORY_NOT_FOUND'
    )
  }
  if (input.mode === 'SOURCE_SPRINT' && !input.stimulusType) {
    throw new RepublicChallengeError(
      'SOURCE_SPRINT requires stimulusType.',
      'STIMULUS_TYPE_REQUIRED'
    )
  }

  // 4. Pick the questions.
  const questionIds = await pickForMode(input, length)

  if (questionIds.length === 0) {
    throw new RepublicChallengeError(
      `No questions available for mode ${input.mode}.`,
      'EMPTY_POOL'
    )
  }

  // 5. Build a session title.
  const title = buildTitle(input.mode, input.reportingCategoryId, input.stimulusType)

  // 6. Persist atomically. We create the Assessment + AssessmentQuestion
  //    rows here; the AssessmentAttempt is created by the existing
  //    /api/assessment/[id]/start flow when the student begins playing.
  const { assessmentId } = await prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        benchmarkId: null,
        title,
        assessmentType,
        mode: input.mode,
        masteryThreshold: 0.8,
        approvalStatus: 'APPROVED',
      },
      select: { id: true },
    })

    await tx.assessmentQuestion.createMany({
      data: questionIds.map((qid, idx) => ({
        assessmentId: assessment.id,
        questionId: qid,
        sequenceOrder: idx,
        points: 1,
      })),
    })

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: RC_AUDIT_ACTIONS.RC_SESSION_STARTED,
        entityType: 'Assessment',
        entityId: assessment.id,
        metadataJson: {
          mode: input.mode,
          assessmentType,
          questionCount: questionIds.length,
          studentId: input.studentId,
        },
      },
    })

    return { assessmentId: assessment.id }
  })

  return {
    assessmentId,
    questionCount: questionIds.length,
    mode: input.mode,
    assessmentType,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function pickForMode(input: CreateSessionInput, length: number): Promise<string[]> {
  switch (input.mode) {
    case 'QUICK_REVIEW':
      return pickQuickReview(input.studentId, length)
    case 'CATEGORY_CHALLENGE':
      return pickCategoryChallenge(input.studentId, input.reportingCategoryId!, length)
    case 'MIXED_MISSION':
      return pickMixedMission(input.studentId, length)
    case 'MISTAKE_REPLAY':
      return pickMistakeReplay(input.studentId, length)
    case 'SOURCE_SPRINT':
      return pickSourceSprint(input.studentId, input.stimulusType!, length)
    case 'ENDURANCE_TRIAL':
      return pickEnduranceTrial(input.studentId, length)
    case 'FINAL_REPUBLIC_TRIAL':
      return pickFinalRepublicTrial(input.studentId, length)
  }
}

function buildTitle(
  mode: Mode,
  reportingCategoryId?: string,
  stimulusType?: string
): string {
  switch (mode) {
    case 'QUICK_REVIEW':
      return 'Quick Review'
    case 'CATEGORY_CHALLENGE':
      return `Category Challenge${reportingCategoryId ? '' : ''}`
    case 'MIXED_MISSION':
      return 'Mixed Mission'
    case 'MISTAKE_REPLAY':
      return 'Mistake Replay'
    case 'SOURCE_SPRINT':
      return `Source Sprint${stimulusType ? ` — ${stimulusType}` : ''}`
    case 'ENDURANCE_TRIAL':
      return 'Endurance Trial'
    case 'FINAL_REPUBLIC_TRIAL':
      return 'Final Republic Trial'
  }
}
