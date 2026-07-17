'use client'

/**
 * Lesson IMAGE step (ADR 0015): an authored SVG illustration (`svg:<key>`) or
 * a self-hosted public-domain photograph (`/media/...`). Plain <img> for
 * photos — assets are pre-sized local files with intrinsic dimensions.
 *
 * A11y: the figure carries the authored alt; a "Describe this image"
 * disclosure holds the rich long description with read-aloud.
 */

import { ReadAloudButton } from '@/components/ui/ReadAloudButton'
import { ILLUSTRATIONS } from '@/components/ui/illustrations'
import type { ImageContent } from '@/lib/lesson-content'

export function ImageStepView({
  asset,
  alt,
  caption,
  credit,
  license,
  longDescription,
  width,
  height,
}: ImageContent) {
  const svgKey = asset.startsWith('svg:') ? asset.slice(4) : null
  const Illustration = svgKey ? ILLUSTRATIONS[svgKey] : undefined

  return (
    <figure className="space-y-3">
      <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-card">
        {svgKey ? (
          Illustration ? (
            <div role="img" aria-label={alt}>
              <Illustration className="w-full" />
            </div>
          ) : (
            // Unknown registry key: degrade to the text description, never break.
            <p className="p-4 text-base leading-7 text-gray-800">{alt}</p>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized local file; optimizer adds nothing
          <img
            src={asset}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
        )}
      </div>

      <figcaption className="max-w-prose">
        <span className="block text-base leading-7 text-gray-800">{caption}</span>
        <span className="mt-0.5 block text-sm text-gray-600">
          {credit} · {license}
        </span>
      </figcaption>

      <details className="rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-2.5">
        <summary className="cursor-pointer font-display text-sm font-bold text-sky-800">
          Describe this image
        </summary>
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="max-w-prose text-base leading-7 text-gray-800">{longDescription}</p>
          <ReadAloudButton text={longDescription} />
        </div>
      </details>
    </figure>
  )
}
