/**
 * Lesson structure editing (add/remove/reorder steps) — admin-only, global.
 *
 * Structural changes affect every class/student, unlike a class-scoped
 * content override, so this stays global by design (no per-class step
 * lists). Callers must have already enforced admin-only authorization —
 * these functions have no role check of their own.
 *
 * Every op sets Lesson.structureEditedAt, which the seeder checks
 * (seed/lessons/_seeder.ts) to permanently stop touching this lesson's step
 * list on any future `db:seed` run.
 */

import type { LessonStepType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { isEditableStepType, validateAndSerializeStepContent } from './content-schema'

export const LESSON_STEP_ADDED = 'LESSON_STEP_ADDED'
export const LESSON_STEP_REMOVED = 'LESSON_STEP_REMOVED'
export const LESSON_STEPS_REORDERED = 'LESSON_STEPS_REORDERED'

export class LessonStructureError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'INVALID_ORDER' | 'INVALID_STEP_TYPE',
    message: string
  ) {
    super(message)
    this.name = 'LessonStructureError'
  }
}

export interface AddStepInput {
  lessonId: string
  stepType: string
  title: string
  payload?: unknown
  required?: boolean
  /** Insert after this step id, or 'end' to append (default). */
  position?: string | 'end'
}

/** Add a new step to a lesson. Content is validated up front — a step is
 * only ever created with content that already passes its own schema, so
 * there's no "blank, half-written, live-to-students" intermediate state. */
export async function addLessonStep(
  actorUserId: string,
  input: AddStepInput
): Promise<{ id: string; sequenceOrder: number }> {
  if (!isEditableStepType(input.stepType)) {
    throw new LessonStructureError('INVALID_STEP_TYPE', `Unknown step type: ${input.stepType}`)
  }
  const stepType: LessonStepType = input.stepType
  const content = await validateAndSerializeStepContent(input.stepType, input.payload)

  return prisma.$transaction(async (tx) => {
    const siblings = await tx.lessonStep.findMany({
      where: { lessonId: input.lessonId },
      orderBy: { sequenceOrder: 'asc' },
      select: { id: true, sequenceOrder: true },
    })

    // Index (0-based) in `siblings` right after which the new step lands.
    const insertAt =
      !input.position || input.position === 'end'
        ? siblings.length
        : siblings.findIndex((s) => s.id === input.position) + 1

    // Shift every sibling at/after the insertion point up by one, so the new
    // step can take the now-vacant 1-indexed position `insertAt + 1`.
    for (const sibling of siblings.slice(insertAt)) {
      await tx.lessonStep.update({
        where: { id: sibling.id },
        data: { sequenceOrder: sibling.sequenceOrder + 1 },
      })
    }

    const sequenceOrder = insertAt + 1
    const created = await tx.lessonStep.create({
      data: {
        lessonId: input.lessonId,
        stepType,
        title: input.title,
        content,
        sequenceOrder,
        required: input.required ?? true,
        source: 'ADMIN',
        contentEditedAt: new Date(),
      },
    })

    await tx.lesson.update({
      where: { id: input.lessonId },
      data: { structureEditedAt: new Date() },
    })

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_STEP_ADDED,
        entityType: 'LessonStep',
        entityId: created.id,
        metadataJson: {
          lessonId: input.lessonId,
          stepType: input.stepType,
          title: input.title,
          sequenceOrder: created.sequenceOrder,
          content,
        },
      },
    })

    return { id: created.id, sequenceOrder: created.sequenceOrder }
  })
}

/** How many students currently have their resume pointer on this step — for
 * a confirm-dialog warning before a destructive delete. */
export async function countAffectedStudentProgress(lessonStepId: string): Promise<number> {
  return prisma.studentProgress.count({ where: { currentStepId: lessonStepId } })
}

/** Remove a step. Nulls any StudentProgress.currentStepId pointing at it
 * BEFORE deleting (mirrors the existing reseed precedent that already nulls
 * resume pointers when step positions shift), then renumbers later
 * siblings. */
export async function removeLessonStep(
  actorUserId: string,
  lessonStepId: string
): Promise<{ nulledProgressCount: number }> {
  const step = await prisma.lessonStep.findUnique({
    where: { id: lessonStepId },
    select: { id: true, lessonId: true, stepType: true, title: true, sequenceOrder: true },
  })
  if (!step) {
    throw new LessonStructureError('NOT_FOUND', `Lesson step ${lessonStepId} not found`)
  }

  return prisma.$transaction(async (tx) => {
    const { count: nulledProgressCount } = await tx.studentProgress.updateMany({
      where: { currentStepId: lessonStepId },
      data: { currentStepId: null },
    })

    await tx.lessonStep.delete({ where: { id: lessonStepId } })

    await tx.lessonStep.updateMany({
      where: { lessonId: step.lessonId, sequenceOrder: { gt: step.sequenceOrder } },
      data: { sequenceOrder: { decrement: 1 } },
    })

    await tx.lesson.update({
      where: { id: step.lessonId },
      data: { structureEditedAt: new Date() },
    })

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_STEP_REMOVED,
        entityType: 'LessonStep',
        entityId: step.id,
        metadataJson: {
          lessonId: step.lessonId,
          stepType: step.stepType,
          title: step.title,
          sequenceOrder: step.sequenceOrder,
          nulledProgressCount,
        },
      },
    })

    return { nulledProgressCount }
  })
}

/**
 * Reorder a lesson's steps to exactly `orderedStepIds`. Rejects unless the
 * set of ids matches the lesson's current steps exactly (no adds/drops/
 * dupes hiding in a reorder call). Never touches resume pointers — a
 * pointer is an FK to a stable row id, and reordering only changes
 * `sequenceOrder`, never the row's identity/content, so it still resolves
 * to the same step it always did.
 */
export async function reorderLessonSteps(
  actorUserId: string,
  lessonId: string,
  orderedStepIds: string[]
): Promise<void> {
  const current = await prisma.lessonStep.findMany({
    where: { lessonId },
    orderBy: { sequenceOrder: 'asc' },
    select: { id: true, sequenceOrder: true },
  })

  const currentIds = new Set(current.map((s) => s.id))
  const orderedSet = new Set(orderedStepIds)
  const isExactMatch =
    orderedStepIds.length === current.length &&
    orderedStepIds.every((id) => currentIds.has(id)) &&
    orderedSet.size === orderedStepIds.length

  if (!isExactMatch) {
    throw new LessonStructureError(
      'INVALID_ORDER',
      'orderedStepIds must contain exactly the lesson\'s current steps, no more, no fewer'
    )
  }

  await prisma.$transaction(async (tx) => {
    const before = current.map((s) => ({ id: s.id, sequenceOrder: s.sequenceOrder }))
    for (const [index, id] of orderedStepIds.entries()) {
      await tx.lessonStep.update({ where: { id }, data: { sequenceOrder: index + 1 } })
    }
    await tx.lesson.update({ where: { id: lessonId }, data: { structureEditedAt: new Date() } })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_STEPS_REORDERED,
        entityType: 'Lesson',
        entityId: lessonId,
        metadataJson: {
          before,
          after: orderedStepIds.map((id, index) => ({ id, sequenceOrder: index + 1 })),
        },
      },
    })
  })
}
