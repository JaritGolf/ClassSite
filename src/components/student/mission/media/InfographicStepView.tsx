'use client'

/**
 * Lesson INFOGRAPHIC step (ADR 0015): a stat-and-fact panel — big numbers,
 * icon facts, and quotes in a responsive grid. Semantic HTML; the authored
 * `summary` is the always-rendered full-text equivalent with read-aloud.
 */

import { ReadAloudButton } from '@/components/ui/ReadAloudButton'
import { TrackIcon, TRACK_ICON_NAMES, type TrackIconName } from '@/components/ui/TrackIcon'
import type { InfographicContent } from '@/lib/lesson-content'

function iconOrFallback(name: string): TrackIconName {
  return ((TRACK_ICON_NAMES as readonly string[]).includes(name) ? name : 'star') as TrackIconName
}

export function InfographicStepView({ infographic }: { infographic: InfographicContent }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-amber-700">
            Fast facts
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-gray-900">
            {infographic.title}
          </h3>
          {infographic.intro && (
            <p className="mt-1 max-w-prose text-base leading-7 text-gray-700">
              {infographic.intro}
            </p>
          )}
        </div>
        <ReadAloudButton text={`${infographic.title}. ${infographic.summary}`} />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {infographic.blocks.map((block, i) => (
          <li
            key={i}
            className={
              block.type === 'quote'
                ? 'sm:col-span-2'
                : ''
            }
          >
            {block.type === 'big-number' && (
              <div className="h-full rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
                <p className="font-display text-4xl font-bold leading-tight text-amber-700">
                  {block.value}
                </p>
                <p className="mt-0.5 text-base font-bold leading-snug text-gray-900">
                  {block.label}
                </p>
                {block.detail && (
                  <p className="mt-1 text-base leading-7 text-gray-600">{block.detail}</p>
                )}
              </div>
            )}
            {block.type === 'fact' && (
              <div className="flex h-full items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 shadow-card">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
                >
                  <TrackIcon name={iconOrFallback(block.icon)} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-bold leading-snug text-gray-900">{block.text}</p>
                  {block.detail && (
                    <p className="mt-1 text-base leading-7 text-gray-600">{block.detail}</p>
                  )}
                </div>
              </div>
            )}
            {block.type === 'quote' && (
              <blockquote className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-5 py-4">
                <p className="text-lg font-bold leading-8 text-indigo-950">
                  <span aria-hidden="true">“</span>
                  {block.text}
                  <span aria-hidden="true">”</span>
                </p>
                <footer className="mt-1 text-sm font-semibold text-indigo-700">
                  — {block.attribution}
                </footer>
              </blockquote>
            )}
          </li>
        ))}
      </ul>

      <p className="max-w-prose rounded-2xl border-2 border-amber-100 bg-amber-50/60 px-4 py-3 text-base leading-7 text-gray-800">
        {infographic.summary}
      </p>
    </div>
  )
}
