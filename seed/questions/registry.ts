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
import type { QuestionCategory, QuestionSeedDef } from './_seeder'
import {
  UNIT2_QUESTIONS_BY_BENCHMARK,
  UNIT2_COMPLETE_BENCHMARKS,
  seedUnit2Questions,
} from './unit2'
import { UNIT1_BACKFILL_BY_BENCHMARK } from './unit1_backfill'
import {
  UNIT1_INTERIM_BY_BENCHMARK,
  UNIT1_INTERIM_BENCHMARKS,
  seedUnit1Interim,
} from './unit1_interim'

export interface QuestionBank {
  unitId: string
  questionsByBenchmark: Record<string, QuestionSeedDef[]>
  /** Benchmarks whose full 30-question §13.2 bank is authored. */
  completeBenchmarks: string[]
  seed: (prisma: PrismaClient) => Promise<void>
}

export const ALL_QUESTION_BANKS: QuestionBank[] = [
  {
    // ADR 0017: interim banks for the repurposed official 1.1/1.2 rows —
    // authored in the QuestionSeedDef format, so they validate through the
    // registry like any unit bank. Full content build tracked in the backlog.
    unitId: 'unit-1',
    questionsByBenchmark: UNIT1_INTERIM_BY_BENCHMARK,
    completeBenchmarks: UNIT1_INTERIM_BENCHMARKS,
    seed: seedUnit1Interim,
  },
  {
    unitId: 'unit-2',
    questionsByBenchmark: UNIT2_QUESTIONS_BY_BENCHMARK,
    completeBenchmarks: UNIT2_COMPLETE_BENCHMARKS,
    seed: seedUnit2Questions,
  },
]

/**
 * externalKey → §13.2 authoring category, for every authored QuestionSeedDef
 * (registry banks + the Unit 1 backfill, which predates the registry format).
 *
 * The category is deliberately NOT persisted to the DB (see _seeder.ts) — the
 * assessments seeder uses this map to pick genuinely vocabulary-tagged items
 * for the Word Builder (VOCAB_CHECK) instead of a complexity heuristic.
 * Unit 1's original 15/benchmark carry no category and are simply absent.
 */
export function categoryByExternalKey(): Map<string, QuestionCategory> {
  const map = new Map<string, QuestionCategory>()
  const allDefLists: QuestionSeedDef[][] = [
    ...ALL_QUESTION_BANKS.flatMap((bank) => Object.values(bank.questionsByBenchmark)),
    ...Object.values(UNIT1_BACKFILL_BY_BENCHMARK),
  ]
  for (const defs of allDefLists) {
    for (const def of defs) map.set(def.externalKey, def.category)
  }
  return map
}
