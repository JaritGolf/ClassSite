/**
 * POST /api/mission/progress
 *
 * Persists the student's position inside a mission's Guided Training so they
 * can resume where they left off across devices/sessions (spec §21.3 "clear
 * button to continue from last saved step"). Writes the long-dormant
 * StudentProgress.currentStepId FK.
 *
 * Body: { benchmarkCode: string, stepId: string | null }
 * Access: STUDENT only; writes only the student's own row. Display/resume
 * convenience only — no grading or mastery impact.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

const BodySchema = z.object({
  benchmarkCode: z.string().min(1).max(32),
  stepId: z.string().cuid().nullable().or(z.string().min(1).max(64).nullable()),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
  }

  const benchmark = await prisma.benchmark.findUnique({
    where: { code: parsed.data.benchmarkCode },
    select: { id: true },
  })
  if (!benchmark) {
    return NextResponse.json({ error: 'Benchmark not found' }, { status: 404 })
  }

  // Validate the step belongs to one of this benchmark's lessons (guards the FK
  // and prevents pointing progress at another benchmark's content).
  let currentStepId: string | null = null
  if (parsed.data.stepId) {
    const step = await prisma.lessonStep.findFirst({
      where: { id: parsed.data.stepId, lesson: { benchmarkId: benchmark.id } },
      select: { id: true },
    })
    if (!step) {
      return NextResponse.json({ error: 'Step not found for this benchmark' }, { status: 404 })
    }
    currentStepId = step.id
  }

  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: student.id, benchmarkId: benchmark.id } },
    create: {
      studentId: student.id,
      benchmarkId: benchmark.id,
      status: 'IN_PROGRESS',
      currentStepId,
    },
    update: { currentStepId },
  })

  return NextResponse.json({ ok: true })
}
