/**
 * POST /api/suggestions — file a suggestion from the nav-bar suggestion box (ADR 0021).
 *
 * Mounted at /api/suggestions rather than under /api/{student,teacher}/* because one
 * endpoint serves all three shells; mapping the author's role to a destination
 * audience is the domain layer's job (`createSuggestion`).
 *
 * SUB MODE — DELIBERATELY NOT GUARDED. Every other write route in this codebase
 * calls `assertNotSubMode()`, so the omission here is intentional and must not be
 * "fixed": substitute mode exists to stop a substitute mutating instructional state
 * or student records, and filing a suggestion mutates neither. A substitute is also
 * exactly the person most likely to walk into confusing UI with fresh eyes, so
 * silently 403-ing their feedback would be a bug, not a safety feature.
 * Triage (PATCH .../status) IS guarded. The line: anyone may submit, only the owner
 * may triage.
 *
 * `getSession()` + explicit JSON errors, not `requireAuth` — requireAuth *redirects*,
 * which would hand this fetch an HTML body that `res.json()` chokes on.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import {
  createSuggestion,
  SuggestionError,
  SUGGESTION_MAX_BODY_CHARS,
  SUGGESTION_MAX_PAGE_LABEL_CHARS,
  SUGGESTION_MAX_PATHNAME_CHARS,
  SUGGESTION_MIN_BODY_CHARS,
} from '@/lib/suggestions'

// zod applies string checks in declaration order, so `.trim().min()` validates the
// TRIMMED value — a whitespace-only body 422s instead of storing a blank.
const CreateSchema = z.object({
  body: z.string().trim().min(SUGGESTION_MIN_BODY_CHARS).max(SUGGESTION_MAX_BODY_CHARS),
  kind: z.enum(['COMMENT', 'QUESTION']).optional(),
  pathname: z
    .string()
    .min(1)
    .max(SUGGESTION_MAX_PATHNAME_CHARS)
    .startsWith('/'),
  pageLabel: z.string().trim().max(SUGGESTION_MAX_PAGE_LABEL_CHARS).optional(),
  viewportWidth: z.number().int().min(200).max(10000).optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  try {
    const created = await createSuggestion(session.user.userId, parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof SuggestionError) {
      switch (e.code) {
        case 'FORBIDDEN':
        case 'ROLE_NOT_ALLOWED':
          return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        case 'RATE_LIMITED':
          return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
        case 'INVALID_BODY':
        case 'INVALID_LOCATION':
          return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
        default:
          return NextResponse.json({ error: e.code }, { status: 422 })
      }
    }
    throw e
  }
}
