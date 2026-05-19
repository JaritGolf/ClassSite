import { requireAuth, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentNav } from '@/components/student/layout/StudentNav'
import { PauseBanner } from '@/components/student/layout/PauseBanner'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['STUDENT'])

  let pausePointMinutes = 40
  const session = await getSession()
  if (session) {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.userId },
      select: { id: true },
    })
    if (student) {
      const settings = await prisma.studentUiSettings.findUnique({
        where: { studentId: student.id },
        select: { pausePointMinutes: true },
      })
      if (settings) pausePointMinutes = settings.pausePointMinutes
    }
  }

  return (
    <>
      <StudentNav />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
      <PauseBanner pausePointMinutes={pausePointMinutes} />
    </>
  )
}
