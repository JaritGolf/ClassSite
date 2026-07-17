'use client'

/**
 * Click-to-load video facade (ADR 0015 — the rule-#9 compromise).
 *
 * Idle state is 100% local: styled tile, title, duration, always-visible text
 * description, play button. NO network request of any kind happens on page
 * load — not even a remote thumbnail (thumbnail hosts are Google requests
 * too). Only when the student deliberately presses play does an iframe load
 * from YouTube's privacy-enhanced player. The facade says so, in student
 * language.
 *
 * `YOUTUBE_NOCOOKIE_EMBED_HOST` is the ONLY sanctioned external-media host in
 * src/ — pinned to this file by the audit-17 no-analytics guard test.
 */

import { useState } from 'react'
import { ReadAloudButton } from '@/components/ui/ReadAloudButton'
import type { VideoContent } from '@/lib/lesson-content'

export const YOUTUBE_NOCOOKIE_EMBED_HOST = 'https://www.youtube-nocookie.com'

export function VideoStepView({
  youtubeId,
  title,
  description,
  durationLabel,
  whyWatch,
  startSeconds,
}: VideoContent) {
  const [loaded, setLoaded] = useState(false)

  const embedSrc =
    `${YOUTUBE_NOCOOKIE_EMBED_HOST}/embed/${youtubeId}` +
    `?autoplay=1&rel=0&modestbranding=1${startSeconds ? `&start=${startSeconds}` : ''}`

  return (
    <div className="space-y-3">
      {loaded ? (
        <iframe
          src={embedSrc}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          className="aspect-video w-full rounded-2xl border-2 border-gray-200 bg-gray-900"
        />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-800 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
          {/* Decorative film-strip edge */}
          <div className="absolute inset-y-0 left-0 flex w-6 flex-col justify-around bg-indigo-950/60" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="mx-auto h-3 w-3 rounded-sm bg-indigo-200/70" />
            ))}
          </div>
          <div className="pl-6">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-indigo-200">
              Field Footage
              {durationLabel && (
                <span className="ml-2 rounded-full bg-indigo-950/60 px-2 py-0.5 normal-case tracking-normal">
                  ▶ {durationLabel}
                </span>
              )}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold">{title}</h3>
            {whyWatch && <p className="mt-1 text-base leading-7 text-indigo-100">{whyWatch}</p>}
            <button
              type="button"
              onClick={() => setLoaded(true)}
              aria-label={`Play video: ${title}`}
              className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-b-4 border-amber-600 bg-amber-400 px-6 py-3 font-display text-lg font-bold text-amber-950 transition-colors hover:bg-amber-300 active:translate-y-[2px] active:border-b-2"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-950 text-amber-300"
              >
                ▶
              </span>
              Press play to watch
            </button>
            <p className="mt-3 text-sm text-indigo-200">
              The video loads from YouTube&apos;s privacy-enhanced player only when you press play.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="max-w-prose text-base leading-7 text-gray-800">{description}</p>
        <ReadAloudButton text={`${title}. ${description}`} />
      </div>
    </div>
  )
}
