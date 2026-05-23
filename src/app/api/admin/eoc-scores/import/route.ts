/**
 * POST /api/admin/eoc-scores/import
 *
 * Batch-import EOC actual scores.
 * Body: { rows: EocScoreImportRow[] }
 *
 * Returns: { imported, skipped, auditLogId }
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { importEocScoresBatch, ScoreImportError } from '@/lib/eoc-analytics'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).rows)
  ) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'body.rows must be an array' }, { status: 400 })
  }

  const rows = (body as { rows: unknown[] }).rows

  try {
    const result = await importEocScoresBatch(session.user.userId, rows as never)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ScoreImportError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 })
    }
    throw err
  }
}
