import { requireAuth } from '@/lib/auth'
import { listApprovalQueue } from '@/lib/content-approval'
import { ApprovalQueueTable } from '@/components/teacher/content/ApprovalQueueTable'
import { ApprovalFilters } from '@/components/teacher/content/ApprovalFilters'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { ApprovableEntity } from '@/lib/content-approval'
import type { ApprovalStatus } from '@prisma/client'

interface ContentPageProps {
  searchParams: {
    entityType?: string
    benchmarkId?: string
    status?: string
    limit?: string
    offset?: string
  }
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  const result = await listApprovalQueue(session.user.userId, {
    entityType: searchParams.entityType as ApprovableEntity | undefined,
    benchmarkId: searchParams.benchmarkId,
    status: searchParams.status as ApprovalStatus | undefined,
    limit: searchParams.limit ? parseInt(searchParams.limit) : 50,
    offset: searchParams.offset ? parseInt(searchParams.offset) : 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Content Approval Queue"
            text="AI-drafted or teacher-submitted content (questions, lessons, terms, and more) waiting for your review before it can be shown to students."
          >
            Content Approval Queue
          </ExplainerHover>
        </h1>
        <a
          href="/teacher/content/bulk-approve"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Bulk Approve
        </a>
      </div>

      <ApprovalFilters />

      <div className="text-sm text-gray-500">
        Showing {result.items.length} of {result.total} items
      </div>

      <ApprovalQueueTable items={result.items} />
    </div>
  )
}
