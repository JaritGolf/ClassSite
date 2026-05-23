'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/student/dashboard', label: 'Dashboard' },
  { href: '/student/map', label: 'Mission Map' },
  { href: '/student/daily-drill', label: 'Daily Drill' },
  { href: '/student/republic-challenge', label: 'Republic Challenge' },
  { href: '/student/badges', label: 'Badges' },
]

export function StudentNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-6">
      <span className="font-bold text-indigo-700 text-lg mr-2">Civics Quest</span>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`text-sm font-medium transition-colors ${
            pathname.startsWith(item.href)
              ? 'text-indigo-700 border-b-2 border-indigo-700 pb-0.5'
              : 'text-gray-600 hover:text-indigo-600'
          }`}
        >
          {item.label}
        </Link>
      ))}
      <div className="ml-auto flex items-center gap-4">
        <Link href="/student/settings" className="text-sm text-gray-500 hover:text-gray-700">
          Settings
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
