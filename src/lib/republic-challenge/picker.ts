/**
 * Republic Challenge — Question Selection
 *
 * Six DB-touching pickers, one per review mode. Each returns an ordered list
 * of Question IDs; the picked questions are wired into an ephemeral Assessment
 * by `session.ts`.
 *
 * Phase 11 / spec §30.2.
 */

import { prisma } from '@/lib/db'
import { allocateByBlueprint } from './blueprint'
import { getDecayingBenchmarks } from '@/lib/spaced-retrieval/decay'

/**
 * Common select used to pull candidate question IDs.
 * `active: true` and `approvalStatus: 'APPROVED'` are enforced everywhere.
 */
const APPROVED_FILTER = {
  active: true,
  approvalStatus: 'APPROVED' as const,
}

// ── Deterministic shuffle (seedable) ──────────────────────────────────────────

/**
 * Fisher-Yates shuffle. Mutates the passed array and returns it.
 *
 * Default RNG is `Math.random`. Tests may inject a deterministic RNG.
 */
function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

// ── Quick Review ──────────────────────────────────────────────────────────────

/**
 * Quick Review (spec §30.2 row "Quick Review"): short practice based on weak
 * skills. Pulls one question per decaying benchmark (most recent first). If
 * the student has no decaying benchmarks, falls back to any benchmark where
 * the student has missed a question recently. Falls back further to all
 * approved questions.
 */
export async function pickQuickReview(
  studentId: string,
  length: number = 5
): Promise<string[]> {
  const picked: string[] = []
  const usedBenchmarkIds = new Set<string>()

  // 1. Decaying benchmarks first
  const decaying = await getDecayingBenchmarks(studentId)
  for (const d of decaying) {
    if (picked.length >= length) break
    if (usedBenchmarkIds.has(d.benchmarkId)) continue
    const q = await prisma.question.findFirst({
      where: {
        benchmarkId: d.benchmarkId,
        ...APPROVED_FILTER,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    if (q) {
      picked.push(q.id)
      usedBenchmarkIds.add(d.benchmarkId)
    }
  }

  // 2. Top-up from recently missed questions (across all benchmarks)
  if (picked.length < length) {
    const recentMisses = await prisma.attemptResponse.findMany({
      where: {
        isCorrect: false,
        attempt: { studentId, voided: false },
      },
      select: { questionId: true, question: { select: { benchmarkId: true } } },
      orderBy: { attempt: { startedAt: 'desc' } },
      take: length * 4,
    })
    for (const r of recentMisses) {
      if (picked.length >= length) break
      const benchmarkId = r.question?.benchmarkId
      if (!benchmarkId || usedBenchmarkIds.has(benchmarkId)) continue
      if (picked.includes(r.questionId)) continue
      picked.push(r.questionId)
      usedBenchmarkIds.add(benchmarkId)
    }
  }

  // 3. Final top-up: any approved question
  if (picked.length < length) {
    const filler = await prisma.question.findMany({
      where: APPROVED_FILTER,
      select: { id: true, benchmarkId: true },
      take: length * 4,
      orderBy: { id: 'asc' },
    })
    for (const q of filler) {
      if (picked.length >= length) break
      if (picked.includes(q.id)) continue
      if (usedBenchmarkIds.has(q.benchmarkId)) continue
      picked.push(q.id)
      usedBenchmarkIds.add(q.benchmarkId)
    }
  }

  return picked
}

// ── Category Challenge ────────────────────────────────────────────────────────

/**
 * Category Challenge: questions tagged to a single ReportingCategory.
 *
 * @param reportingCategoryId  The ReportingCategory.id.
 */
export async function pickCategoryChallenge(
  studentId: string,
  reportingCategoryId: string,
  length: number = 10
): Promise<string[]> {
  const candidates = await prisma.question.findMany({
    where: {
      reportingCategoryId,
      ...APPROVED_FILTER,
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  if (candidates.length === 0) return []

  const ids = candidates.map((c) => c.id)
  shuffle(ids)
  return ids.slice(0, length)
}

// ── Mixed Mission (blueprint-weighted) ────────────────────────────────────────

/**
 * Mixed Mission: blueprint-weighted across all reporting categories.
 *
 * Uses `allocateByBlueprint` to size each category's slice, then samples
 * approved questions within each category. If a category has fewer
 * approved questions than its allotment, remaining slots are redistributed
 * to other categories proportional to their weights.
 */
export async function pickMixedMission(
  studentId: string,
  length: number = 10
): Promise<string[]> {
  return pickBlueprintWeighted(studentId, length, { levelMin: 1 })
}

/**
 * Internal helper used by Mixed Mission, Endurance Trial, and Final Trial.
 *
 * Filters by reading-load level (Final Trial requires levelMin = 2).
 */
async function pickBlueprintWeighted(
  _studentId: string,
  length: number,
  opts: { levelMin: number }
): Promise<string[]> {
  // 1. Load reporting categories with their canonical names.
  const categories = await prisma.reportingCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // 2. Build a weight map keyed by name (matches REPORTING_CATEGORY_WEIGHTS).
  //    We need to map our canonical-name keys to ReportingCategory.id; do that
  //    via case-insensitive substring matching.
  const { REPORTING_CATEGORY_WEIGHTS } = await import('@/lib/eoc-analytics/readiness')

  // Allocation by canonical name
  const allocation = allocateByBlueprint(length, REPORTING_CATEGORY_WEIGHTS)

  // Map canonical name → ReportingCategory.id (best-effort substring match)
  const nameToCategoryId = new Map<string, string>()
  for (const cat of categories) {
    for (const canonical of Object.keys(REPORTING_CATEGORY_WEIGHTS)) {
      if (cat.name.toLowerCase().includes(canonical.toLowerCase())) {
        nameToCategoryId.set(canonical, cat.id)
        break
      }
    }
  }

  // 3. Sample per category
  const picked: string[] = []
  const shortfalls: Array<{ canonical: string; missing: number }> = []

  for (const { name: canonical, count } of allocation.ordered) {
    if (count <= 0) continue
    const categoryId = nameToCategoryId.get(canonical)
    if (!categoryId) {
      shortfalls.push({ canonical, missing: count })
      continue
    }
    const candidates = await prisma.question.findMany({
      where: {
        reportingCategoryId: categoryId,
        readingLoadLevel: { gte: opts.levelMin },
        ...APPROVED_FILTER,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    const ids = candidates.map((c) => c.id)
    shuffle(ids)
    const take = Math.min(count, ids.length)
    picked.push(...ids.slice(0, take))
    if (take < count) shortfalls.push({ canonical, missing: count - take })
  }

  // 4. Backfill shortfalls from any approved question pool (best-effort).
  const totalMissing = shortfalls.reduce((a, s) => a + s.missing, 0)
  if (totalMissing > 0) {
    const extras = await prisma.question.findMany({
      where: {
        id: { notIn: picked },
        readingLoadLevel: { gte: opts.levelMin },
        ...APPROVED_FILTER,
      },
      select: { id: true },
      take: totalMissing * 2,
      orderBy: { id: 'asc' },
    })
    const extraIds = extras.map((e) => e.id)
    shuffle(extraIds)
    picked.push(...extraIds.slice(0, totalMissing))
  }

  return picked
}

/**
 * How many of the four EOC reporting categories can currently supply questions
 * at the given reading-load floor.
 *
 * Exists because the backfill above is SILENT. When a category has no pool its
 * share is quietly redrawn from whatever else is approved, so a "full EOC
 * simulation" can be built entirely from one category and still return a
 * confident-looking 50-item paper. That is the worst kind of wrong: the student
 * scores well, the teacher reads it as EOC readiness, and neither has any signal
 * that three quarters of the blueprint was never on the test.
 *
 * Backfilling is still the right behaviour — 422ing a student out of their
 * year-end simulation would be worse. What was missing is the label. Callers use
 * this to say plainly what the simulation currently covers.
 */
export async function getBlueprintCoverage(
  levelMin: number = 2
): Promise<{ covered: number; total: number }> {
  const categories = await prisma.reportingCategory.findMany({ select: { id: true } })
  const withPool = await prisma.question.groupBy({
    by: ['reportingCategoryId'],
    where: { readingLoadLevel: { gte: levelMin }, ...APPROVED_FILTER },
    _count: { _all: true },
  })
  const covered = new Set(withPool.map((r) => r.reportingCategoryId))
  return {
    covered: categories.filter((c) => covered.has(c.id)).length,
    total: categories.length,
  }
}

// ── Mistake Replay ────────────────────────────────────────────────────────────

/**
 * Mistake Replay: questions the student has previously missed.
 *
 * Aggregates AttemptResponse where isCorrect=false, then picks distinct
 * question IDs ordered by most-recent-miss. Falls back to alternates within
 * the same benchmark + misconception when the personal miss pool is exhausted.
 */
export async function pickMistakeReplay(
  studentId: string,
  length: number = 10
): Promise<string[]> {
  const misses = await prisma.attemptResponse.findMany({
    where: {
      isCorrect: false,
      attempt: { studentId, voided: false },
    },
    select: {
      questionId: true,
      attempt: { select: { startedAt: true } },
    },
    orderBy: { attempt: { startedAt: 'desc' } },
    take: length * 4,
  })

  // Deduplicate, preserving first occurrence (most recent miss).
  const seen = new Set<string>()
  const picked: string[] = []
  for (const m of misses) {
    if (picked.length >= length) break
    if (seen.has(m.questionId)) continue
    seen.add(m.questionId)
    picked.push(m.questionId)
  }

  // Backfill from same benchmark+misconception alternates if pool too small.
  if (picked.length < length && picked.length > 0) {
    const referenceQs = await prisma.question.findMany({
      where: { id: { in: picked } },
      select: { id: true, benchmarkId: true, misconceptionId: true },
    })
    const benchmarkIds = Array.from(new Set(referenceQs.map((q) => q.benchmarkId)))
    const alternates = await prisma.question.findMany({
      where: {
        benchmarkId: { in: benchmarkIds },
        id: { notIn: picked },
        ...APPROVED_FILTER,
      },
      select: { id: true },
      take: (length - picked.length) * 2,
    })
    const altIds = alternates.map((a) => a.id)
    shuffle(altIds)
    for (const id of altIds) {
      if (picked.length >= length) break
      picked.push(id)
    }
  }

  return picked
}

// ── Source Sprint ─────────────────────────────────────────────────────────────

/**
 * Source Sprint: practice excerpt / chart / map / flowchart items.
 *
 * @param stimulusType  Must match the Stimulus.stimulusType enum
 *                      (EXCERPT, CHART, MAP, etc).
 */
export async function pickSourceSprint(
  studentId: string,
  stimulusType: string,
  length: number = 10
): Promise<string[]> {
  // Validate stimulusType against the StimulusType enum runtime-side.
  const candidates = await prisma.question.findMany({
    where: {
      stimulus: {
        is: {
          stimulusType: stimulusType as any,
          approvalStatus: 'APPROVED',
        },
      },
      ...APPROVED_FILTER,
    },
    select: { id: true },
  })
  const ids = candidates.map((c) => c.id)
  shuffle(ids)
  return ids.slice(0, length)
}

// ── Endurance Trial ───────────────────────────────────────────────────────────

/**
 * Endurance Trial: stamina ladder + blueprint-weighted mix.
 *
 * Length is decided by the caller (typically via `resolveSessionLength`).
 */
export async function pickEnduranceTrial(
  studentId: string,
  length: number
): Promise<string[]> {
  return pickBlueprintWeighted(studentId, length, { levelMin: 1 })
}

// ── Final Republic Trial ──────────────────────────────────────────────────────

/**
 * Final Republic Trial: full blueprint-weighted simulation, level 2 and 3
 * stimuli only (spec §19.3).
 *
 * Level filter applies to the question's `readingLoadLevel`; we also exclude
 * questions whose attached stimulus is level 1.
 */
export async function pickFinalRepublicTrial(
  studentId: string,
  length: number
): Promise<string[]> {
  return pickBlueprintWeighted(studentId, length, { levelMin: 2 })
}
