/**
 * Question-bank registry (Phase 15 / ADR 0013).
 *
 * One entry per QuestionSeedDef-style unit bank. Consumed by:
 *   - tests/unit/seed/question-bank-shape.test.ts (pure §13.2/§7.4 validation)
 *   - tests/integration/audit15/01-course-expansion.test.ts (DB validation)
 * New units append an entry here and are picked up by both with zero test edits.
 *
 * Unit 1 is a special case: its original 15/benchmark predate the QuestionSeedDef
 * format (seed/sample_questions_unit_1.ts), so Unit 1 is validated at the DB
 * level via UNIT1_COMPLETE_BENCHMARKS (combined 30/benchmark distributions) in
 * the audit-15 harness rather than through this registry.
 */

import type { PrismaClient } from '@prisma/client'
import type { QuestionSeedDef } from './_seeder'
import {
  UNIT2_QUESTIONS_BY_BENCHMARK,
  UNIT2_COMPLETE_BENCHMARKS,
  seedUnit2Questions,
} from './unit2'

export interface QuestionBank {
  unitId: string
  questionsByBenchmark: Record<string, QuestionSeedDef[]>
  /** Benchmarks whose full 30-question §13.2 bank is authored. */
  completeBenchmarks: string[]
  seed: (prisma: PrismaClient) => Promise<void>
}

export const ALL_QUESTION_BANKS: QuestionBank[] = [
  {
    unitId: 'unit-2',
    questionsByBenchmark: UNIT2_QUESTIONS_BY_BENCHMARK,
    completeBenchmarks: UNIT2_COMPLETE_BENCHMARKS,
    seed: seedUnit2Questions,
  },
]
