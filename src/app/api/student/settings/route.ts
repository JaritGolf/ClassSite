import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

async function resolveStudent(userId: string) {
  return prisma.student.findUnique({ where: { userId }, select: { id: true, l1Language: true } })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await resolveStudent(session.user.userId)
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const settings = await prisma.studentUiSettings.upsert({
    where: { studentId: student.id },
    update: {},
    create: { studentId: student.id },
  })

  // l1Language lives on Student, not StudentUiSettings — surface it alongside.
  return NextResponse.json({ ...settings, l1Language: student.l1Language })
}

const PatchSchema = z.object({
  pausePointMinutes: z.number().int().min(5).max(120).optional(),
  reduceMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  largeText: z.boolean().optional(),
  skipAllNpcs: z.boolean().optional(),
  // L1 gloss language: 'es' | 'ht' to set, null to clear. (Stored on Student.)
  l1Language: z.enum(['es', 'ht']).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await resolveStudent(session.user.userId)
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { l1Language, ...uiData } = parsed.data

  const settings = await prisma.studentUiSettings.upsert({
    where: { studentId: student.id },
    update: uiData,
    create: { studentId: student.id, ...uiData },
  })

  // l1Language is on the Student model; only touch it when provided.
  let resolvedL1 = student.l1Language
  if (l1Language !== undefined) {
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { l1Language },
      select: { l1Language: true },
    })
    resolvedL1 = updated.l1Language
  }

  return NextResponse.json({ ...settings, l1Language: resolvedL1 })
}
