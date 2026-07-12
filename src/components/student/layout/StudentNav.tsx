'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'

const NAV_ITEMS: { href: string; label: string; icon: TrackIconName }[] = [
  { href: '/student/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/student/map', label: 'Mission Map', icon: 'map' },
  { href: '/student/daily-drill', label: 'Daily Drill', icon: 'bolt' },
  { href: '/student/republic-challenge', label: 'Republic Challenge', icon: 'shield' },
  { href: '/student/source-decoder', label: 'Source Decoder', icon: 'search' },
  { href: '/student/strategy', label: 'Strategy', icon: 'compass' },
  { href: '/student/badges', label: 'Badges', icon: 'medal' },
]

export function StudentNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b-2 border-indigo-100 px-4 py-2 flex items-center gap-4">
      <Link href="/student/dashboard" className="flex items-center gap-2 mr-1 flex-shrink-0">
        <Mascot pose="happy" className="h-9 w-9" />
        <span className="font-display font-bold text-indigo-700 text-lg leading-none">
          Civics Quest
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
              <TrackIcon name={item.icon} className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        <Link
          href="/student/settings"
          className="rounded-xl px-3 py-2 text-sm font-display font-semibold text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
        >
          Settings
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
