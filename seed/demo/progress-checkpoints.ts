/**
 * Demo data — nine-week progress checkpoints.
 *
 * Gives the demo teacher a plan for the demo class so the checkpoint UI has
 * something to show on the student dashboard, the mission map, the teacher
 * dashboard, and the parent summary.
 *
 * Targets are drawn only from missions that are actually completable today
 * (an APPROVED Mastery Challenge in an active unit — currently SS.7.CG.1.1-1.7
 * plus 1.10, eight in total). That is why Quarter 3 gets a single level and
 * Quarter 4 is left unset: there is not yet enough authored content to place a
 * full ladder in the back half of the year. As Phase 15 content waves land, those
 * quarters can be filled in from the teacher UI with no code change.
 *
 * The Q1 ladder is deliberately placed at missions 1-4 so the six demo students
 * spread across Levels 0-2 rather than all landing on the same value.
 *
 * Idempotent: keyed on (teacherId, schoolYear) for the plan and
 * (planId, checkpointNumber) for each checkpoint.
 */

import { prisma } from '@/lib/db'

/**
 * Checkpoint dates for the demo classroom. Chosen to look like a real Florida
 * nine-week calendar for the 2026-2027 school year.
 */
const DEMO_CHECKPOINTS: { checkpointNumber: number; endsOn: string; targets: [number, string][] }[] =
  [
    {
      checkpointNumber: 1,
      endsOn: '2026-10-16',
      targets: [
        [1, 'SS.7.CG.1.1'],
        [2, 'SS.7.CG.1.2'],
        [3, 'SS.7.CG.1.3'],
        [4, 'SS.7.CG.1.4'],
      ],
    },
    {
      checkpointNumber: 2,
      endsOn: '2026-12-18',
      targets: [
        [1, 'SS.7.CG.1.5'],
        [2, 'SS.7.CG.1.6'],
        [3, 'SS.7.CG.1.7'],
      ],
    },
    {
      // Only one level: SS.7.CG.1.10 is the last completable mission today.
      checkpointNumber: 3,
      endsOn: '2027-03-12',
      targets: [[1, 'SS.7.CG.1.10']],
    },
    // Quarter 4 intentionally unset — no completable content remains to target.
  ]

export async function seedDemoProgressCheckpoints(classId: string): Promise<string> {
  const klass = await prisma.class.findUniqueOrThrow({
    where: { id: classId },
    select: { teacherId: true, schoolYear: true },
  })

  const benchmarks = await prisma.benchmark.findMany({
    where: { code: { startsWith: 'SS.7.CG.' } },
    select: { id: true, code: true },
  })
  const idByCode = new Map(benchmarks.map((b) => [b.code, b.id]))

  const plan = await prisma.progressPlan.upsert({
    where: {
      teacherId_schoolYear: { teacherId: klass.teacherId, schoolYear: klass.schoolYear },
    },
    create: { teacherId: klass.teacherId, schoolYear: klass.schoolYear },
    update: {},
    select: { id: true },
  })

  let levelCount = 0

  for (const cp of DEMO_CHECKPOINTS) {
    const checkpoint = await prisma.progressCheckpoint.upsert({
      where: {
        planId_checkpointNumber: { planId: plan.id, checkpointNumber: cp.checkpointNumber },
      },
      create: {
        planId: plan.id,
        checkpointNumber: cp.checkpointNumber,
        endsOn: new Date(`${cp.endsOn}T00:00:00.000Z`),
      },
      update: { endsOn: new Date(`${cp.endsOn}T00:00:00.000Z`) },
      select: { id: true },
    })

    // Replace targets wholesale so re-seeding propagates edits to this file.
    await prisma.progressCheckpointTarget.deleteMany({
      where: { checkpointId: checkpoint.id },
    })

    for (const [level, code] of cp.targets) {
      const benchmarkId = idByCode.get(code)
      if (!benchmarkId) {
        throw new Error(`Demo checkpoint target ${code} not found — run npm run db:seed first.`)
      }
      await prisma.progressCheckpointTarget.create({
        data: { checkpointId: checkpoint.id, level, benchmarkId },
      })
      levelCount++
    }
  }

  return `plan for ${klass.schoolYear}: ${DEMO_CHECKPOINTS.length} checkpoints, ${levelCount} levels set (Quarter 4 left unset — no completable content yet)`
}
