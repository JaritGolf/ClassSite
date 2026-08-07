/**
 * Shared HTTP error mapping for the class-authoring routes (ADR 0023).
 *
 * Lives in lib rather than in a route file because Next.js App Router route
 * modules may only export HTTP method handlers and a small set of config
 * values — a helper exported from route.ts is a build-time contract violation.
 * Mirrors src/lib/republic-challenge/route-helpers.ts, which exists for the
 * same reason.
 *
 * The shape matches /api/teacher/lessons/content exactly, so the client's
 * existing postJson normalizer (which maps INVALID_CONTENT issues onto field
 * errors, and handles the YouTube field error specially) needs no new cases.
 */

import { NextResponse } from 'next/server'
import { SubModeError } from '@/lib/substitute-mode'
import { RosterError } from '@/lib/teacher-roster'
import { LessonMediaError } from '@/lib/lesson-media'
import { LessonEditorValidationError } from './content-schema'
import { YoutubeVerificationError } from './youtube'
import { ClassStructureError } from './class-structure'

export function classAuthoringErrorResponse(e: unknown): NextResponse {
  if (e instanceof SubModeError) {
    return NextResponse.json({ error: e.code }, { status: 403 })
  }
  if (e instanceof RosterError) {
    return NextResponse.json({ error: e.code }, { status: e.code === 'FORBIDDEN' ? 403 : 404 })
  }
  if (e instanceof YoutubeVerificationError) {
    return NextResponse.json({ error: e.code, field: 'youtubeId' }, { status: 422 })
  }
  if (e instanceof LessonEditorValidationError) {
    return NextResponse.json({ error: 'INVALID_CONTENT', issues: e.issues }, { status: 422 })
  }
  if (e instanceof LessonMediaError) {
    return NextResponse.json({ error: e.code }, { status: e.code === 'NOT_FOUND' ? 404 : 422 })
  }
  if (e instanceof ClassStructureError) {
    const notFound =
      e.code === 'NOT_FOUND' || e.code === 'LESSON_NOT_FOUND' || e.code === 'ANCHOR_NOT_FOUND'
    // 409, not 422: the request was well-formed but the plan moved underneath
    // it (a second tab, or a reseed that added a step). The client reloads and
    // asks the teacher to retry rather than showing a validation error.
    const conflict = e.code === 'PLAN_OUT_OF_DATE' || e.code === 'STEP_TYPE_MISMATCH'
    return NextResponse.json({ error: e.code }, { status: notFound ? 404 : conflict ? 409 : 422 })
  }
  throw e
}
