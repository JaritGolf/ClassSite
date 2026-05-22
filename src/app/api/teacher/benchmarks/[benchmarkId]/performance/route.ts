/**
 * GET /api/teacher/benchmarks/[benchmarkId]/performance
 *
 * Returns full benchmark analytics for a specific benchmark:
 * overview, reading-load breakdown, complexity breakdown, stimulus type breakdown,
 * distractor analysis, remediation roster, and spaced-retrieval health.
 *
 * Access: TEACHER and ADMIN only.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { RosterError } from '@/lib/teacher-roster'
import {
  getBenchmarkClassPerformance,
  getPerformanceByReadingLoad,
  getPerformanceByComplexity,
  getPerformanceByStimulusType,
  getDistractorsByMisconception,
  getStudentsInRemediation,
  getBenchmarkSpacedHealth,
} from '@/lib/benchmark-analytics'

export async function GET(
  _req: Request,
  { params }: { params: { benchmarkId: string } }
) {
  const session = await requireAuth(['TEACHER'])
  try {
    const userId = session.user.userId
    const { benchmarkId } = params

    const [overview, readingLoad, complexity, stimulusType, distractors, remediation, spacedHealth] =
      await Promise.all([
        getBenchmarkClassPerformance(userId, benchmarkId),
        getPerformanceByReadingLoad(userId, benchmarkId),
        getPerformanceByComplexity(userId, benchmarkId),
        getPerformanceByStimulusType(userId, benchmarkId),
        getDistractorsByMisconception(userId, benchmarkId),
        getStudentsInRemediation(userId, benchmarkId),
        getBenchmarkSpacedHealth(userId, benchmarkId),
      ])

    return NextResponse.json({
      overview,
      readingLoad,
      complexity,
      stimulusType,
      distractors,
      remediation,
      spacedHealth,
    })
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'FORBIDDEN' ? 403 : 404
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
