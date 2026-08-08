import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { SignOutButton } from '@/components/ui/SignOutButton'

export default async function ParentLayout({ children }: { children: ReactNode }) {
  await requireAuth(['PARENT'])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/parent/dashboard" className="text-lg font-bold text-indigo-700">
          My Civics Class — Family
        </Link>
        <SignOutButton className="text-sm text-gray-600 hover:text-gray-900" />
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
