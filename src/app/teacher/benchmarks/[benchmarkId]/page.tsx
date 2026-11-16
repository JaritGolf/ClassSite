/**
 * Teacher — Benchmark detail page: what the standard requires.
 * Server component. Curriculum content only.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getBenchmarkDescription } from '@/lib/benchmark-analytics'
import { BenchmarkStandardCard } from '@/components/teacher/benchmark/BenchmarkStandardCard'

interface Props {
  params: { benchmarkId: string }
}

export default async function BenchmarkDetailPage({ params }: Props) {
  await requireAuth(['TEACHER'])

  const description = await getBenchmarkDescription(params.benchmarkId).catch(() => null)
  if (!description) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/teacher/benchmarks" className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; Back to Benchmarks
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900">
        {description.benchmarkCode} — {description.title}
      </h1>
      <p className="text-sm text-gray-500">{description.reportingCategoryName}</p>

      <BenchmarkStandardCard description={description} />

      <Link
        href={`/teacher/lessons/${description.benchmarkCode}`}
        className="inline-block rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
      >
        Open this mission&rsquo;s lesson &rarr;
      </Link>
    </div>
  )
}
