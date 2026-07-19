/**
 * /admin/parents — provision parent accounts and verify parent↔student links
 * (Phase 18, audit §36.19 item 1). ADMIN-gated by the admin layout.
 *
 * Verification (setting a link VERIFIED) is the in-app identity gate; the
 * district policy for when that's allowed lives in docs/parent-identity-policy.md.
 */

import { prisma } from '@/lib/db'
import { listParents, isParentPortalEnabled } from '@/lib/parent-portal'
import { ParentManager } from '@/components/admin/parents/ParentManager'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

export default async function AdminParentsPage() {
  const [parents, studentRows] = await Promise.all([
    listParents(),
    prisma.student.findMany({
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { lastName: 'asc' } },
      take: 500,
    }),
  ])

  const students = studentRows.map((s) => ({
    id: s.id,
    name: `${s.user.firstName} ${s.user.lastName}`,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parents</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create parent accounts, link them to students, and verify identity. Only{' '}
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Verified"
            text="Once you verify a link, that parent can see that student's progress in the family portal. Pending and rejected links show nothing."
          >
            <span className="font-medium">verified</span>
          </ExplainerHover>{' '}
          links show progress to a parent.
        </p>
      </div>

      {!isParentPortalEnabled() && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The family portal is currently <span className="font-semibold">disabled</span>{' '}
          (<code>FEATURE_PARENT_PORTAL</code> is not "true"). You can provision and verify here
          now; parents cannot sign in or see data until it is enabled — pending district
          sign-off (<code>docs/parent-identity-policy.md</code>).
        </div>
      )}

      <ParentManager parents={parents} students={students} />
    </div>
  )
}
