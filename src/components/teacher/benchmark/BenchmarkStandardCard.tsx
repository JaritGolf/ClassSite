/**
 * BenchmarkStandardCard — the standard's own content: verbatim official
 * wording, plain-language lesson summary, clarification bullets, and
 * curriculum context (reporting category + unit). Lets a teacher understand
 * what the benchmark requires from this page alone.
 */

import type { BenchmarkDescription } from '@/lib/benchmark-analytics'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface Props {
  description: BenchmarkDescription
}

export function BenchmarkStandardCard({ description }: Props) {
  const {
    benchmarkCode,
    officialStatement,
    lessonSummary,
    clarifications,
    reportingCategoryName,
    reportingCategoryDescription,
    unitTitle,
  } = description

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="About This Benchmark"
        text="The verbatim Florida standard, what it asks students to learn, and how it fits into the course."
        theme="admin"
      >
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          About This Benchmark
        </h3>
      </ExplainerHover>

      <div className="space-y-4">
        {officialStatement && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Florida Standard &mdash; {benchmarkCode}
            </p>
            <blockquote className="border-l-4 border-indigo-200 pl-3 text-sm italic text-gray-700">
              {officialStatement}
            </blockquote>
          </div>
        )}

        {lessonSummary && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              What This Benchmark Covers
            </p>
            <p className="text-sm text-gray-700">{lessonSummary}</p>
          </div>
        )}

        {clarifications.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Key Clarifications
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
              {clarifications.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 text-xs text-gray-500">
          <p>
            Part of <span className="font-medium text-gray-700">Unit: {unitTitle}</span> &middot;{' '}
            <span className="font-medium text-gray-700">{reportingCategoryName}</span> reporting category
          </p>
          {reportingCategoryDescription && (
            <p className="mt-1">{reportingCategoryDescription}</p>
          )}
        </div>
      </div>
    </div>
  )
}
