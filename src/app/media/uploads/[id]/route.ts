/**
 * GET /media/uploads/[id]
 *
 * Streams a teacher/admin-uploaded lesson image out of Postgres
 * (UploadedLessonImage.data) — deliberately at `/media/uploads/<id>`, not
 * under `/api/`, so the public URL matches ImageSchema.asset's existing
 * `/media/...` pattern with zero schema changes (a cuid is lowercase
 * alphanumeric, already valid per that regex).
 *
 * No auth check: this is a public-facing media URL exactly like every other
 * asset under public/media/ — the same as an ordinary static file. Access
 * control lives at the content-edit layer (only a teacher/admin can ever
 * reference an uploaded image's path in a LessonStep/override), not here.
 *
 * Rows are immutable once created (content-addressed by id) — safe to cache
 * the response forever.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await prisma.uploadedLessonImage.findUnique({
    where: { id: params.id },
    select: { data: true, mimeType: true },
  })
  if (!row) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return new NextResponse(Buffer.from(row.data), {
    headers: {
      'Content-Type': row.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
