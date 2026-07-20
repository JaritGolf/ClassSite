/**
 * Teacher — Question Bank Manager (spec §22.1).
 *
 * Browse the question bank with tag visibility and under-tagged flags
 * (validateQuestionTags, rule #3). Filter by benchmark and approval status.
 */

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateQuestionTags } from '@/lib/eoc-alignment'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { ApprovalStatus, Prisma } from '@prisma/client'

const STATUSES: ApprovalStatus[] = ['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'ARCHIVED']

interface PageProps {
  searchParams: { benchmarkCode?: string; status?: string }
}

export default async function QuestionBankPage({ searchParams }: PageProps) {
  await requireAuth(['TEACHER'])

  const benchmarks = await prisma.benchmark.findMany({
    orderBy: { sequenceOrder: 'asc' },
    select: { code: true, title: true },
  })

  const where: Prisma.QuestionWhereInput = {}
  if (searchParams.benchmarkCode) where.benchmark = { code: searchParams.benchmarkCode }
  if (searchParams.status && STATUSES.includes(searchParams.status as ApprovalStatus)) {
    where.approvalStatus = searchParams.status as ApprovalStatus
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
      sourceTier: true,
      approvalStatus: true,
      benchmarkId: true,
      reportingCategoryId: true,
      remediationTag: true,
      misconceptionId: true,
      stimulusId: true,
      benchmark: { select: { code: true } },
      stimulus: { select: { stimulusType: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Question Bank</h1>
        <p className="mt-1 text-sm text-gray-500">
          {questions.length} question(s). Rows flagged in red are missing required EOC alignment tags.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="GET">
        <label className="text-sm">
          <span className="block text-xs text-gray-500">Benchmark</span>
          <select
            name="benchmarkCode"
            defaultValue={searchParams.benchmarkCode ?? ''}
            className="mt-0.5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All benchmarks</option>
            {benchmarks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">Status</span>
          <select
            name="status"
            defaultValue={searchParams.status ?? ''}
            className="mt-0.5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4 font-medium">Benchmark</th>
              <th className="py-2 pr-4 font-medium">Prompt</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">
                <ExplainerHover
                  theme="admin"
                  variant="underline"
                  title="Reading Load (RL)"
                  text="1 = paraphrase + glossary, 2 = chunked excerpt (EOC-equivalent), 3 = raw passage. Higher levels ask students to read more independently."
                >
                  RL
                </ExplainerHover>
              </th>
              <th className="py-2 pr-4 font-medium">Complexity</th>
              <th className="py-2 pr-4 font-medium">
                <ExplainerHover
                  theme="admin"
                  variant="underline"
                  title="Status"
                  text="Draft: still being written. Needs Review / Needs Revision: waiting on you. Approved: visible to students. Archived: retired."
                >
                  Status
                </ExplainerHover>
              </th>
              <th className="py-2 pr-4 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const missing = validateQuestionTags({
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
              })
              return (
                <tr
                  key={q.id}
                  className={`border-b border-gray-100 ${missing.length > 0 ? 'bg-red-50' : ''}`}
                >
                  <td className="py-2 pr-4 font-mono text-xs text-gray-500">{q.benchmark.code}</td>
                  <td className="py-2 pr-4 text-gray-800 max-w-md truncate">{q.prompt}</td>
                  <td className="py-2 pr-4 text-gray-600">{q.itemType}</td>
                  <td className="py-2 pr-4 text-gray-600">{q.readingLoadLevel}</td>
                  <td className="py-2 pr-4 text-gray-600">{q.cognitiveComplexity}</td>
                  <td className="py-2 pr-4 text-gray-600">{q.approvalStatus}</td>
                  <td className="py-2 pr-4">
                    {missing.length === 0 ? (
                      <span className="text-green-600 text-xs">✓ fully tagged</span>
                    ) : (
                      <span className="text-red-600 text-xs">missing: {missing.join(', ')}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
