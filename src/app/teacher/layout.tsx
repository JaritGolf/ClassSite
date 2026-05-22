import type { ReactNode } from 'react'
import { requireAuth } from '@/lib/auth'
import { TeacherShell } from '@/components/teacher/layout/TeacherShell'
import { TeacherNav } from '@/components/teacher/layout/TeacherNav'
import { SubModeBanner } from '@/components/teacher/layout/SubModeBanner'

interface TeacherLayoutProps {
  children: ReactNode
}

export default async function TeacherLayout({ children }: TeacherLayoutProps) {
  await requireAuth(['TEACHER'])

  return (
    <TeacherShell>
      <TeacherNav />
      <SubModeBanner />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </TeacherShell>
  )
}
