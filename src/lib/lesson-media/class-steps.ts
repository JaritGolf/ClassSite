/**
 * Readers for the per-class lesson authoring layer (ADR 0023).
 *
 * Sibling to getClassStepOverrideMap in ./index.ts — that one answers "what
 * did this class change about a BUILT-IN step", these answer "what did this
 * class ADD" and "how did this class ARRANGE it". All three feed the single
 * pure resolver, resolveClassLessonSteps.
 *
 * Every function returns the empty/no-opinion value for a null classId, so a
 * student with no active enrollment (and every teacher preview of the pristine
 * lesson) takes exactly the pre-ADR-0023 path with no branching at the call
 * site.
 */

import { prisma } from '@/lib/db'
import { toClassStepViewId, type ClassStepInput } from '@/lib/lesson-content'

/**
 * This class's own modules for a lesson, in createdAt ASC — the deterministic
 * tie-break reconcileClassOutline depends on when several modules share an
 * anchor.
 *
 * Ids are prefixed HERE, at the DB edge, exactly once. Everything downstream
 * (the resolver, the renderer, the progress route) works in the prefixed id
 * space, so there is no point where a raw ClassLessonStep id could be mistaken
 * for a LessonStep id.
 */
export async function getClassLessonSteps(
  classId: string | null,
  lessonId: string
): Promise<ClassStepInput[]> {
  if (!classId) return []
  const rows = await prisma.classLessonStep.findMany({
    where: { classId, lessonId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      stepType: true,
      title: true,
      content: true,
      required: true,
      visible: true,
      anchorLessonStepId: true,
      anchorPosition: true,
    },
  })
  return rows.map((row) => ({
    id: toClassStepViewId(row.id),
    stepType: row.stepType,
    title: row.title,
    content: row.content,
    required: row.required,
    visible: row.visible,
    anchorLessonStepId: row.anchorLessonStepId,
    anchorPosition: row.anchorPosition,
  }))
}

/**
 * This class's saved module order, or null when it has expressed no opinion.
 *
 * `orderedItemIds` is a Json column with no DB-level shape guarantee, so a row
 * that somehow holds a non-array (or an array with non-string entries) is
 * treated as NO OPINION rather than trusted or thrown on — the same
 * degrade-don't-break posture parseStepContent takes for malformed step
 * content. Reconciliation then rebuilds the pristine order, which is the safe
 * direction: a teacher loses an arrangement, never a lesson.
 */
export async function getClassLessonOutline(
  classId: string | null,
  lessonId: string
): Promise<string[] | null> {
  if (!classId) return null
  const row = await prisma.classLessonOutline.findUnique({
    where: { classId_lessonId: { classId, lessonId } },
    select: { orderedItemIds: true },
  })
  if (!row) return null
  const raw = row.orderedItemIds
  if (!Array.isArray(raw)) return null
  return raw.every((id): id is string => typeof id === 'string') ? raw : null
}

/** Both halves of a class's authoring layer in one round trip. */
export async function getClassLessonLayer(
  classId: string | null,
  lessonId: string
): Promise<{ classSteps: ClassStepInput[]; savedOrder: string[] | null }> {
  const [classSteps, savedOrder] = await Promise.all([
    getClassLessonSteps(classId, lessonId),
    getClassLessonOutline(classId, lessonId),
  ])
  return { classSteps, savedOrder }
}
