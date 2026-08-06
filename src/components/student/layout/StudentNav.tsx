'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SuggestionBox } from '@/components/ui/SuggestionBox'

interface NavItem {
  href: string
  label: string
  icon: TrackIconName
  explain: string
  /**
   * Noun for this tab's count badge, used to give the badge an accessible name
   * ("2 tasks waiting"). A bare number next to a label tells a screen-reader
   * user nothing.
   */
  badgeNoun?: [singular: string, plural: string]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/student/dashboard',
    label: 'Dashboard',
    icon: 'home',
    explain: 'Your home base — your EOC readiness, streak, and what to do next.',
    badgeNoun: ['task waiting', 'tasks waiting'],
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
    badgeNoun: ['question due', 'questions due'],
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
  // Settings lives in the scrollable row with the other destinations rather than
  // pinned on the right. It IS a destination, and the right-hand cluster is
  // `flex-shrink-0`: with "Settings" and "Sign out" both sitting there as text,
  // the item row was squeezed to 53px of visible width on a 375px phone (the
  // wordmark was already hidden below `sm` for the same reason).
  {
    href: '/student/settings',
    label: 'Settings',
    icon: 'gear',
    explain:
      'Accessibility tools and preferences — high contrast, large text, read-aloud language, and more.',
  },
]

/**
 * Count badges, keyed by nav href. Zero or missing renders nothing.
 *
 * Computed in the student layout from two cheap indexed counts — deliberately
 * NOT from the full next-step resolver, which would add its availability queries
 * to every single student page render.
 */
export type StudentNavBadges = Partial<Record<string, number>>

export function StudentNav({ badges = {} }: { badges?: StudentNavBadges }) {
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
          const count = item.badgeNoun ? badges[item.href] ?? 0 : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              // px-2.5 rather than px-3: eight destinations in the row (Settings
              // joined them) just overflow a 1280px viewport at the wider
              // padding. Vertical padding is untouched so the touch target keeps
              // its height.
              className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-display font-semibold transition-colors ${
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
              {count > 0 && item.badgeNoun && (
                <>
                  <span
                    aria-hidden="true"
                    className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 font-display text-xs font-bold ${
                      active ? 'bg-white text-indigo-700' : 'bg-amber-400 text-amber-950'
                    }`}
                  >
                    {count}
                  </span>
                  {/* The number alone is meaningless to a screen reader, and the
                      badge must never be the only way to know work is waiting
                      (rule #10 — no status by colour or glyph alone). */}
                  <span className="sr-only">
                    , {count} {count === 1 ? item.badgeNoun[0] : item.badgeNoun[1]}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        {/* Students get the Comment / Question toggle: the two land on separate tabs
            of the teacher report page. `mr-2` keeps the icon off Sign out. */}
        <SuggestionBox allowKindToggle recipient="teacher" className="mr-2" />
        {/* Settings moved into the scrollable row above — see the NAV_ITEMS note. */}
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
