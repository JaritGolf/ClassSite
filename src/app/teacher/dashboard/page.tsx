/**
 * Teacher home.
 *
 * There is no class dashboard of student results, because the site holds no
 * student results. This page is the teacher's starting point for the things
 * the site does hold: lessons, the question bank, and the completion-code
 * checker.
 */

import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LessonPreviewLinks } from '@/components/teacher/dashboard/LessonPreviewLinks'

const CARDS = [
  {
    href: '/teacher/check-codes',
    title: 'Check completion codes',
    body: 'Paste the codes students turned in on Google Classroom to confirm each one is genuine. Nothing you paste is saved.',
  },
  {
    href: '/teacher/lessons',
    title: 'Lessons',
    body: 'Preview each mission, add your own modules, and arrange what students see.',
  },
  {
    href: '/teacher/benchmarks',
    title: 'Benchmarks',
    body: 'Every SS.7.CG standard in the course, and the switch that opens a mission to students.',
  },
  {
    href: '/teacher/questions',
    title: 'Question bank',
    body: 'Every question, with its tags, reading load and approval status.',
  },
  {
    href: '/teacher/content',
    title: 'Content approval',
    body: 'Review drafted content before it can reach students.',
  },
]

export default async function TeacherDashboard() {
  await requireAuth(['TEACHER'])

  const previewLessons = await prisma.lesson.findMany({
    where: { approvalStatus: 'APPROVED' },
    orderBy: { benchmark: { sequenceOrder: 'asc' } },
    select: { title: true, benchmark: { select: { code: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher home</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Students use this site without signing in, and their progress stays on their own
          device. This site does not receive or store anything about a student, so there is no
          roster or gradebook here. Students show their work by pasting a completion code into
          Google Classroom.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2" role="list">
        {CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block h-full rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              <h2 className="text-base font-semibold text-indigo-700">{card.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>

      <LessonPreviewLinks
        lessons={previewLessons.map((l) => ({
          benchmarkCode: l.benchmark.code,
          lessonTitle: l.title,
        }))}
      />
    </div>
  )
}
