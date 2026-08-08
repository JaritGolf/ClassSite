'use client'

/**
 * SuggestionBox — the permanent nav-bar suggestion field (ADR 0021).
 *
 * A one-line field that expands into a small editor on hover, with a submit button.
 * Every submission carries the page the author was on, resolved from the current
 * pathname (the server re-derives and wins — see src/lib/suggestions/location.ts).
 *
 * ONE VISUAL STYLE on every surface (owner's call, 2026-07-24): the plain LMS look
 * the teacher/admin pages already used. It reads as a real form control rather than
 * a game element, and it rides the existing `.cq-high-contrast` utility overrides on
 * student pages for free because it uses stock Tailwind class names.
 *
 * ACCESSIBILITY: hover is the headline trigger, but focus and click open it
 * identically. ADR 0016 records hover-only ExplainerHover as an owner-approved
 * deviation, justified by every popover being *supplementary* context. A form has
 * no other path — hover-only here would make the feature unusable for keyboard-only,
 * touch, and screen-reader users, which that exception does not cover.
 *
 * "All normal text functions" is the NATIVE textarea set, deliberately with no
 * formatting toolbar (owner's call): undo/redo, cut/copy/paste (plain text only —
 * a security win over any contenteditable), select-all, word/line caret motion,
 * spellcheck, the OS context menu, IME composition, and dictation. Nothing is
 * parsed anywhere, so there is no markup surface at all.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  SUGGESTION_KIND_COPY,
  SUGGESTION_KIND_LABELS,
  SUGGESTION_MAX_BODY_CHARS,
  SUGGESTION_MIN_BODY_CHARS,
  type SuggestionKindValue,
} from '@/lib/suggestions/constants'
import { labelForPathname } from '@/lib/suggestions/location'

interface SuggestionBoxProps {
  /**
   * Show the Comment / Question toggle. On when the author's audience separates the
   * two into different queues (students → the teacher report page's two tabs).
   */
  allowKindToggle?: boolean
  /** Whose inbox this lands in, for the hint copy only. */
  recipient?: 'teacher' | 'admin'
  /** Layout/placement classes (e.g. "mr-3"). */
  className?: string
}

/** Matches the panel's inline width; used to keep it clear of the viewport edges. */
const PANEL_WIDTH_PX = 384
const TOOLTIP_WIDTH_PX = 232
const EDGE_MARGIN_PX = 8
/** Gap between the nav row and the panel's top edge. */
const PANEL_OFFSET_PX = 8
const SUCCESS_COLLAPSE_MS = 2500
/**
 * Hover-intent timings.
 *
 * The explainer appears after a short delay so a sweep across the nav doesn't flash
 * it, and then stays up for as long as the pointer remains on the icon — it is NOT
 * dismissed when the panel opens. Tying its lifetime to "panel not yet open" gave it
 * only ~330ms on screen, which is not enough to read.
 *
 * The open delay is kept because it stops the panel appearing when you merely brush
 * past the icon. Click and keyboard focus skip both delays.
 */
const TOOLTIP_DELAY_MS = 120
const OPEN_DELAY_MS = 450
/** Gap between the explainer and the panel when both are on screen. */
const TOOLTIP_GAP_PX = 8
/**
 * Grace period before a hover-out actually collapses the panel.
 *
 * The panel is anchored BELOW the nav with an 8px gap, and the slot it hangs off is
 * only 36px tall — so travelling from the trigger to the panel necessarily crosses
 * a few pixels that belong to neither, firing mouseleave. Collapsing immediately made
 * the panel unreachable by mouse: it appeared on hover and vanished the moment you
 * moved toward it. The timer is cancelled by re-entering either the slot or the panel
 * (the panel is a DOM descendant of the slot, so entering it re-fires mouseenter).
 */
const CLOSE_DELAY_MS = 400
/** Show the character counter to assistive tech only once it actually matters. */
const COUNTER_ANNOUNCE_THRESHOLD = 100

type SubmitState = 'idle' | 'saving' | 'success' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMITED: 'You just sent one — give it a few seconds and try again.',
  INVALID_BODY: 'Please write a little more (at least a few words).',
  FORBIDDEN: "You're not able to send suggestions from this account.",
  UNAUTHENTICATED: 'Your session ended. Please sign in again.',
}

function describeError(status: number, code?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  return `Couldn't send that (${status}). Please try again.`
}

export function SuggestionBox({
  allowKindToggle = false,
  recipient = 'admin',
  className = '',
}: SuggestionBoxProps) {
  const pathname = usePathname()
  const pageLabel = labelForPathname(pathname)

  const [expanded, setExpanded] = useState(false)
  const [tooltipShown, setTooltipShown] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const [tipCoords, setTipCoords] = useState<{ top: number; left: number } | null>(null)
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState<SuggestionKindValue>('COMMENT')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)

  const slotRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Set when the panel should take focus after it mounts (icon variant / click). */
  const focusOnOpen = useRef(false)

  /**
   * Mirrors of the two values the collapse guard reads. The guard protects text the
   * user has typed, so it must never be able to see a stale closure value — a
   * mouseleave that fires in the same frame as another state update would otherwise
   * be able to discard a draft. Refs are always current; state drives rendering.
   */
  const draftRef = useRef(draft)
  draftRef.current = draft
  const submitStateRef = useRef(submitState)
  submitStateRef.current = submitState

  const uid = useId()
  const panelId = `suggestion-panel-${uid}`
  const hintId = `suggestion-hint-${uid}`
  const counterId = `suggestion-counter-${uid}`
  const feedbackId = `suggestion-feedback-${uid}`
  const kindGroupId = `suggestion-kind-${uid}`
  const tooltipId = `suggestion-tip-${uid}`

  const canSubmit = draft.trim().length >= SUGGESTION_MIN_BODY_CHARS && submitState !== 'saving'
  const remaining = SUGGESTION_MAX_BODY_CHARS - draft.length
  const copy = SUGGESTION_KIND_COPY[kind]
  const hint = recipient === 'teacher' ? copy.studentHint : copy.staffHint

  /**
   * Fixed positioning computed from the slot's live rect, NOT CSS absolute. Both
   * StudentNav's item row and TeacherNav/AdminNav's <nav> are `overflow-x-auto`, and
   * the CSS overflow spec silently coerces `overflow-y` to 'auto' on such a box —
   * which clips an absolutely-positioned panel taller than the nav row. It renders
   * with correct styles (visible, opacity 1) and never actually paints. Fixed
   * positioning escapes that ancestor's clipping box entirely. Same technique as
   * ExplainerHover; see its comment for the full history.
   */
  const recompute = useCallback(() => {
    const rect = slotRef.current?.getBoundingClientRect()
    if (!rect) return
    // `document.documentElement.clientWidth`, NOT `window.innerWidth`: innerWidth
    // includes the classic scrollbar gutter, so clamping against it pushes the
    // panel's right edge into space the user cannot see. Measured at a 375px layout
    // viewport, innerWidth reported 405 and the Submit button landed off screen.
    // clientWidth is the layout viewport, which is what `position: fixed` resolves
    // against.
    const viewportWidth = document.documentElement.clientWidth
    // Width shrinks to fit narrow viewports — a fixed 384px panel cannot fit a
    // 375px phone at all.
    const width = Math.min(PANEL_WIDTH_PX, viewportWidth - EDGE_MARGIN_PX * 2)
    // Right-aligned to the slot, not centered: the box lives in the nav's
    // right-hand group, and centering the panel on a 224px slot would run it
    // off-screen on narrow viewports.
    const idealLeft = rect.right - width
    const left = Math.min(
      Math.max(idealLeft, EDGE_MARGIN_PX),
      Math.max(viewportWidth - EDGE_MARGIN_PX - width, EDGE_MARGIN_PX)
    )
    // Always below. The nav is pinned to the top of the viewport, so
    // ExplainerHover's above/below flip has nothing to solve here.
    setCoords({ left, top: rect.bottom + PANEL_OFFSET_PX, width })
  }, [])

  /**
   * The explainer is positioned separately from the panel because the two are on
   * screen together. Both are `position: fixed` below the nav, so anchoring the
   * explainer under the icon would put it directly behind the panel.
   *
   * Preference order: to the LEFT of the panel (same top, so they read as a pair);
   * failing that — narrow viewports, where there is no room beside a 384px panel —
   * BELOW the panel. When the panel is closed it simply sits under the icon.
   */
  const recomputeTip = useCallback(() => {
    const rect = slotRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewportWidth = document.documentElement.clientWidth
    const clampLeft = (x: number) =>
      Math.min(
        Math.max(x, EDGE_MARGIN_PX),
        Math.max(viewportWidth - EDGE_MARGIN_PX - TOOLTIP_WIDTH_PX, EDGE_MARGIN_PX)
      )

    const panel = panelRef.current?.getBoundingClientRect()
    if (panel && panel.width > 0) {
      const besideLeft = panel.left - TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX
      if (besideLeft >= EDGE_MARGIN_PX) {
        setTipCoords({ left: besideLeft, top: panel.top })
      } else {
        setTipCoords({
          left: clampLeft(panel.left),
          top: panel.bottom + TOOLTIP_GAP_PX,
        })
      }
      return
    }

    // Panel closed: centred under the 36px icon.
    setTipCoords({
      left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_WIDTH_PX / 2),
      top: rect.bottom + PANEL_OFFSET_PX,
    })
  }, [])

  function clearCollapseTimer() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
  }

  function clearSuccessTimer() {
    if (successTimer.current) {
      clearTimeout(successTimer.current)
      successTimer.current = null
    }
  }

  function clearHoverTimers() {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current)
      tooltipTimer.current = null
    }
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
  }

  /** Click / keyboard focus: open immediately, and dismiss the explainer — at that
   *  point the user has committed and the panel's own hint line takes over. */
  const open = useCallback(() => {
    clearCollapseTimer()
    clearHoverTimers()
    setTooltipShown(false)
    recompute()
    setExpanded(true)
  }, [recompute])

  /**
   * Hover on the SLOT: schedules the panel open. The explainer's own show/hide is
   * driven by hovering the icon itself (see the button's handlers), so it survives
   * the panel opening instead of being cut off by it.
   */
  const handleHoverEnter = useCallback(() => {
    clearCollapseTimer()
    if (expanded) return
    recompute()
    if (openTimer.current) return
    openTimer.current = setTimeout(() => {
      openTimer.current = null
      recompute()
      setExpanded(true)
    }, OPEN_DELAY_MS)
  }, [expanded, recompute])

  /** Pointer entered the icon: show the explainer and keep it up while it stays. */
  const handleIconEnter = useCallback(() => {
    if (tooltipTimer.current) return
    tooltipTimer.current = setTimeout(() => {
      tooltipTimer.current = null
      recomputeTip()
      setTooltipShown(true)
    }, TOOLTIP_DELAY_MS)
  }, [recomputeTip])

  /** Pointer left the icon: drop the explainer. The panel is unaffected. */
  const handleIconLeave = useCallback(() => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current)
      tooltipTimer.current = null
    }
    setTooltipShown(false)
  }, [])

  /**
   * Collapse only when nothing would be lost, and never instantly on hover-out —
   * see CLOSE_DELAY_MS. A mouse drifting out of a 384px panel mid-sentence must not
   * eat a paragraph, and travelling from the trigger to the panel must not close it.
   */
  const collapseNow = useCallback(() => {
    if (submitStateRef.current === 'saving') return
    if (draftRef.current.trim().length > 0) return
    if (panelRef.current?.contains(document.activeElement)) return
    setExpanded(false)
  }, [])

  const scheduleCollapse = useCallback(() => {
    // A pointer leaving before the open delay elapsed must not open the panel later.
    clearHoverTimers()
    setTooltipShown(false)
    clearCollapseTimer()
    collapseTimer.current = setTimeout(collapseNow, CLOSE_DELAY_MS)
  }, [collapseNow])

  /** Escape always collapses; the draft survives in state, so reopening restores it. */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      clearCollapseTimer()
      setExpanded(false)
      textareaRef.current?.blur()
    }
  }

  /**
   * A deliberate open (click / tap) should land the caret in the field.
   *
   * Focusing here as well as in the effect below is NOT redundant. On a mouse, the
   * pointer entering the slot fires `open()` before the click ever lands, so by
   * click time `expanded` is already true; `setExpanded(true)` is then a no-op, the
   * `[expanded]` effect never re-runs, and a flag-only approach silently drops the
   * focus request — which on the icon variant means the panel opens and every
   * keystroke goes nowhere. Focus now if the field is already mounted, and leave the
   * flag for the not-yet-mounted case (icon variant opened by tap, no hover first).
   */
  function handleTriggerClick() {
    focusOnOpen.current = true
    open()
    if (textareaRef.current) {
      focusOnOpen.current = false
      textareaRef.current.focus()
    }
  }

  // Keep the panel pinned to its trigger. ExplainerHover doesn't need this because
  // it closes on mouseleave; this panel stays open across scrolling and typing, and
  // without these listeners it visually detaches on the first scroll.
  useEffect(() => {
    if (!expanded) return
    const reposition = () => {
      recompute()
      recomputeTip()
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [expanded, recompute, recomputeTip])

  /**
   * Re-place the explainer once the panel has actually mounted (or unmounted): its
   * position depends on the panel's live rect, which does not exist until then.
   * Runs after commit, so panelRef is populated.
   */
  useEffect(() => {
    if (tooltipShown) recomputeTip()
  }, [tooltipShown, expanded, allowKindToggle, recomputeTip])

  // Outside mousedown closes, under the same "nothing would be lost" guard.
  useEffect(() => {
    if (!expanded) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (slotRef.current?.contains(target) || panelRef.current?.contains(target)) return
      // Same ref-based guard as collapseNow — a click elsewhere must not discard a
      // draft either. This one closes immediately: a click is unambiguous, unlike a
      // pointer travelling across the gap toward the panel.
      if (submitStateRef.current === 'saving' || draftRef.current.trim().length > 0) return
      clearCollapseTimer()
      setExpanded(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [expanded])

  // Focus only on a deliberate open (click / icon variant). A hover-open must NOT
  // steal focus — brushing the nav while typing elsewhere would yank the caret.
  useEffect(() => {
    if (expanded && focusOnOpen.current) {
      focusOnOpen.current = false
      textareaRef.current?.focus()
    }
  }, [expanded])

  useEffect(() => {
    return () => {
      clearCollapseTimer()
      clearSuccessTimer()
      clearHoverTimers()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitState('saving')
    setError(null)

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: draft,
          kind,
          pathname,
          pageLabel,
          viewportWidth: window.innerWidth,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(describeError(res.status, data.error))
        setSubmitState('error')
        return
      }

      // Deliberately NOT router.refresh(): this box lives in the layout, so a
      // refresh would remount the current page — including a mid-attempt
      // /student/assessment/[id]. Success is purely local state.
      setDraft('')
      setSubmitState('success')
      clearSuccessTimer()
      successTimer.current = setTimeout(() => {
        setExpanded(false)
        setSubmitState('idle')
      }, SUCCESS_COLLAPSE_MS)
    } catch {
      setError('Network problem — please try again.')
      setSubmitState('error')
    }
  }

  const panelClass = 'z-50 rounded-lg border border-gray-300 bg-white p-3 shadow-lg'

  const textareaClass = [
    'w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
    'placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200',
  ].join(' ')

  const explainerText =
    recipient === 'teacher'
      ? 'Send your teacher a comment or a question about the page you’re on. The page is attached automatically.'
      : 'Send the site administrator a comment about the page you’re on. The page is attached automatically.'

  return (
    <div
      ref={slotRef}
      // The slot keeps a fixed 36px box, so promoting the panel to position:fixed
      // causes no nav layout shift and needs no spacer element.
      className={['relative h-9 w-9 shrink-0', className].join(' ').trim()}
      onMouseEnter={handleHoverEnter}
      onMouseLeave={scheduleCollapse}
      onFocusCapture={open}
    >
      {/* The trigger stays mounted while the panel is open, so it never moves out
          from under the pointer. Rendering it only when collapsed meant hover
          expanded the panel, unmounted the button, and the click that followed hit
          empty space — the panel opened and every keystroke went nowhere. */}
      <button
        type="button"
        onClick={handleTriggerClick}
        // The explainer tracks hover on the ICON, not on the slot, so it lives and
        // dies with the pointer being on the button — independent of the panel.
        onMouseEnter={handleIconEnter}
        onMouseLeave={handleIconLeave}
        aria-label="Suggest an improvement"
        aria-expanded={expanded}
        aria-describedby={tooltipShown ? tooltipId : undefined}
        className={[
          'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
          expanded
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
            : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-indigo-600',
        ].join(' ')}
      >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

      {/* Hover explainer. Stays up for as long as the pointer is on the icon, panel
          open or not (owner's call — tying it to "panel not yet open" gave it ~330ms,
          too brief to read). `recomputeTip` keeps it clear of the panel.
          Hand-rolled rather than reusing ExplainerHover because that component has no
          way to be suppressed or repositioned once its own hover fires, so the two
          cards would stack. Same fixed-position technique, same nav-clipping reason. */}
      {tooltipShown && tipCoords && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            left: tipCoords.left,
            top: tipCoords.top,
            width: TOOLTIP_WIDTH_PX,
          }}
          className="z-50 block rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-lg"
        >
          <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Suggestion box
          </span>
          {explainerText}
        </span>
      )}

      {expanded && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          // Not role="dialog": this is non-modal with no focus trap, and a
          // non-modal dialog role misleads screen readers about escape and
          // focus-return semantics.
          aria-label="Suggestion box"
          style={
            coords
              ? { position: 'fixed', left: coords.left, top: coords.top, width: coords.width }
              : undefined
          }
          className={panelClass}
          onKeyDown={handleKeyDown}
          // Re-entering the panel cancels a pending hover-out collapse. Without this
          // the panel is unreachable by mouse — it hangs 8px below the nav, so the
          // pointer must cross a gap that belongs to neither element.
          onMouseEnter={clearCollapseTimer}
          onMouseLeave={scheduleCollapse}
        >
          <form onSubmit={handleSubmit} className="space-y-2">
            {expanded && allowKindToggle && (
              <fieldset className="flex items-center gap-1" id={kindGroupId}>
                <legend className="sr-only">What are you sending?</legend>
                {/* Real radios: arrow-key navigation, grouping, and screen-reader
                    semantics all come for free, unlike a pair of styled buttons. */}
                {(['COMMENT', 'QUESTION'] as const).map((k) => (
                  <label
                    key={k}
                    className={[
                      'cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      kind === k
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`${kindGroupId}-kind`}
                      value={k}
                      checked={kind === k}
                      onChange={() => setKind(k)}
                      className="sr-only"
                    />
                    {SUGGESTION_KIND_LABELS[k]}
                  </label>
                ))}
              </fieldset>
            )}

            {expanded && (
              <p id={hintId} className="text-xs text-gray-600">
                {/* Visible disclosure: the author can SEE that the page is being
                    captured, which is both a UX and a privacy affordance. */}
                {hint}: <span className="font-medium text-gray-800">{pageLabel}</span>
              </p>
            )}

            {/* This box is the ONLY place a student can type free prose, which
                makes it the only place data nobody designed for can arrive.
                Fla. Stat. § 1002.222(1)(a) forbids an education agency from
                retaining information on a student's political affiliation,
                voting history, or religious affiliation — the app collects none
                of those by design, but it cannot un-know something a student
                volunteers here. Asking first is cheaper than purging after, and
                for 7th-graders a plain reminder is a reasonable support. Paired
                with SUGGESTION_RETENTION_DAYS, which bounds how long anything
                unexpected can persist. */}
            {expanded && recipient === 'teacher' && (
              <p className="text-xs text-gray-600">
                Tell us about the app, not about yourself — no personal details please.
              </p>
            )}

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (submitState !== 'idle') setSubmitState('idle')
                if (error) setError(null)
              }}
              onClick={handleTriggerClick}
              rows={expanded ? 5 : 1}
              maxLength={SUGGESTION_MAX_BODY_CHARS}
              // Keep spellcheck on — the primary authors are 7th-graders.
              spellCheck
              placeholder={copy.placeholder}
              aria-label={allowKindToggle ? `Your ${SUGGESTION_KIND_LABELS[kind].toLowerCase()}` : 'Your suggestion'}
              aria-describedby={`${hintId} ${counterId} ${feedbackId}`}
              className={textareaClass}
            />

            {expanded && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {draft.length}/{SUGGESTION_MAX_BODY_CHARS}
                  </span>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitState === 'saving' ? 'Sending…' : 'Submit'}
                  </button>
                </div>

                {/* Counter announcements are gated: a live counter that fires on
                    every keystroke makes the field unusable with a screen reader. */}
                <span id={counterId} role="status" className="sr-only">
                  {remaining <= COUNTER_ANNOUNCE_THRESHOLD
                    ? `${remaining} characters remaining`
                    : ''}
                </span>

                <div id={feedbackId}>
                  {submitState === 'error' && error && (
                    <p role="alert" className="text-xs text-red-600">
                      {error}
                    </p>
                  )}
                  {submitState === 'success' && (
                    <p role="status" className="text-xs font-semibold text-green-700">
                      {copy.success}
                    </p>
                  )}
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
