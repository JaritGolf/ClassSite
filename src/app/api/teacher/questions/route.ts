/**
 * GET /api/teacher/questions
 *
 * Question bank listing for the teacher Question Bank manager (spec §22.1).
 * Filters: benchmarkCode, approvalStatus. Each item includes its tags and the
 * result of validateQuestionTags so the UI can flag under-tagged items (rule #3).
 *
 * Access: TEACHER or ADMIN.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateQuestionTags } from '@/lib/eoc-alignment'
import type { Prisma, ApprovalStatus } from '@prisma/client'

const VALID_STATUSES: ApprovalStatus[] = [
  'DRAFT',
  'NEEDS_REVIEW',
  'APPROVED',
  'NEEDS_REVISION',
  'ARCHIVED',
]

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const benchmarkCode = searchParams.get('benchmarkCode')
  const statusParam = searchParams.get('status')

  const where: Prisma.QuestionWhereInput = {}
  if (benchmarkCode) where.benchmark = { code: benchmarkCode }
  if (statusParam && VALID_STATUSES.includes(statusParam as ApprovalStatus)) {
    where.approvalStatus = statusParam as ApprovalStatus
  }

  const questions = await prisma.question.findMany({
    where,
    take: 200,
    orderBy: [{ benchmarkId: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      prompt: true,
      itemType: true,
      cognitiveComplexity: true,
      readingLoadLevel: true,
      skillTag: true,
      remediationTag: true,
      misconceptionId: true,
      sourceTier: true,
      approvalStatus: true,
      benchmarkId: true,
      reportingCategoryId: true,
      stimulusId: true,
      benchmark: { select: { code: true } },
      stimulus: { select: { stimulusType: true } },
    },
  })

  const items = questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    benchmarkCode: q.benchmark.code,
    itemType: q.itemType,
    cognitiveComplexity: q.cognitiveComplexity,
    readingLoadLevel: q.readingLoadLevel,
    skillTag: q.skillTag,
    sourceTier: q.sourceTier,
    approvalStatus: q.approvalStatus,
    missingTags: validateQuestionTags({
      benchmarkId: q.benchmarkId,
      reportingCategoryId: q.reportingCategoryId,
      cognitiveComplexity: q.cognitiveComplexity,
      stimulusType: q.stimulus?.stimulusType ?? null,
      stimulusId: q.stimulusId,
      readingLoadLevel: q.readingLoadLevel,
      skillTag: q.skillTag,
      remediationTag: q.remediationTag,
      misconceptionId: q.misconceptionId,
      sourceTier: q.sourceTier,
      approvalStatus: q.approvalStatus,
    }),
  }))

  return NextResponse.json({ items })
}
