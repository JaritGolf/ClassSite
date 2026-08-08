/**
 * Printable lesson materials.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * SDPBC Board Policy 3.29 requires Technology Clearinghouse approval before an
 * employee uses a non-District-approved product, and the published policy has no
 * exemption for free tools, no-login tools, or projected-only use. Until approval
 * exists, students cannot be put on this platform.
 *
 * Paper is a different question. Florida has no separate legal category of
 * "supplemental materials" and no state pre-approval requirement for them — the
 * board is responsible for the content of "any other materials used in a
 * classroom" (§ 1006.28(2)(a)1), governed through content standards and an
 * objection process rather than a technology review. A worksheet is not a
 * cloud-based service.
 *
 * So this module turns the authored curriculum into something a teacher can hand
 * out: the content survives with no student accounts, no student data, and no
 * district integration. What does NOT survive is the engine — server-side
 * grading, the mastery threshold, SM-2 spaced retrieval, adaptive difficulty,
 * and every analytic built on them. That trade is stated plainly in
 * docs/tch-contingency.md rather than glossed.
 *
 * ── READ-ONLY BY CONSTRUCTION ───────────────────────────────────────────────
 * Nothing here writes. In particular it must never create an AssessmentAttempt:
 * it composes from `getAssessmentPreviewsForBenchmark`, the same read-only
 * teacher-side reader the walkthrough uses.
 */

import { prisma } from '@/lib/db'
import { parseStepContent, type ParsedStepContent } from '@/lib/lesson-content'
import {
  getAssessmentPreviewsForBenchmark,
  type AssessmentPreview,
} from '@/lib/lesson-media/assessment-preview'

/** Which document is being produced. */
export type PrintDocKind = 'packet' | 'answer-key'

export const PRINT_DOC_KINDS: readonly PrintDocKind[] = ['packet', 'answer-key']

export function parsePrintDocKind(raw: string | undefined): PrintDocKind {
  return raw === 'answer-key' ? 'answer-key' : 'packet'
}

export interface PrintStep {
  id: string
  stepType: string
  title: string | null
  sequenceOrder: number
  content: ParsedStepContent
}

export interface PrintTerm {
  term: string
  definition: string
}

export interface LessonPrintPacket {
  benchmarkCode: string
  benchmarkTitle: string
  lessonTitle: string
  studentFriendlyTarget: string | null
  steps: PrintStep[]
  terms: PrintTerm[]
  /**
   * Question sets that make sense on paper, in teaching order. Deliberately
   * EXCLUDES the Mastery Challenge: it is the assessment that decides whether a
   * benchmark unlocks, its forms rotate per student, and printing an answer key
   * for it puts the live instrument on paper. Practice and the pre-check are
   * what a worksheet is for.
   */
  questionSets: AssessmentPreview[]
}

/**
 * Assessment types that may be printed, in the order they appear in a packet.
 * An allowlist, so a new type is never printed by accident.
 */
const PRINTABLE_ASSESSMENT_TYPES = ['PRE_CHECK', 'VOCAB_CHECK', 'PRACTICE'] as const

export async function buildLessonPrintPacket(
  benchmarkCode: string
): Promise<LessonPrintPacket | null> {
  const benchmark = await prisma.benchmark.findUnique({
    where: { code: benchmarkCode },
    select: {
      id: true,
      code: true,
      title: true,
      lessons: {
        where: { approvalStatus: 'APPROVED' },
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          title: true,
          studentFriendlyTarget: true,
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
      },
      terms: {
        where: { tier: 'TIER_3', approvalStatus: 'APPROVED' },
        orderBy: { term: 'asc' },
        select: { term: true, definition: true },
      },
    },
  })

  const lesson = benchmark?.lessons[0]
  if (!benchmark || !lesson) return null

  const previews = await getAssessmentPreviewsForBenchmark(benchmark.id)

  const questionSets = PRINTABLE_ASSESSMENT_TYPES.flatMap((t) => previews[t] ?? []).filter(
    (a) => a.questions.length > 0
  )

  return {
    benchmarkCode: benchmark.code,
    benchmarkTitle: benchmark.title,
    lessonTitle: lesson.title,
    studentFriendlyTarget: lesson.studentFriendlyTarget,
    steps: lesson.steps.map((s) => ({
      id: s.id,
      stepType: s.stepType,
      title: s.title,
      sequenceOrder: s.sequenceOrder,
      content: parseStepContent(s.stepType, s.content),
    })),
    terms: benchmark.terms.map((t) => ({ term: t.term, definition: t.definition })),
    questionSets,
  }
}
