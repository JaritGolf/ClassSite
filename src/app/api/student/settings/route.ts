import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

async function resolveStudent(userId: string) {
  return prisma.student.findUnique({ where: { userId }, select: { id: true } })
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

  return NextResponse.json(settings)
}

const PatchSchema = z.object({
  pausePointMinutes: z.number().int().min(5).max(120).optional(),
  reduceMotion: z.boolean().optional(),
  skipAllNpcs: z.boolean().optional(),
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

  const settings = await prisma.studentUiSettings.upsert({
    where: { studentId: student.id },
    update: parsed.data,
    create: { studentId: student.id, ...parsed.data },
  })

  return NextResponse.json(settings)
}
