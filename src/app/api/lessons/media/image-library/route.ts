/**
 * GET /api/lessons/media/image-library
 *
 * Lists the vetted image assets a teacher/admin can pick for an IMAGE step
 * (as an alternative to uploading something new): the authored SVG
 * illustration registry, and the curated public-domain photo set (whose
 * attributions live in public/media/attributions.json). Picking one fills
 * `asset` (+ width/height for photos) in the editor form — the author still
 * writes/confirms alt/caption/credit/license/longDescription themselves; the
 * library never silently overwrites authored accessibility text.
 *
 * Photo dimensions aren't stored in attributions.json, so they're read
 * directly off the actual file bytes with the same hand-rolled parser the
 * upload route uses (avoids hand-maintaining a second source of truth for
 * numbers a computer can just measure).
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { illustrationKeys } from '@/components/ui/illustrations/keys'
import { detectImageFormat, readImageDimensions } from '@/lib/media-upload/format'

interface AttributionEntry {
  file: string
  title: string
  author: string
  date: string
  source: string
  sourceUrl: string
  license: string
  licenseNote?: string
}

function humanizeKey(key: string): string {
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function GET() {
  await requireAuth(['TEACHER', 'ADMIN'])

  const illustrations = illustrationKeys.map((key) => ({
    key: `svg:${key}`,
    label: humanizeKey(key),
  }))

  const attributionsPath = join(process.cwd(), 'public', 'media', 'attributions.json')
  const attributions: AttributionEntry[] = JSON.parse(await readFile(attributionsPath, 'utf8'))

  const photos = await Promise.all(
    attributions.map(async (entry) => {
      let width: number | null = null
      let height: number | null = null
      try {
        const bytes = await readFile(join(process.cwd(), 'public', entry.file.replace(/^\//, '')))
        const format = detectImageFormat(bytes)
        const dims = format ? readImageDimensions(bytes, format) : null
        width = dims?.width ?? null
        height = dims?.height ?? null
      } catch {
        // File missing/unreadable — surface the entry without dimensions
        // rather than dropping it; the author can still type them in.
      }
      return {
        path: entry.file,
        title: entry.title,
        author: entry.author,
        date: entry.date,
        source: entry.source,
        sourceUrl: entry.sourceUrl,
        license: entry.license,
        licenseNote: entry.licenseNote ?? null,
        width,
        height,
      }
    })
  )

  return NextResponse.json({ illustrations, photos })
}
