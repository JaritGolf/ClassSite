'use client'

/**
 * ExplainerHover
 *
 * Generic hover-triggered explainer popover for UI chrome (stat widgets,
 * status badges, icons, buttons) — distinct from GlossaryPopover, which is
 * scoped to vocabulary terms inside lesson/stimulus text.
 *
 * Desktop mouse hover only in this pass (no keyboard-focus or touch/tap
 * trigger yet — see docs/adrs/0016-explainer-hovers-hover-only-first-pass.md).
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
/** Matches the popover's w-64 Tailwind width, used to keep it clear of the viewport edges. */
const POPOVER_WIDTH_PX = 256
const EDGE_MARGIN_PX = 8

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
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null)
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
      if (!rect) return
      const placement = rect.top < FLIP_THRESHOLD_PX ? 'below' : 'above'
      // Fixed positioning computed from the trigger's live coordinates, not
      // CSS absolute+bottom-full/top-full: a trigger sitting inside any
      // horizontally-scrollable row (overflow-x-auto) has its overflow-y
      // silently coerced to 'auto' too by the CSS overflow spec, which
      // clips an absolutely-positioned popover that pops up outside the
      // row's own height — it renders with correct styles (visible,
      // opacity 1) but never actually paints. Fixed positioning escapes
      // that ancestor's clipping box entirely.
      const idealLeft = rect.left + rect.width / 2
      const halfWidth = POPOVER_WIDTH_PX / 2
      const clampedLeft = Math.min(
        Math.max(idealLeft, EDGE_MARGIN_PX + halfWidth),
        window.innerWidth - EDGE_MARGIN_PX - halfWidth
      )
      setCoords({
        left: clampedLeft,
        top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
        placement,
      })
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

  // While waiting on the hover delay, cursor-help signals "there's more
  // info here." Once the popover is actually showing, switching to
  // cursor-pointer signals the trigger (usually a nav Link) is still
  // clickable — cursor-help otherwise reads as "this isn't a link."
  const cursorClass = isOpen ? 'cursor-pointer' : 'cursor-help'
  const triggerClass =
    variant === 'underline'
      ? `${cursorClass} rounded-sm underline decoration-gray-400 decoration-dotted decoration-2 underline-offset-2`
      : cursorClass

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

      {isOpen && coords && (
        // Two layers on purpose: this outer span owns fixed positioning +
        // the -50% centering transform; animate-pop-in's keyframes also
        // animate `transform` (scale + translateY for the pop effect), and
        // a CSS animation on a property overrides any other value on that
        // SAME element for its duration (and after, via fill-mode `both`)
        // — putting the animation on an outer element would silently wipe
        // out the centering transform, at rest, with no error. The inner
        // span gets the animation instead, scoped to its own box.
        <span
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            transform: coords.placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
          className="z-50 w-64 max-w-xs"
        >
          <span
            id={popoverId.current}
            role="tooltip"
            className={[
              'block whitespace-normal animate-pop-in',
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
        </span>
      )}
    </span>
  )
}
