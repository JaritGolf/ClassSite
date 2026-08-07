/**
 * POST /api/lessons/media/upload
 *
 * Accepts a multipart image upload (teacher/admin — either role may then
 * reference the returned path from a class-scope override or a global edit
 * respectively; this route itself doesn't need a scope). Stores the bytes
 * in Postgres (UploadedLessonImage, not local disk — see the model's doc
 * comment for why) and returns `{path, width, height}` for the caller to
 * plug into ImageSchema's `asset`/`width`/`height` fields on a subsequent
 * content-edit call. This route does NOT write to any LessonStep or
 * override — upload and content-edit are deliberately separate steps.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { prisma } from '@/lib/db'
import { detectImageFormat, readImageDimensions, MIME_BY_FORMAT } from '@/lib/media-upload/format'

const MAX_BYTES = 4 * 1024 * 1024 // 4MB

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  // This route sits under /api/lessons/, which src/middleware.ts's matcher does
  // not cover — so without this call a substitute could upload images. Every
  // mutating API route has to assert this itself.
  try {
    await assertNotSubMode()
  } catch (e) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    throw e
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }
  // The UI gates its submit button on a rights checkbox; enforce it server-side
  // too, so the confirmation is a real record rather than a client-side nicety.
  if (form.get('rightsConfirmed') !== 'true') {
    return NextResponse.json({ error: 'RIGHTS_NOT_CONFIRMED' }, { status: 422 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 422 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  // Never trust the client-reported MIME type — sniff the real bytes.
  const format = detectImageFormat(buf)
  if (!format) {
    return NextResponse.json({ error: 'UNSUPPORTED_FORMAT' }, { status: 422 })
  }
  const dimensions = readImageDimensions(buf, format)

  const row = await prisma.uploadedLessonImage.create({
    data: {
      mimeType: MIME_BY_FORMAT[format],
      byteSize: buf.byteLength,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      data: buf,
      uploadedBy: session.user.userId,
    },
    select: { id: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.userId,
      action: 'LESSON_MEDIA_UPLOADED',
      entityType: 'UploadedLessonImage',
      entityId: row.id,
      metadataJson: {
        source: 'upload',
        mimeType: MIME_BY_FORMAT[format],
        byteSize: buf.byteLength,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        rightsConfirmed: true,
      },
    },
  })

  return NextResponse.json({
    path: `/media/uploads/${row.id}`,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  })
}
