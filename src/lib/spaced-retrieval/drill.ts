/**
 * Daily Republic Drill — Queue Builder
 *
 * Surfaces due spaced-review items for a student each day.
 * Spec reference: Section 15.3
 *
 * Rules:
 *   - Pulls items where due_at <= now, ordered by oldest due first
 *   - Caps at 15 items per day; remainder rolls to next day naturally
 *     (due_at is not modified — overdue items stay due until reviewed)
 *   - Items are interleaved across benchmarks (not grouped by benchmark)
 *   - Each item is an ALTERNATE question from the same benchmark + skill_tag
 *     as the original mastery item — not the original question itself
 *   - Question selection excludes questions seen in previous review events
 *     for this student (best-effort alternate selection)
 *
 * SECURITY: This function returns full question data including options.
 * Options do NOT include isCorrect (safe for client delivery).
 * Answer grading happens in review.ts, server-side only.
 */

import { prisma } from '@/lib/db'
import { seededShuffle } from '@/lib/shuffle'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DrillOption {
  id: string
  optionText: string
}

export interface DrillItem {
  benchmarkId: string
  benchmarkCode: string
  questionId: string
  prompt: string
  itemType: string
  options: DrillOption[]
  dueAt: Date
  repetitionCount: number
  intervalDays: number
}

export const DRILL_CAP = 15

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Build the daily drill queue for a student.
 *
 * @param studentId - The Student.id
 * @param now       - Override for current time (used in tests)
 * @returns Up to 15 DrillItem records, interleaved across benchmarks
 */
export async function getDrillQueue(
  studentId: string,
  now: Date = new Date()
): Promise<DrillItem[]> {
  // 1. Find all due SpacedReviewState rows for this student
  const dueStates = await prisma.spacedReviewState.findMany({
    where: {
      studentId,
      dueAt: { lte: now },
    },
    orderBy: { dueAt: 'asc' }, // oldest due first
    select: {
      benchmarkId: true,
      dueAt: true,
      repetitionCount: true,
      intervalDays: true,
      benchmark: {
        select: { code: true },
      },
    },
  })

  if (dueStates.length === 0) return []

  // 2. Find question IDs already seen by this student in spaced review
  const seenEvents = await prisma.spacedReviewEvent.findMany({
    where: { studentId },
    select: { questionId: true },
  })
  const seenQuestionIds = new Set(seenEvents.map((e) => e.questionId))

  // 2b. Mastery-form question IDs per due benchmark — the drill should serve
  //     ALTERNATE retrieval items, not re-serve the mastery questions themselves.
  const masteryQuestions = await prisma.assessmentQuestion.findMany({
    where: {
      assessment: {
        benchmarkId: { in: dueStates.map((s) => s.benchmarkId) },
        assessmentType: 'MASTERY_CHALLENGE',
      },
    },
    select: { questionId: true, assessment: { select: { benchmarkId: true } } },
  })
  const masteryIdsByBenchmark = new Map<string, Set<string>>()
  for (const mq of masteryQuestions) {
    const bid = mq.assessment.benchmarkId
    if (!bid) continue
    if (!masteryIdsByBenchmark.has(bid)) masteryIdsByBenchmark.set(bid, new Set())
    masteryIdsByBenchmark.get(bid)!.add(mq.questionId)
  }

  // 3. For each due benchmark, pick one alternate question
  const rawItems: Array<DrillItem | null> = await Promise.all(
    dueStates.map(async (state) => {
      const question = await pickAlternateQuestion(
        state.benchmarkId,
        seenQuestionIds,
        masteryIdsByBenchmark.get(state.benchmarkId) ?? new Set(),
        studentId,
        now
      )
      if (!question) return null

      return {
        benchmarkId: state.benchmarkId,
        benchmarkCode: state.benchmark.code,
        questionId: question.id,
        prompt: question.prompt,
        itemType: question.itemType,
        options: question.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
        })),
        dueAt: state.dueAt,
        repetitionCount: state.repetitionCount,
        intervalDays: state.intervalDays,
      }
    })
  )

  // 4. Filter nulls (benchmarks with no alternate question available),
  //    then interleave across benchmarks and cap at 15
  const items = rawItems.filter((item): item is DrillItem => item !== null)

  return interleave(items).slice(0, DRILL_CAP)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Pick one question from a benchmark that the student has not previously
 * reviewed, preferring questions that are neither in prior spaced-review
 * events nor on the benchmark's Mastery Challenge forms (alternate retrieval,
 * not re-serving the mastery items).
 *
 * Falls back progressively (unseen → any approved) so small pools never
 * empty out. Returns null only if the benchmark has no approved questions.
 * The pick is seeded per (student, benchmark, day) so a page refresh serves
 * the same item, but different students/days rotate through the pool.
 */
async function pickAlternateQuestion(
  benchmarkId: string,
  seenQuestionIds: Set<string>,
  masteryQuestionIds: Set<string>,
  studentId: string,
  now: Date
): Promise<{
  id: string
  prompt: string
  itemType: string
  options: Array<{ id: string; optionText: string }>
} | null> {
  // Fetch all approved questions for this benchmark (exclude isCorrect — safe delivery)
  const questions = await prisma.question.findMany({
    where: {
      benchmarkId,
      approvalStatus: 'APPROVED',
    },
    select: {
      id: true,
      prompt: true,
      itemType: true,
      options: {
        select: { id: true, optionText: true },
        // isCorrect: DELIBERATELY OMITTED
        orderBy: { id: 'asc' }, // stable shuffle input (authored order)
      },
    },
  })

  if (questions.length === 0) return null

  // Preference ladder: unseen + non-mastery → unseen → all approved
  const unseen = questions.filter((q) => !seenQuestionIds.has(q.id))
  const unseenAlternates = unseen.filter((q) => !masteryQuestionIds.has(q.id))
  const pool =
    unseenAlternates.length > 0 ? unseenAlternates : unseen.length > 0 ? unseen : questions

  const daySeed = now.toISOString().slice(0, 10)
  const picked = seededShuffle(pool, `${studentId}:${benchmarkId}:${daySeed}`)[0]

  return {
    ...picked,
    // Authored banks list the correct option first — shuffle at serve time.
    options: seededShuffle(picked.options, `${studentId}:${picked.id}`),
  }
}

/**
 * Interleave DrillItems so benchmarks are not grouped together.
 *
 * Round-robin by benchmarkId: collect all unique benchmark IDs, then
 * distribute items one-per-benchmark per pass.
 *
 * This satisfies spec Section 15.3: "presented in interleaved order
 * across benchmarks (do not group by benchmark)."
 */
function interleave(items: DrillItem[]): DrillItem[] {
  // Group by benchmark
  const byBenchmark = new Map<string, DrillItem[]>()
  for (const item of items) {
    if (!byBenchmark.has(item.benchmarkId)) {
      byBenchmark.set(item.benchmarkId, [])
    }
    byBenchmark.get(item.benchmarkId)!.push(item)
  }

  const result: DrillItem[] = []
  const queues = Array.from(byBenchmark.values())

  let anyLeft = true
  while (anyLeft) {
    anyLeft = false
    for (const queue of queues) {
      if (queue.length > 0) {
        result.push(queue.shift()!)
        if (queue.length > 0) anyLeft = true
      }
    }
  }

  return result
}
