'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface ModeCardProps {
  title: string
  description: string
  /** Where the card goes — the player page for this mode, or a picker. */
  href: string
  /** Short context line, e.g. "10 questions". */
  meta?: string
  /** Explains `meta` on hover. */
  metaExplainer?: string
  disabled?: boolean
  disabledReason?: string
  icon?: TrackIconName
}

export function ModeCard(props: ModeCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const error: string | null = null

  // Every card is a link: a session is started by the player page, on the
  // device, so there is nothing to create on the server first.
  function handleClick() {
    if (props.disabled || loading) return
    setLoading(true)
    router.push(props.href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={props.disabled || loading}
      className={`rounded-2xl border-2 px-5 py-4 text-left transition-colors ${
        props.disabled
          ? 'cursor-not-allowed border-dashed border-gray-300 bg-gray-50 text-gray-500'
          : 'border-rose-100 bg-white text-gray-800 shadow-card hover:border-rose-300 hover:bg-rose-50/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
              props.disabled ? 'bg-gray-200 text-gray-500' : 'bg-rose-500 text-white'
            }`}
          >
            <TrackIcon name={props.icon ?? 'shield'} className="h-5 w-5" />
          </span>
          <h3 className="font-display text-base font-bold">{props.title}</h3>
        </div>
        {props.meta && props.metaExplainer ? (
          <ExplainerHover title={props.title} text={props.metaExplainer} variant="plain">
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800">
              {props.meta}
            </span>
          </ExplainerHover>
        ) : (
          props.meta && (
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800">
              {props.meta}
            </span>
          )
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{props.description}</p>
      {props.disabled && props.disabledReason && (
        <p className="mt-2 text-sm font-semibold text-amber-700">{props.disabledReason}</p>
      )}
      {loading && <p className="mt-2 text-sm font-semibold text-indigo-600">Starting session…</p>}
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </button>
  )
}
