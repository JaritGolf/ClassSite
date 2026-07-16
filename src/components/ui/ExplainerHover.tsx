'use client'

/**
 * ExplainerHover
 *
 * Generic hover-triggered explainer popover for UI chrome (stat widgets,
 * status badges, icons, buttons) — distinct from GlossaryPopover, which is
 * scoped to vocabulary terms inside lesson/stimulus text.
 *
 * Desktop mouse hover only in this pass (no keyboard-focus or touch/tap
 * trigger yet — see docs/adrs/0015-explainer-hover-hover-only-first-pass.md).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ExplainerHoverProps {
  /** Optional bold header line inside the popover. */
  title?: string
  /** The explainer body text, plain language. */
  text: string
  /** Hover delay before the popover appears. Defaults to 1000ms ("a second or more"). */
  delayMs?: number
  /**
   * 'underline' adds a dotted-underline + cursor-help cue for text triggers.
   * 'plain' leaves the child visually untouched (for icons/cards that already
   * read as interactive) but still applies cursor-help.
   */
  variant?: 'underline' | 'plain'
  /**
   * 'game' (default) matches the bright student-facing design system
   * (font-display, indigo-200 border, shadow-card). 'admin' matches the
   * plain teacher/admin LMS surfaces (gray border, no display font, tighter
   * text) — those pages aren't wrapped in the `.cq-*` accommodation theming
   * student pages get, so this theme intentionally doesn't lean on it.
   */
  theme?: 'game' | 'admin'
  /** Extra classes for trigger-visual tweaks. */
  className?: string
  /** Extra classes for flex/layout placement (e.g. "ml-auto"). */
  wrapperClassName?: string
  children: ReactNode
}

/** Trigger elements above this many px from the viewport top open below instead of above. */
const FLIP_THRESHOLD_PX = 180

export function ExplainerHover({
  title,
  text,
  delayMs = 1000,
  variant = 'underline',
  theme = 'game',
  className = '',
  wrapperClassName = '',
  children,
}: ExplainerHoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [placement, setPlacement] = useState<'above' | 'below'>('above')
  const triggerRef = useRef<HTMLSpanElement>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popoverId = useRef(`explainer-${Math.random().toString(36).slice(2)}`)

  function clearOpenTimer() {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
  }

  function handleMouseEnter() {
    clearOpenTimer()
    openTimer.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect()
      setPlacement(rect && rect.top < FLIP_THRESHOLD_PX ? 'below' : 'above')
      setIsOpen(true)
    }, delayMs)
  }

  function handleMouseLeave() {
    clearOpenTimer()
    setIsOpen(false)
  }

  useEffect(() => clearOpenTimer, [])

  // Escape closes an open popover even though hover is the only open trigger.
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const triggerClass =
    variant === 'underline'
      ? 'cursor-help rounded-sm underline decoration-gray-400 decoration-dotted decoration-2 underline-offset-2'
      : 'cursor-help'

  return (
    // Single span carries positioning, the trigger's visual styling, and the
    // hover handlers together — a separate inner "trigger" span previously
    // sat flush inside this one, and under sub-pixel layout (e.g. inside a
    // scrollable flex row at devicePixelRatio 2) the browser's hit-test could
    // land on this outer span's hairline edge instead of the inner one,
    // silently swallowing the hover. One span has no seam to fall into.
    <span
      ref={triggerRef}
      className={['relative inline-block', triggerClass, className, wrapperClassName].join(' ').trim()}
      aria-describedby={isOpen ? popoverId.current : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <span
          id={popoverId.current}
          role="tooltip"
          className={[
            'absolute left-1/2 z-50 w-64 max-w-xs -translate-x-1/2 animate-pop-in',
            placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
            theme === 'admin'
              ? 'rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-lg'
              : 'rounded-2xl border-2 border-indigo-200 bg-white p-3 text-sm leading-relaxed text-gray-800 shadow-card',
          ].join(' ')}
        >
          {title && (
            <span
              className={
                theme === 'admin'
                  ? 'mb-0.5 block text-xs font-semibold uppercase tracking-wide text-gray-500'
                  : 'mb-0.5 block font-display text-xs font-bold uppercase tracking-wide text-indigo-700'
              }
            >
              {title}
            </span>
          )}
          {text}
        </span>
      )}
    </span>
  )
}
