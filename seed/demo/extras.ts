/**
 * Demo Seed — Extras for the Hero Student
 *
 * Streak and spaced-review state are driven through the real engines
 * (src/lib/streak, src/lib/spaced-retrieval). Badges and accommodations
 * have no award/grant engine to call, so those two blocks are hand-written
 * — flagged inline as deliberate, scoped exceptions.
 */

import { prisma } from '@/lib/db'
import { recordActivity } from '@/lib/streak'
import { submitReview } from '@/lib/spaced-retrieval'

/** Off by default — not part of the core ask. Flip to demo Spanish L1 glosses. */
const ENABLE_L1_DEMO = false

export async function seedExtras(params: {
  heroStudentId: string
  teacherUserId: string
}): Promise<void> {
  const { heroStudentId, teacherUserId } = params

  await seedStreak(heroStudentId)
  await seedDueSpacedReview(heroStudentId)
  await seedBadges(heroStudentId)
  await seedAccommodations(heroStudentId, teacherUserId)

  if (ENABLE_L1_DEMO) {
    await prisma.student.update({ where: { id: heroStudentId }, data: { l1Language: 'es' } })
    await grantAccommodation(heroStudentId, 'ACC-L1-SPANISH', teacherUserId)
  }
}

// ── Streak — real engine, 4 consecutive days ending today ────────────────
//
// recordActivity() advances currentLength relative to whatever
// lastActiveDate is already on file, so replaying the same 4-day range on
// every seed run is NOT idempotent (each run pushes the streak higher).
// Guard by skipping entirely once today's activity has already been
// recorded — re-running the seed within the same calendar day is then a
// true no-op, same as every other step here.

async function seedStreak(heroStudentId: string): Promise<void> {
  const today = new Date()

  const existing = await prisma.streakState.findUnique({
    where: { studentId: heroStudentId },
    select: { lastActiveDate: true },
  })
  if (existing?.lastActiveDate && isSameUtcDay(existing.lastActiveDate, today)) return

  for (let daysAgo = 3; daysAgo >= 0; daysAgo--) {
    const date = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    await recordActivity(heroStudentId, date)
  }
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

// ── Spaced review — real engine, backdated so one item is due now ────────

async function seedDueSpacedReview(heroStudentId: string): Promise<void> {
  const bm1 = await prisma.benchmark.findUnique({
    where: { code: 'SS.7.CG.1.1' },
    select: { id: true },
  })
  if (!bm1) return

  const state = await prisma.spacedReviewState.findUnique({
    where: { studentId_benchmarkId: { studentId: heroStudentId, benchmarkId: bm1.id } },
    select: { dueAt: true },
  })
  // No state yet (benchmark not mastered), or already due — nothing to do.
  if (!state || state.dueAt.getTime() <= Date.now()) return

  const question = await prisma.question.findFirst({
    where: { benchmarkId: bm1.id, approvalStatus: 'APPROVED' },
    select: { id: true },
  })
  if (!question) return

  // `now` is the function's own documented override for tests/seeding — the
  // only synthetic input here. All SM-2 math and the SpacedReviewEvent row
  // are real.
  const backdatedNow = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  await submitReview(heroStudentId, bm1.id, question.id, true, 1, backdatedNow)
}

// ── Badges — deliberate hand-written exception ────────────────────────────
// No badge-award engine exists anywhere in src/ (StudentBadge is only ever
// read, never created). Award the two badges whose criteria the actions
// above actually satisfy, as a seed-only stand-in until a real
// award-evaluation function ships.

async function seedBadges(heroStudentId: string): Promise<void> {
  await awardBadgeIfExists(heroStudentId, 'Citizen-in-Training') // benchmark_mastered count 1
  await awardBadgeIfExists(heroStudentId, 'First Drill') // drill_complete count 1
}

async function awardBadgeIfExists(studentId: string, badgeName: string): Promise<void> {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName }, select: { id: true } })
  if (!badge) return
  await prisma.studentBadge.upsert({
    where: { studentId_badgeId: { studentId, badgeId: badge.id } },
    update: {},
    create: { studentId, badgeId: badge.id },
  })
}

// ── Accommodations — structural data, same sanctioned-exception category as People ──

async function seedAccommodations(heroStudentId: string, teacherUserId: string): Promise<void> {
  // Sentence chunking demos the accommodation flow without changing the hero's
  // whole visual experience. High-contrast is deliberately NOT granted to the
  // hero anymore: it forces the monochrome theme on every demo walkthrough
  // (Appendix-G grants can't be turned off by the student), which hides the
  // product's actual look. Demo high-contrast live via the teacher's
  // AccommodationEditor instead. The update below also unwinds the old grant
  // on already-seeded databases (idempotent repair).
  await grantAccommodation(heroStudentId, 'ACC-CHUNK', teacherUserId)
  await deactivateAccommodation(heroStudentId, 'ACC-HIGH-CONTRAST')

  await prisma.studentUiSettings.upsert({
    where: { studentId: heroStudentId },
    update: { highContrast: false },
    create: { studentId: heroStudentId, highContrast: false },
  })
}

async function deactivateAccommodation(studentId: string, code: string): Promise<void> {
  const accommodation = await prisma.accommodation.findUnique({ where: { code }, select: { id: true } })
  if (!accommodation) return
  await prisma.studentAccommodation.updateMany({
    where: { studentId, accommodationId: accommodation.id },
    data: { active: false },
  })
}

async function grantAccommodation(studentId: string, code: string, grantedBy: string): Promise<void> {
  const accommodation = await prisma.accommodation.findUnique({ where: { code }, select: { id: true } })
  if (!accommodation) return
  await prisma.studentAccommodation.upsert({
    where: { studentId_accommodationId: { studentId, accommodationId: accommodation.id } },
    update: { active: true },
    create: { studentId, accommodationId: accommodation.id, grantedBy, active: true },
  })
}
