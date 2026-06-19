'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/eoc-scores', label: 'EOC Scores' },
  { href: '/admin/calibration', label: 'Calibration' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/retention', label: 'Retention' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-0 overflow-x-auto">
      <span className="font-bold text-indigo-700 text-lg mr-4 shrink-0">Civics Quest — Admin</span>
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
            {item.label}
          </Link>
        ))}
      </div>
      <div className="ml-4 flex items-center gap-4 shrink-0">
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
