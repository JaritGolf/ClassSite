'use client'

/**
 * StimulusDisplay
 *
 * Renders a stimulus passage with three optional accessibility features:
 *   1. Read-aloud (Web Speech API) — Audit 7 item 5
 *   2. Sentence-chunking toggle (persisted in localStorage) — Audit 7 item 6
 *   3. Tier-2 vocabulary glossary popovers — Audit 7 item 7
 *
 * Also supports opt-up/opt-down reading level switching when available.
 *
 * Level 3 content: no glossary popovers (raw passage, no scaffolding per spec 16.2).
 *
 * Spec reference: Section 16, Audit 7 items 4–7
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { GlossaryPopover } from './GlossaryPopover'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { GlossaryAnnotation } from '@/lib/reading-load'

interface StimulusDisplayProps {
  stimulusId: string
  title: string
  content: string
  resolvedLevel: number
  fromVariant: boolean
  glossaryAnnotations: GlossaryAnnotation[]
  /** Levels for which approved content exists (enables opt-up/opt-down) */
  availableLevels?: number[]
  onLevelChange?: (newLevel: number) => void
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Simplified',
  2: 'Standard',
  3: 'Original Source',
}

const CHUNKING_KEY = 'civics-quest:sentence-chunking'

export function StimulusDisplay({
  title,
  content,
  resolvedLevel,
  glossaryAnnotations,
  availableLevels,
  onLevelChange,
}: StimulusDisplayProps) {
  const [chunkingEnabled, setChunkingEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load chunking preference from localStorage on mount
  useEffect(() => {
    try {
      setChunkingEnabled(localStorage.getItem(CHUNKING_KEY) === 'true')
    } catch {
      // localStorage may be unavailable (private browsing, etc.)
    }
  }, [])

  // Persist chunking preference
  useEffect(() => {
    try {
      localStorage.setItem(CHUNKING_KEY, String(chunkingEnabled))
    } catch {
      // Silently ignore
    }
  }, [chunkingEnabled])

  // Detect Web Speech API availability (client-side only)
  useEffect(() => {
    setHasSpeechSupport(
      typeof window !== 'undefined' && 'speechSynthesis' in window
    )
  }, [])

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const toggleReadAloud = useCallback(() => {
    if (!hasSpeechSupport) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(content)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }, [hasSpeechSupport, isSpeaking, content])

  // ── Render content with glossary popovers (levels 1 & 2) ──────────────

  function renderContent(): React.ReactNode {
    const textToRender = chunkingEnabled ? chunkContent(content) : content

    // Level 3 = raw passage, no glossary popovers
    if (resolvedLevel >= 3 || glossaryAnnotations.length === 0) {
      if (chunkingEnabled) {
        return (
          <div className="space-y-1">
            {chunkContent(content).map((sentence, i) => (
              <span key={i} className="block">
                {sentence}
              </span>
            ))}
          </div>
        )
      }
      return <p className="whitespace-pre-wrap">{content}</p>
    }

    // Build annotated segments
    if (chunkingEnabled) {
      return (
        <div className="space-y-1">
          {chunkContent(content).map((sentence, i) => (
            <span key={i} className="block">
              {renderAnnotatedText(sentence, glossaryAnnotations)}
            </span>
          ))}
        </div>
      )
    }

    return (
      <p className="whitespace-pre-wrap">
        {renderAnnotatedText(content, glossaryAnnotations)}
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-gray-800">
            {title}
          </h3>
          <ExplainerHover
            title="Reading Level"
            text="How this passage is presented — Simplified (paraphrased with glossary help), Standard (chunked excerpt, matches the real EOC), or Original Source (the raw historical text)."
            variant="plain"
          >
            <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {LEVEL_LABELS[resolvedLevel] ?? `Level ${resolvedLevel}`}
            </span>
          </ExplainerHover>
        </div>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Read-aloud button */}
          {hasSpeechSupport && (
            <ExplainerHover
              title={isSpeaking ? 'Stop' : 'Read Aloud'}
              text="Have this passage read out loud by your device. Click again to stop."
              variant="plain"
            >
              <button
                type="button"
                aria-label={isSpeaking ? 'Stop reading' : 'Read passage aloud'}
                onClick={toggleReadAloud}
                className={[
                  'rounded-full border-2 px-2.5 py-1 text-sm font-semibold transition-colors',
                  isSpeaking
                    ? 'border-sky-300 bg-sky-100 text-sky-800'
                    : 'border-amber-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50',
                ].join(' ')}
              >
                {isSpeaking ? '⏹' : '🔊'}
              </button>
            </ExplainerHover>
          )}

          {/* Sentence-chunking toggle */}
          <ExplainerHover
            title="Sentence Chunking"
            text="Break the passage into one sentence per line, so it's easier to read one idea at a time."
            variant="plain"
          >
            <button
              type="button"
              aria-pressed={chunkingEnabled}
              aria-label={chunkingEnabled ? 'Disable sentence chunking' : 'Enable sentence chunking'}
              onClick={() => setChunkingEnabled((v) => !v)}
              className={[
                'rounded-full border-2 px-2.5 py-1 text-sm font-semibold transition-colors',
                chunkingEnabled
                  ? 'border-green-300 bg-green-100 text-green-800'
                  : 'border-amber-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50',
              ].join(' ')}
            >
              ¶
            </button>
          </ExplainerHover>
        </div>
      </div>

      {/* Level switcher (opt-up/opt-down) */}
      {availableLevels && availableLevels.length > 1 && onLevelChange && (
        <div className="flex gap-1.5" role="group" aria-label="Reading level">
          {availableLevels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              disabled={lvl === resolvedLevel}
              onClick={() => onLevelChange(lvl)}
              className={[
                'rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition-colors',
                lvl === resolvedLevel
                  ? 'cursor-default border-indigo-600 bg-indigo-600 text-white'
                  : 'border-amber-200 bg-white text-gray-700 hover:border-indigo-400',
              ].join(' ')}
            >
              {LEVEL_LABELS[lvl] ?? `Level ${lvl}`}
            </button>
          ))}
        </div>
      )}

      {/* Passage content */}
      <div className="max-w-prose text-base leading-7 text-gray-800">
        {renderContent()}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Split text into sentence chunks at sentence-ending punctuation. */
function chunkContent(text: string): string[] {
  // Split on '. ', '? ', '! ' — but keep the punctuation with the preceding sentence
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Interleave plain text segments with GlossaryPopover components.
 * Scans the text for each annotation's matchText and wraps matches.
 * Exported for reuse by lesson-note rendering (LessonStepRenderer).
 */
export function renderAnnotatedText(
  text: string,
  annotations: GlossaryAnnotation[]
): React.ReactNode[] {
  if (annotations.length === 0) return [text]

  // Build one combined regex alternation from all matchTexts
  // Escape each term for safety
  const escaped = annotations.map((a) =>
    a.matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )

  let regex: RegExp
  try {
    regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  } catch {
    return [text]
  }

  const parts = text.split(regex)
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue

    const annotation = annotations.find(
      (a) => a.matchText.toLowerCase() === part.toLowerCase()
    )

    if (annotation) {
      nodes.push(
        <GlossaryPopover
          key={i}
          definition={annotation.definition}
          tier={annotation.tier}
          l1Definition={annotation.l1Definition}
          l1Language={annotation.l1Language}
        >
          {part}
        </GlossaryPopover>
      )
    } else {
      nodes.push(part)
    }
  }

  return nodes
}
