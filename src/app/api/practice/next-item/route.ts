/**
 * POST /api/practice/next-item
 *
 * Next Practice Arena item for an adaptive state the browser sends.
 * Stateless and anonymous: no session is read and nothing is written.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPracticeItem, PracticeNextItemSchema } from '@/lib/adaptive-difficulty/stateless'

export async function POST(req: NextRequest) {
  const parsed = PracticeNextItemSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const result = await getPracticeItem(parsed.data)
    if (!result) return NextResponse.json({ error: 'Practice set not found' }, { status: 404 })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[practice/next-item]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
