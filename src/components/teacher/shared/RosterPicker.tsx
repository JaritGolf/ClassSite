'use client'

import { useState } from 'react'
import Link from 'next/link'

interface RosterStudent {
  id: string
  displayName: string
}

interface RosterPickerProps {
  students: RosterStudent[]
  basePath?: string
}

export function RosterPicker({ students, basePath = '/teacher/students' }: RosterPickerProps) {
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const filtered = trimmed
    ? students.filter((s) =>
        s.displayName.toLowerCase().includes(trimmed.toLowerCase())
      )
    : []

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className={trimmed ? 'border-b border-gray-100 p-3' : 'p-3'}>
        <input
          type="search"
          placeholder="Search students..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          aria-label="Search students"
        />
      </div>
      {/* Results only appear once the teacher starts typing — no full list by default. */}
      {trimmed && (
        <ul className="max-h-64 overflow-y-auto" role="list">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">No students found</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${basePath}/${s.id}`}
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {s.displayName}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
