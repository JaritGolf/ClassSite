/**
 * Lesson banks registry + seeder entry point (ADR 0013).
 *
 * Banks listed here are completed-unit content and seed under the owner's
 * approval directive (seed/approval_mode.ts). Future units append a bank.
 */

import type { PrismaClient } from '@prisma/client'
import { CONTENT_APPROVAL } from '../approval_mode'
import { seedLessonDefs, type LessonSeedDef } from './_seeder'
import { UNIT1_LESSONS } from './unit1'
import { UNIT1_INTERIM_LESSONS } from './unit1_interim'

export interface LessonBank {
  unitId: string
  lessons: LessonSeedDef[]
}

export const ALL_LESSON_BANKS: LessonBank[] = [
  { unitId: 'unit-1', lessons: UNIT1_LESSONS },
  // ADR 0017: interim lessons for the repurposed official 1.1/1.2 rows —
  // full content build (incl. media pass) tracked in the CLAUDE.md backlog.
  { unitId: 'unit-1', lessons: UNIT1_INTERIM_LESSONS },
]

export async function seedLessons(prisma: PrismaClient): Promise<void> {
  let count = 0
  for (const bank of ALL_LESSON_BANKS) {
    count += await seedLessonDefs(prisma, bank.lessons, CONTENT_APPROVAL)
  }
  console.log(
    `  ✓ Lessons seeded (${count} lessons, ${CONTENT_APPROVAL.approvalStatus} per ADR 0013)`
  )
}
