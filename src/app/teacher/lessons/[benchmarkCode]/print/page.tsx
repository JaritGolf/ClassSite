import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { buildLessonPrintPacket, parsePrintDocKind } from '@/lib/lesson-print/packet'
import { LessonPrintDocument } from '@/components/teacher/lessons/print/LessonPrintDocument'
import { PrintControls } from '@/components/teacher/lessons/print/PrintControls'

interface PageProps {
  params: { benchmarkCode: string }
  searchParams: { doc?: string }
}

export const metadata: Metadata = { title: 'Printable Lesson Materials' }

/**
 * Printable lesson materials — a student packet and a teacher answer key.
 *
 * TEACHER/ADMIN only, and read-only: it creates no AssessmentAttempt and writes
 * nothing at all. Same authorization posture as the walkthrough, and for the
 * same reason — the answer key is teacher-facing content, like the Question Bank.
 *
 * See src/lib/lesson-print/packet.ts for why printed output matters: it is the
 * capability that survives when the platform itself cannot be used with students.
 */
export default async function LessonPrintPage({ params, searchParams }: PageProps) {
  await requireAuth(['TEACHER', 'ADMIN'])

  const doc = parsePrintDocKind(searchParams.doc)
  const packet = await buildLessonPrintPacket(params.benchmarkCode)
  if (!packet) notFound()

  return (
    <div className="space-y-5">
      <PrintControls benchmarkCode={packet.benchmarkCode} doc={doc} />

      {doc === 'answer-key' && (
        <p className="rounded border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
          This copy shows the correct answers and the authored feedback. Print the
          <strong> student packet </strong> for handouts.
        </p>
      )}

      <div className="rounded-lg border-2 border-gray-200 bg-white p-6 print:rounded-none print:border-0 print:p-0">
        <LessonPrintDocument packet={packet} doc={doc} />
      </div>
    </div>
  )
}
