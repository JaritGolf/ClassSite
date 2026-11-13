/**
 * POST /api/teacher/completion-codes/check
 *
 * Verifies a list of completion codes. Teacher only.
 *
 * Saves nothing — no database write, no audit row, no log line containing a
 * code. The request body may contain ONLY strings shaped like codes: the page
 * extracts them in the browser, and this schema rejects anything else, so a
 * student's name pasted next to a code cannot arrive here.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CODE_SHAPE, verifyCompletionCode } from '@/lib/completion-codes'

const BodySchema = z.object({
  codes: z.array(z.string().max(60).regex(CODE_SHAPE)).min(1).max(500),
})

export interface CodeCheckRow {
  code: string
  valid: boolean
  reason: 'malformed' | 'bad-signature' | null
  benchmarkCode: string | null
  benchmarkTitle: string | null
  scorePercent: number | null
  /** YYYY-MM-DD */
  date: string | null
  /** How many times this exact code appears in the pasted list. */
  occurrences: number
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Send only completion codes' }, { status: 400 })
  }

  const checks = parsed.data.codes.map((c) => verifyCompletionCode(c))

  const occurrences = new Map<string, number>()
  for (const c of checks) occurrences.set(c.code, (occurrences.get(c.code) ?? 0) + 1)

  const benchmarkCodes = [
    ...new Set(checks.flatMap((c) => (c.valid ? [c.payload.benchmarkCode] : []))),
  ]
  // Curriculum lookup only, for a readable title.
  const benchmarks = await prisma.benchmark.findMany({
    where: { code: { in: benchmarkCodes } },
    select: { code: true, title: true },
  })
  const titleByCode = new Map(benchmarks.map((b) => [b.code, b.title]))

  const rows: CodeCheckRow[] = checks.map((c) =>
    c.valid
      ? {
          code: c.code,
          valid: true,
          reason: null,
          benchmarkCode: c.payload.benchmarkCode,
          benchmarkTitle: titleByCode.get(c.payload.benchmarkCode) ?? null,
          scorePercent: c.payload.scorePercent,
          date: `${c.payload.dateStamp.slice(0, 4)}-${c.payload.dateStamp.slice(4, 6)}-${c.payload.dateStamp.slice(6, 8)}`,
          occurrences: occurrences.get(c.code) ?? 1,
        }
      : {
          code: c.code,
          valid: false,
          reason: c.reason,
          benchmarkCode: null,
          benchmarkTitle: null,
          scorePercent: null,
          date: null,
          occurrences: occurrences.get(c.code) ?? 1,
        }
  )

  return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'no-store' } })
}
