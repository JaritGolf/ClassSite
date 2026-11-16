'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SignOutButton } from '@/components/ui/SignOutButton'

const NAV_ITEMS = [
  {
    href: '/teacher/dashboard',
    label: 'Home',
    explain: 'Your starting point. This site keeps no student records, so there is no class dashboard.',
  },
  {
    href: '/teacher/check-codes',
    label: 'Check Codes',
    explain: 'Paste the completion codes students turned in to confirm they are genuine. Nothing is saved.',
  },
  {
    href: '/teacher/lessons',
    label: 'Lessons',
    explain: 'Preview each lesson, add your own modules, and arrange what students see.',
  },
  {
    href: '/teacher/benchmarks',
    label: 'Benchmarks',
    explain: 'Every SS.7.CG standard in the course, grouped by unit, and the switch that opens a mission.',
  },
  {
    href: '/teacher/questions',
    label: 'Question Bank',
    explain: 'Every question in the bank, with tagging, reading-load, and approval status.',
  },
  {
    href: '/teacher/content',
    label: 'Content',
    explain: 'Review and approve drafted content before it’s shown to students.',
  },
  {
    href: '/teacher/classes',
    label: 'Classes',
    explain: 'Lesson arrangements and Republic Challenge settings per class. Classes have no rosters.',
  },
  {
    href: '/teacher/settings',
    label: 'Settings',
    explain: 'Substitute mode and per-class sub-prep notes.',
  },
]

export function TeacherNav() {
  const pathname = usePathname()

  return (
    // print:hidden — navigation is dead ink on paper. This matters for the
    // printable lesson materials and for the parent progress summary, which has
    // always printed with the nav bar across the top of page 1.
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-0 overflow-x-auto print:hidden">
      <span className="font-bold text-indigo-700 text-lg mr-4 shrink-0">My Civics Class</span>
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
            }`}
          >
            <ExplainerHover theme="admin" variant="plain" title={item.label} text={item.explain}>
              {item.label}
            </ExplainerHover>
          </Link>
        ))}
      </div>
      <div className="ml-1 flex items-center gap-3 shrink-0">
        <SignOutButton className="text-sm text-gray-600 hover:text-gray-900" />
      </div>
    </nav>
  )
}
