/**
 * Lesson step content editing (global default + per-class override).
 *
 * Two independent write paths, mirroring the existing visibility toggle's
 * scope split (src/lib/lesson-media/index.ts):
 *   - editGlobalStepContent: admin-only (enforced by the caller/route), edits
 *     the step's global default title/content.
 *   - setClassContentOverride: teacher/admin, roster-guarded, edits ONE
 *     class's override — the global default and other classes are untouched.
 * Both are schema-validated (never store a malformed edit) and audit-logged.
 */

import { prisma } from '@/lib/db'
import { assertClassOwnedByTeacher } from '@/lib/teacher-roster'
import { pruneOrUpdateOverrideRow } from '@/lib/lesson-media'
import { validateAndSerializeStepContent } from './content-schema'

export const LESSON_STEP_CONTENT_EDITED = 'LESSON_STEP_CONTENT_EDITED'

export class LessonEditorError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'STEP_TYPE_MISMATCH',
    message: string
  ) {
    super(message)
    this.name = 'LessonEditorError'
  }
}

export interface StepContentEditInput {
  /** Must match the target step's actual stepType — a cheap guard against a
   * stale client submitting the wrong shape for the wrong step. */
  stepType: string
  /** Optional: LessonStep.title (global) or the class override's title.
   * Omitted = leave the global title unchanged / inherit it for a class
   * override. This is the STEP-LIST label, distinct from a content schema's
   * own `title` field (e.g. VideoContent.title, the video's on-screen
   * title) which lives inside `payload`. */
  title?: string
  payload?: unknown
}

async function getStepOrThrow(lessonStepId: string) {
  const step = await prisma.lessonStep.findUnique({
    where: { id: lessonStepId },
    select: { id: true, stepType: true, title: true, content: true },
  })
  if (!step) throw new LessonEditorError('NOT_FOUND', `Lesson step ${lessonStepId} not found`)
  return step
}

function assertStepTypeMatches(actual: string, expected: string) {
  if (actual !== expected) {
    throw new LessonEditorError(
      'STEP_TYPE_MISMATCH',
      `Step is type ${actual}, but the edit was submitted for ${expected}`
    )
  }
}

/** Edit a step's GLOBAL default content. Caller must have already enforced
 * admin-only authorization — this function has no role check of its own. */
export async function editGlobalStepContent(
  actorUserId: string,
  lessonStepId: string,
  input: StepContentEditInput
): Promise<{ id: string; title: string; content: string }> {
  const step = await getStepOrThrow(lessonStepId)
  assertStepTypeMatches(step.stepType, input.stepType)
  const content = await validateAndSerializeStepContent(step.stepType, input.payload)
  const title = input.title ?? step.title

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lessonStep.update({
      where: { id: step.id },
      data: { title, content, contentEditedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_STEP_CONTENT_EDITED,
        entityType: 'LessonStep',
        entityId: step.id,
        metadataJson: {
          scope: 'global',
          stepType: step.stepType,
          titleBefore: step.title,
          titleAfter: title,
          contentBefore: step.content,
          contentAfter: content,
        },
      },
    })
    return { id: updated.id, title: updated.title, content: updated.content }
  })
}

/** Set (or clear) a class-scoped content override. Roster-guarded — the
 * caller must own `classId`. */
export async function setClassContentOverride(
  actorUserId: string,
  classId: string,
  lessonStepId: string,
  input: StepContentEditInput | { clear: true }
): Promise<void> {
  await assertClassOwnedByTeacher(actorUserId, classId)
  const step = await getStepOrThrow(lessonStepId)

  if ('clear' in input) {
    await prisma.$transaction(async (tx) => {
      await pruneOrUpdateOverrideRow(tx, classId, step.id, {
        overrideTitle: null,
        overrideContent: null,
      })
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: LESSON_STEP_CONTENT_EDITED,
          entityType: 'LessonStep',
          entityId: step.id,
          metadataJson: { scope: 'class', classId, cleared: true },
        },
      })
    })
    return
  }

  assertStepTypeMatches(step.stepType, input.stepType)
  const content = await validateAndSerializeStepContent(step.stepType, input.payload)

  await prisma.$transaction(async (tx) => {
    await pruneOrUpdateOverrideRow(tx, classId, step.id, {
      overrideTitle: input.title ?? null,
      overrideContent: content,
    })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_STEP_CONTENT_EDITED,
        entityType: 'LessonStep',
        entityId: step.id,
        metadataJson: {
          scope: 'class',
          classId,
          stepType: step.stepType,
          titleAfter: input.title ?? null,
          contentAfter: content,
        },
      },
    })
  })
}
