'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ModeCardProps {
  title: string
  description: string
  startUrl: string
  /** Optional length to send in the POST body (mixed / mistake / category modes). */
  length?: number
  /** Optional badge text shown in the corner (e.g. "10 questions"). */
  meta?: string
  /** When true the card is rendered as a non-actionable disabled state. */
  disabled?: boolean
  /** Optional explanatory text shown when disabled. */
  disabledReason?: string
  /** Alternative href to navigate to without a POST (used for the category + source pickers). */
  href?: string
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
      className={`text-left rounded-xl border-2 px-5 py-4 transition-colors ${
        props.disabled
          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-400 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">{props.title}</h3>
        {props.meta && (
          <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
            {props.meta}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-1">{props.description}</p>
      {props.disabled && props.disabledReason && (
        <p className="text-xs text-amber-600 mt-2">{props.disabledReason}</p>
      )}
      {loading && (
        <p className="text-xs text-indigo-600 mt-2">Starting session…</p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </button>
  )
}
