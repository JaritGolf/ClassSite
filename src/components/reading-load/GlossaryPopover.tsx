'use client'

/**
 * GlossaryPopover
 *
 * Wraps a word or phrase in the stimulus text and shows a definition
 * card on hover (mouse) and tap (mobile). Keyboard-accessible via focus.
 *
 * Tier-2 terms (academic verbs): blue underline.
 * Tier-3 terms (civics-specific):  orange underline.
 *
 * Spec reference: Section 16.2, Audit 7 item 7
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'

/** Display names for L1 gloss languages. */
const L1_LABEL: Record<string, string> = { es: 'Español', ht: 'Kreyòl' }

interface GlossaryPopoverProps {
  /** The glossary term's definition */
  definition: string
  /** Whether this is a tier-2 (academic) or tier-3 (civics) term */
  tier: 'TIER_2' | 'TIER_3'
  /** Approved first-language gloss, when available for the active language */
  l1Definition?: string
  /** Language code of the L1 gloss (e.g. 'es', 'ht') */
  l1Language?: string
  /** The text content (the word/phrase) that triggers the popover */
  children: ReactNode
}

export function GlossaryPopover({ definition, tier, l1Definition, l1Language, children }: GlossaryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popoverId = useRef(`glossary-${Math.random().toString(36).slice(2)}`)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const underlineClass =
    tier === 'TIER_2'
      ? 'underline decoration-blue-500 decoration-dotted decoration-2 underline-offset-2 cursor-help rounded-sm hover:bg-blue-50'
      : 'underline decoration-orange-500 decoration-dotted decoration-2 underline-offset-2 cursor-help rounded-sm hover:bg-orange-50'

  return (
    <span className="relative inline">
      <span
        ref={triggerRef}
        className={underlineClass}
        role="button"
        tabIndex={0}
        aria-describedby={isOpen ? popoverId.current : undefined}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen((v) => !v)
          }
          if (e.key === 'Escape') setIsOpen(false)
        }}
      >
        {children}
      </span>

      {isOpen && (
        <span
          ref={popoverRef}
          id={popoverId.current}
          role="tooltip"
          className={[
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
            'w-60 rounded-2xl border-2 p-3 text-sm leading-relaxed shadow-card animate-pop-in',
            'bg-white text-gray-800',
            tier === 'TIER_2' ? 'border-blue-200' : 'border-orange-200',
          ].join(' ')}
        >
          <span
            className={[
              'mb-0.5 block font-display text-xs font-bold uppercase tracking-wide',
              tier === 'TIER_2' ? 'text-blue-700' : 'text-orange-700',
            ].join(' ')}
          >
            {tier === 'TIER_2' ? 'Academic term' : 'Civics term'}
          </span>
          {definition}
          {l1Definition && (
            <span className="mt-1.5 block border-t border-gray-100 pt-1.5">
              <span className="block font-display text-xs font-bold uppercase tracking-wide text-emerald-700">
                {(l1Language && L1_LABEL[l1Language]) || 'L1'}
              </span>
              <span lang={l1Language}>{l1Definition}</span>
            </span>
          )}
        </span>
      )}
    </span>
  )
}
