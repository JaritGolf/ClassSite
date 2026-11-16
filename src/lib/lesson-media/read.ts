/**
 * Lesson media — READ-ONLY helpers.
 *
 * Kept apart from ./index (which holds the teacher's write operations) on
 * purpose: the student pages import this file, and a guard test asserts that
 * nothing a student page can reach performs a database write.
 */

import { prisma } from '@/lib/db'
import type { StepOverride } from '@/lib/lesson-content'

/**
 * Class-override map (stepId → {visible, overrideTitle, overrideContent})
 * for a set of steps — feeds resolveEffectiveSteps. Empty map when classId
 * is null.
 */
export async function getClassStepOverrideMap(
  classId: string | null,
  lessonStepIds: string[]
): Promise<Map<string, StepOverride>> {
  if (!classId || lessonStepIds.length === 0) return new Map()
  const rows = await prisma.classLessonStepVisibility.findMany({
    where: { classId, lessonStepId: { in: lessonStepIds } },
    select: { lessonStepId: true, visible: true, overrideTitle: true, overrideContent: true },
  })
  return new Map(
    rows.map((r) => [
      r.lessonStepId,
      { visible: r.visible, overrideTitle: r.overrideTitle, overrideContent: r.overrideContent },
    ])
  )
}

export { getClassLessonLayer, getClassLessonSteps, getClassLessonOutline } from './class-steps'
