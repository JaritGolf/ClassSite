'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface ModeCardProps {
  title: string
  description: string
  startUrl: string
  /** Optional length to send in the POST body (mixed / mistake / category modes). */
  length?: number
  /** Optional badge text shown in the corner (e.g. "10 questions"). */
  meta?: string
  /** Optional explainer text for the meta badge, when it needs more context (e.g. stamina ladder). */
  metaExplainer?: string
  /** When true the card is rendered as a non-actionable disabled state. */
  disabled?: boolean
  /** Optional explanatory text shown when disabled. */
  disabledReason?: string
  /** Alternative href to navigate to without a POST (used for the category + source pickers). */
  href?: string
  /** Icon shown on the card's color plate. */
  icon?: TrackIconName
}

export function ModeCard(props: ModeCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (props.disabled || loading) return

    if (props.href) {
      router.push(props.href)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const body = props.length ? JSON.stringify({ length: props.length }) : undefined
      const res = await fetch(props.startUrl, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })
      const data = (await res.json()) as { assessmentId?: string; error?: string }
      if (!res.ok || !data.assessmentId) {
        setError(data.error ?? 'Could not start session')
        setLoading(false)
        return
      }
      router.push(`/student/assessment/${data.assessmentId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setLoading(false)
    }
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
