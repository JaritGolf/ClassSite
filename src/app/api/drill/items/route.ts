/**
 * POST /api/drill/items
 *
 * One Daily Drill question for each benchmark the browser says is due.
 * Stateless and anonymous: no session is read and nothing is written. Answers
 * are graded one at a time by POST /api/practice/answer.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DrillItemsSchema, getDrillItems } from '@/lib/spaced-retrieval/drill-stateless'

export async function POST(req: NextRequest) {
  const parsed = DrillItemsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const items = await getDrillItems(parsed.data)
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[drill/items]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
