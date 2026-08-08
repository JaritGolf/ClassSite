'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SuggestionBox } from '@/components/ui/SuggestionBox'
import { SignOutButton } from '@/components/ui/SignOutButton'

const NAV_ITEMS = [
  {
    href: '/teacher/dashboard',
    label: 'Dashboard',
    explain: 'Your class overview — mastery, readiness, and alerts at a glance.',
  },
  {
    href: '/teacher/classes',
    label: 'Classes',
    explain: 'Your rosters, plus Republic Challenge and Strategist Track settings per class.',
  },
  {
    href: '/teacher/benchmarks',
    label: 'Benchmarks',
    explain: 'Every SS.7.CG standard in the course, grouped by unit, with your class’s mastery rate on each.',
  },
  {
    href: '/teacher/reporting-categories',
    label: 'Reporting Categories',
    explain: 'The four EOC blueprint groupings (Republic Pillars) — mastery and readiness rolled up by category.',
  },
  {
    href: '/teacher/eoc-readiness',
    label: 'EOC Readiness',
    explain: 'Your class’s estimated exam readiness, overall and by category — a preparation estimate, not a predicted score.',
  },
  {
    href: '/teacher/students',
    label: 'Students',
    explain: 'Browse your roster by class, or search for any student to jump straight to their profile.',
  },
  {
    href: '/teacher/decay',
    label: 'Decay',
    explain: 'Which mastered benchmarks students are starting to forget, so you can bring the material back before it’s lost.',
  },
  {
    href: '/teacher/calibration',
    label: 'Calibration',
    explain: 'Whether students’ confidence ratings match their actual accuracy.',
  },
  {
    href: '/teacher/questions',
    label: 'Question Bank',
    explain: 'Every question in the bank, with tagging, reading-load, and approval status.',
  },
  {
    href: '/teacher/lessons',
    label: 'Lessons',
    explain: 'Preview each lesson and control which videos, images, and diagrams your students see.',
  },
  {
    href: '/teacher/content',
    label: 'Content',
    explain: 'Review and approve AI-drafted or teacher-submitted content before it’s shown to students.',
  },
  {
    href: '/teacher/interventions',
    label: 'Interventions',
    explain: 'Students who need attention — off-ramp, decay spikes, overdue remediation, or overconfidence.',
  },
  {
    href: '/teacher/reports',
    label: 'Reports',
    explain: 'Daily action plan and whole-roster mastery reports, exportable to CSV or PDF.',
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
      {/* Tightened from ml-4/gap-4 to pay back the width the suggestion box takes:
          the 14-item row needs 1334px and this group's spacing is the only slack
          available at 1600px. */}
      <div className="ml-1 flex items-center gap-3 shrink-0">
        {/* mr-3 keeps the icon clear of Sign out — an accidental sign-out while
            reaching for the suggestion box is a bad trade. */}
        <SuggestionBox className="mr-3" />
        <SignOutButton className="text-sm text-gray-600 hover:text-gray-900" />
      </div>
    </nav>
  )
}
