import Link from 'next/link'

/**
 * Dashboard quick-entry to lesson previews (ADR 0015): one chip per approved
 * lesson straight into the "walk it like a student" mode, plus a link to the
 * full Lesson Media manage page. Server-safe (no client hooks).
 */

export interface LessonPreviewLink {
  benchmarkCode: string
  lessonTitle: string
}

export function LessonPreviewLinks({ lessons }: { lessons: LessonPreviewLink[] }) {
  if (lessons.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Preview Lessons</h2>
          <p className="text-xs text-gray-500">
            Walk any mission exactly as students see it — ungated, answers revealed, nothing
            recorded.
          </p>
        </div>
        <Link
          href="/teacher/lessons"
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          Manage lesson media →
        </Link>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {lessons.map((l) => (
          <li key={l.benchmarkCode}>
            <Link
              href={`/teacher/lessons/${l.benchmarkCode}/walkthrough`}
              title={l.lessonTitle}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              <span aria-hidden="true">▶</span>
              {l.benchmarkCode.replace('SS.7.CG.', '')}
              <span className="max-w-[16rem] truncate font-normal text-indigo-600">
                {l.lessonTitle}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
