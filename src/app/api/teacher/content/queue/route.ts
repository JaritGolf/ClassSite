import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { listApprovalQueue } from '@/lib/content-approval'
import type { ApprovableEntity } from '@/lib/content-approval'
import type { ApprovalStatus } from '@prisma/client'

export async function GET(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const url = new URL(req.url)
  const q = url.searchParams

  try {
    const result = await listApprovalQueue(session.user.userId, {
      entityType: (q.get('entityType') as ApprovableEntity) || undefined,
      benchmarkId: q.get('benchmarkId') || undefined,
      reportingCategoryId: q.get('reportingCategoryId') || undefined,
      unitId: q.get('unitId') || undefined,
      status: (q.get('status') as ApprovalStatus) || undefined,
      limit: q.get('limit') ? parseInt(q.get('limit')!) : undefined,
      offset: q.get('offset') ? parseInt(q.get('offset')!) : undefined,
    })
    return NextResponse.json(result)
  } catch (e: unknown) {
    throw e
  }
}
