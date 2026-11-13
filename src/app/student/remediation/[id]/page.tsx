import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RemediationActivity } from '@/components/student/remediation/RemediationActivity'

interface PageProps {
  params: { id: string }
}

/**
 * A Training Mission. The id in the URL is the curriculum remediation ITEM —
 * approved content that is the same for everyone — not a per-student record
 * (none exists). Whether it is assigned or finished is tracked on the device.
 */
export default async function RemediationPage({ params }: PageProps) {
  const item = await prisma.remediationItem.findFirst({
    where: { id: params.id, approvalStatus: 'APPROVED' },
    select: {
      id: true,
      title: true,
      remediationType: true,
      content: true,
      benchmark: { select: { code: true } },
    },
  })
  if (!item) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="font-display text-xs font-bold uppercase tracking-widest text-amber-700">
        Targeted Practice
      </h1>
      <RemediationActivity
        itemId={item.id}
        benchmarkCode={item.benchmark.code}
        title={item.title}
        remediationType={item.remediationType}
        content={item.content}
      />
    </div>
  )
}
