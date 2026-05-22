import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { assertClassOwnedByTeacher, RosterError } from '@/lib/teacher-roster'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { classId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    await assertClassOwnedByTeacher(session.user.userId, params.classId)

    const body = await req.json() as { notes: string }

    await prisma.$transaction([
      prisma.class.update({
        where: { id: params.classId },
        data: { subPrepNotes: body.notes },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: session.user.userId,
          action: 'SUB_NOTES_SET',
          entityType: 'Class',
          entityId: params.classId,
          metadataJson: { classId: params.classId },
        },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof RosterError) {
      return NextResponse.json({ error: e.code }, { status: e.code === 'NOT_FOUND' ? 404 : 403 })
    }
    throw e
  }
}
