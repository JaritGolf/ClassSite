import type { ReactNode } from 'react'
import { requireAuth } from '@/lib/auth'
import { AdminShell } from '@/components/admin/layout/AdminShell'
import { AdminNav } from '@/components/admin/layout/AdminNav'

interface AdminLayoutProps {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAuth(['ADMIN'])

  return (
    <AdminShell>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </AdminShell>
  )
}
