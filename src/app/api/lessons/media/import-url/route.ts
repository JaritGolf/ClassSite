/**
 * POST /api/lessons/media/import-url
 *
 * A teacher pastes a picture link; the server fetches it ONCE and stores the
 * bytes, so the picture is then served from our own domain exactly like a
 * direct upload (ADR 0023).
 *
 * This is not a convenience wrapper around hotlinking — hotlinking is
 * impossible here (the CSP is `img-src 'self' data: blob:` and
 * ImageSchema.asset only accepts `svg:<key>` or `/media/<path>`) and would be
 * wrong anyway, because it would make every student's browser contact a
 * third-party server. Re-hosting also means the picture cannot vanish when the
 * source site reorganises.
 *
 * The SSRF guard set lives in src/lib/media-upload/{ip-guard,fetch-remote-image}.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { prisma } from '@/lib/db'
import { fetchRemoteImage, RemoteImageError } from '@/lib/media-upload/fetch-remote-image'

/**
 * REQUIRED: this route uses node:dns and node:https, which do not exist on the
 * edge runtime. No other route in src/app/api declares a runtime today, so
 * this is the first — verify it locally AND on a deployment before relying on
 * it.
 */
export const runtime = 'nodejs'

export const IMPORT_URL_AUDIT_ACTION = 'LESSON_MEDIA_IMPORTED_FROM_URL'

/** Cheap abuse ceiling, counted from the audit log — no new table, no new dep. */
const MAX_IMPORTS_PER_HOUR = 20

const BodySchema = z.object({
  url: z.string().url().max(2048),
  // Same confirmation the upload path takes, enforced server-side: importing
  // copies someone else's file onto our server.
  rightsConfirmed: z.literal(true),
})

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
  } catch (e) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    throw e
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  const recentImports = await prisma.auditLog.count({
    where: {
      actorUserId: session.user.userId,
      action: IMPORT_URL_AUDIT_ACTION,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  })
  if (recentImports >= MAX_IMPORTS_PER_HOUR) {
    return NextResponse.json({ error: 'TOO_MANY_IMPORTS' }, { status: 429 })
  }

  let image
  try {
    image = await fetchRemoteImage(parsed.data.url)
  } catch (e) {
    if (e instanceof RemoteImageError) {
      // Log server-side only. The response carries a code and nothing else —
      // upstream status, headers and resolved addresses stay here, or this
      // route becomes a port scanner.
      console.warn('[media-import]', e.code)
      return NextResponse.json({ error: e.code }, { status: statusFor(e.code) })
    }
    throw e
  }

  const row = await prisma.uploadedLessonImage.create({
    data: {
      mimeType: image.mimeType,
      byteSize: image.byteSize,
      width: image.width,
      height: image.height,
      data: image.data,
      uploadedBy: session.user.userId,
    },
    select: { id: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.userId,
      action: IMPORT_URL_AUDIT_ACTION,
      entityType: 'UploadedLessonImage',
      entityId: row.id,
      metadataJson: {
        source: 'url-import',
        requestedUrl: parsed.data.url,
        finalUrl: image.finalUrl,
        sourceHost: image.sourceHost,
        redirectCount: image.redirectCount,
        mimeType: image.mimeType,
        byteSize: image.byteSize,
        width: image.width,
        height: image.height,
        rightsConfirmed: true,
      },
    },
  })

  return NextResponse.json({
    path: `/media/uploads/${row.id}`,
    width: image.width,
    height: image.height,
    byteSize: image.byteSize,
    sourceHost: image.sourceHost,
  })
}

function statusFor(code: RemoteImageError['code']): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404
    case 'TIMED_OUT':
      return 504
    case 'FETCH_FAILED':
      return 502
    default:
      return 422
  }
}
