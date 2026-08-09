'use client'

/**
 * ExplainerHover
 *
 * Generic explainer popover for UI chrome (stat widgets, status badges, icons,
 * buttons) — distinct from GlossaryPopover, which is scoped to vocabulary terms
 * inside lesson/stimulus text.
 *
 * ── ACCESSIBILITY (closes the ADR 0016 deferred item) ───────────────────────
 * This was mouse-hover-only, and `aria-describedby` was set ONLY while the
 * popover was open — so a screen-reader user, who never triggers a mouse hover,
 * could not reach any of the ~150 explainers on the site at all.
 *
 * Three access paths now, in order of how much they matter:
 *
 *  1. ALWAYS-PRESENT DESCRIPTION. The text is rendered into a visually-hidden
 *     node that owns the id, and `aria-describedby` points at it permanently.
 *     Assistive tech reads it as the trigger's description without anything
 *     needing to open. The visual popover is `aria-hidden` so it is not
 *     announced a second time when it does open.
 *
 *  2. FOCUS. Opening on focus covers sighted keyboard users, via a document
 *     `focusin`/`focusout` pair rather than React's `onFocus`. Call sites nest
 *     this component both ways round — `<ExplainerHover><Link/></ExplainerHover>`
 *     and `<Link><ExplainerHover/></Link>` (TeacherNav) — and React's onFocus
 *     only ever sees the first, because focusin bubbles up from the focused node
 *     and never reaches a descendant. Either way this wrapper adds NO tab stop
 *     and no interactive role of its own: most triggers already wrap something
 *     focusable, and a blanket `tabIndex={0}` + `role="button"` would double
 *     every tab stop in the nav and nest a button inside a link.
 *
 *  3. `focusable` (opt-in). For triggers whose child is NOT interactive — a stat
 *     label, a table header, a status chip — there is nothing to focus, so this
 *     prop gives the wrapper a real tab stop plus Enter/Space/tap toggling. Off
 *     by default so no existing call site changes behaviour, and deliberately
 *     NOT applied to triggers wrapping links: a click handler there would
 *     swallow the navigation.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'

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
  /**
   * Give the wrapper its own tab stop and tap/Enter/Space toggling.
   *
   * Set this ONLY when the child is not itself focusable (plain text, a chip, a
   * table header). When the child is a link or button, leave it off: focus
   * already bubbles up from the child to open the popover, and adding a tab stop
   * here would duplicate it while nesting one interactive role inside another.
   */
  focusable?: boolean
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
  focusable = false,
  children,
}: ExplainerHoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // `useId`, NOT a Math.random() ref. The id used to appear in the DOM only
  // while the popover was open — i.e. client-side only — so a server/client
  // mismatch was invisible. Now that the description node and its
  // `aria-describedby` render on every pass, a random id produces a hydration
  // mismatch on every explainer on the page. useId is stable across both.
  const descriptionId = useId()

  function clearOpenTimer() {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
  }

  /** Position and show. Shared by hover (delayed) and focus/tap (immediate). */
  function openNow() {
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
  }

  function handleMouseEnter() {
    clearOpenTimer()
    openTimer.current = setTimeout(openNow, delayMs)
  }

  function handleMouseLeave() {
    clearOpenTimer()
    setIsOpen(false)
  }

  useEffect(() => clearOpenTimer, [])

  // Keyboard focus opens immediately — the hover delay exists to stop popovers
  // firing as the pointer sweeps across a row, which cannot happen when focus
  // was moved deliberately. Waiting a second after Tab just reads as broken.
  //
  // A document-level `focusin` listener rather than React's `onFocus`, because
  // call sites nest this component BOTH ways round:
  //   • wrapper → child:  <ExplainerHover><Link/></ExplainerHover>
  //   • child → wrapper:  <Link><ExplainerHover/></Link>   ← TeacherNav does this
  // React's onFocus only sees the first, since focusin bubbles UP from the
  // focused node and never reaches a descendant. The nav is the single biggest
  // group of explainers on the site, so missing that shape would leave keyboard
  // users without most of them.
  //
  // Bounded deliberately: "an ancestor was focused" alone would match <body>
  // and pop every explainer on the page open at once. Only the trigger itself,
  // something inside it, or its NEAREST interactive ancestor counts.
  useEffect(() => {
    function handleFocusIn(e: FocusEvent) {
      const el = triggerRef.current
      if (!el) return
      const target = e.target as Node | null
      if (!target) return

      const owner = el.closest('a,button,summary,[tabindex]:not([tabindex="-1"])')
      const isOurs = el.contains(target) || (owner !== null && owner === target)

      if (isOurs) {
        clearOpenTimer()
        openNow()
      } else {
        clearOpenTimer()
        setIsOpen(false)
      }
    }
    // Closing needs its own listener: focusin only fires on whatever gains
    // focus, so tabbing to a non-focusable area (or focus dropping to the
    // document) would otherwise leave the popover stuck open. Scoped to OUR
    // trigger losing focus, so this never closes a popover another instance
    // opened on hover.
    function handleFocusOut(e: FocusEvent) {
      const el = triggerRef.current
      if (!el) return
      const lost = e.target as Node | null
      if (!lost) return

      const owner = el.closest('a,button,summary,[tabindex]:not([tabindex="-1"])')
      const wasOurs = el.contains(lost) || (owner !== null && owner === lost)
      if (wasOurs) {
        clearOpenTimer()
        setIsOpen(false)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape closes an open popover.
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
      // Permanent, not `isOpen ? … : undefined`. A screen-reader user never
      // fires a mouse hover, so a description that only exists while the
      // popover is open is a description they can never reach.
      aria-describedby={descriptionId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...(focusable
        ? {
            tabIndex: 0,
            role: 'button' as const,
            onClick: () => (isOpen ? setIsOpen(false) : openNow()),
            onKeyDown: (e: ReactKeyboardEvent<HTMLSpanElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (isOpen) setIsOpen(false)
                else openNow()
              }
              if (e.key === 'Escape') setIsOpen(false)
            },
          }
        : {})}
    >
      {children}

      {/* The accessible description, always in the DOM and always referenced.
          Assistive tech reads this; the visual popover below is decorative and
          aria-hidden so the same sentence is not announced twice.

          `text` only, deliberately not `title: text`. The title is the popover's
          visual heading and is frequently the trigger's own words (an eyebrow
          reading "Assigned for you" titled "Assigned for you"), so including it
          would make a screen reader say it twice in a row — and would duplicate
          that string in the DOM, which is how this was caught.

          `aria-hidden` is LOAD-BEARING, not belt-and-braces. Several call sites
          nest this component INSIDE the interactive element (TeacherNav renders
          <Link><ExplainerHover>…</ExplainerHover></Link>), and accessible-name
          computation concatenates descendant text — so without this, every nav
          link would be named "Dashboard Your class overview — mastery,
          readiness, and alerts at a glance" instead of "Dashboard".
          Hiding it does NOT hide the description: accname §2A makes an explicit
          exception for nodes directly referenced by aria-describedby, so the
          text is still retrieved and announced as the description. */}
      <span id={descriptionId} className="sr-only" aria-hidden="true">
        {text}
      </span>

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
          // Decorative: this is the visual rendering of the sr-only description
          // above, which is what `aria-describedby` actually points at. Without
          // this, opening the popover would announce the same sentence twice.
          aria-hidden="true"
        >
          <span
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
