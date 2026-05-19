import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toggleSkipNpcs } from '@/lib/narrative'
import { z } from 'zod'

const BodySchema = z.object({ skip: z.boolean() })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'skip (boolean) required' }, { status: 400 })
  }

  await toggleSkipNpcs(student.id, parsed.data.skip)
  return NextResponse.json({ ok: true, skip: parsed.data.skip })
}
