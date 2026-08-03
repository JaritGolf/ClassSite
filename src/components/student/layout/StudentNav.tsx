'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SuggestionBox } from '@/components/ui/SuggestionBox'

const NAV_ITEMS: { href: string; label: string; icon: TrackIconName; explain: string }[] = [
  {
    href: '/student/dashboard',
    label: 'Dashboard',
    icon: 'home',
    explain: 'Your home base — your EOC readiness, streak, and what to do next.',
  },
  {
    href: '/student/map',
    label: 'Mission Map',
    icon: 'map',
    explain: 'The full path of missions for the year. Master one to unlock the next.',
  },
  {
    href: '/student/daily-drill',
    label: 'Daily Drill',
    icon: 'bolt',
    explain: "A short daily review that brings back questions you're starting to forget, timed to when you're about to forget them.",
  },
  {
    href: '/student/republic-challenge',
    label: 'Republic Challenge',
    icon: 'shield',
    explain: 'Optional review sessions that mix questions across missions — great for staying sharp between Mastery Challenges.',
  },
  {
    href: '/student/source-decoder',
    label: 'Source Decoder',
    icon: 'search',
    explain: 'Practice reading and analyzing historical documents, charts, and other sources.',
  },
  {
    href: '/student/strategy',
    label: 'Strategy',
    icon: 'compass',
    explain: 'Learn and practice test-taking strategies — a separate track from your civics missions.',
  },
  {
    href: '/student/badges',
    label: 'Badges',
    icon: 'medal',
    explain: "See what you've earned and what's still open.",
  },
]

export function StudentNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b-2 border-indigo-100 px-4 py-2 flex items-center gap-4">
      <Link href="/student/dashboard" className="flex items-center gap-2 mr-1 flex-shrink-0">
        <Mascot pose="happy" className="h-9 w-9" />
        {/*
          Wordmark is hidden below `sm` so the nav-item row keeps usable width on
          a 375px phone — the mascot alone carries the home link there. Without
          this, brand + sign-out/settings consume the whole bar and the scrollable
          item row collapses to 0px, leaving Dashboard/Mission Map/etc.
          unreachable (measured: 2px with the old shorter wordmark, 0px now).
        */}
        <span className="hidden font-display text-lg font-bold leading-none text-indigo-700 sm:inline">
          My Civics Class
        </span>
      </Link>

      <div className="flex items-center gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-display font-semibold transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <ExplainerHover title={item.label} text={item.explain} variant="plain">
                <span className="flex items-center gap-1.5">
                  <TrackIcon name={item.icon} className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </span>
              </ExplainerHover>
            </Link>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        {/* Students get the Comment / Question toggle: the two land on separate tabs
            of the teacher report page. `mr-2` keeps the icon off the Settings link. */}
        <SuggestionBox allowKindToggle recipient="teacher" className="mr-2" />
        <Link
          href="/student/settings"
          className="rounded-xl px-3 py-2 text-sm font-display font-semibold text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
        >
          <ExplainerHover
            title="Settings"
            text="Accessibility tools and preferences — high contrast, large text, read-aloud language, and more."
            variant="plain"
          >
            Settings
          </ExplainerHover>
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="rounded-xl px-3 py-2 text-sm font-display font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
