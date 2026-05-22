/**
 * Teacher — Benchmark detail analytics page.
 *
 * Sections: Overview, Reading Load, Complexity, Stimulus Type,
 * Distractors, Remediation Roster, Spaced Health.
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import {
  getBenchmarkClassPerformance,
  getPerformanceByReadingLoad,
  getPerformanceByComplexity,
  getPerformanceByStimulusType,
  getDistractorsByMisconception,
  getStudentsInRemediation,
  getBenchmarkSpacedHealth,
} from '@/lib/benchmark-analytics'
import { BenchmarkOverviewCard } from '@/components/teacher/benchmark/BenchmarkOverview'
import { ReadingLoadBreakdown } from '@/components/teacher/benchmark/ReadingLoadBreakdown'
import { ComplexityBreakdown } from '@/components/teacher/benchmark/ComplexityBreakdown'
import { StimulusTypeBreakdown } from '@/components/teacher/benchmark/StimulusTypeBreakdown'
import { DistractorAnalysis } from '@/components/teacher/benchmark/DistractorAnalysis'
import { RemediationStudentList } from '@/components/teacher/benchmark/RemediationStudentList'
import { BenchmarkSpacedHealthCard } from '@/components/teacher/benchmark/BenchmarkSpacedHealthCard'
import Link from 'next/link'

interface Props {
  params: { benchmarkId: string }
}

export default async function BenchmarkDetailPage({ params }: Props) {
  const session = await requireAuth(['TEACHER'])
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

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/teacher/benchmarks"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to Benchmarks
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900">
        {overview.benchmarkCode} — {overview.title}
      </h1>
      <p className="text-sm text-gray-500">{overview.reportingCategoryName}</p>

      {/* Overview */}
      <BenchmarkOverviewCard overview={overview} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Reading Load */}
        <ReadingLoadBreakdown data={readingLoad} />

        {/* Complexity */}
        <ComplexityBreakdown data={complexity} />
      </div>

      {/* Stimulus Type */}
      <StimulusTypeBreakdown data={stimulusType} />

      {/* Distractor Analysis */}
      <DistractorAnalysis rows={distractors} />

      {/* Spaced Health */}
      <BenchmarkSpacedHealthCard health={spacedHealth} />

      {/* Remediation Roster */}
      <RemediationStudentList rows={remediation} />
    </div>
  )
}
