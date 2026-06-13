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
      ? 'underline decoration-blue-500 decoration-dotted cursor-help'
      : 'underline decoration-orange-500 decoration-dotted cursor-help'

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
            'w-56 rounded-md shadow-lg border text-sm p-2',
            'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600',
            'text-gray-800 dark:text-gray-100',
          ].join(' ')}
        >
          <span
            className={[
              'block text-xs font-semibold mb-0.5',
              tier === 'TIER_2' ? 'text-blue-600' : 'text-orange-600',
            ].join(' ')}
          >
            {tier === 'TIER_2' ? 'Academic term' : 'Civics term'}
          </span>
          {definition}
          {l1Definition && (
            <span className="mt-1.5 block border-t border-gray-100 pt-1.5 dark:border-gray-700">
              <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400">
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
