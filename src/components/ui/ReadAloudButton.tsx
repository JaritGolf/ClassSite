'use client'

/**
 * Reusable read-aloud pill (Web Speech API) — extracted from NoteView so every
 * media view (video description, image long description, diagram/infographic
 * summaries) offers the same affordance. Renders nothing when the browser has
 * no speech synthesis.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Suppress the per-piece buttons inside a composite module.
 *
 * A composite can hold a paragraph, a picture and a diagram, each of which
 * renders its own read-aloud today — so one screen would sprout several
 * buttons that all drive ONE speech queue. Worse, this component cancels
 * `speechSynthesis` globally on unmount, so any one of them unmounting stops
 * another's playback, and `onend` never fires for the interrupted one, leaving
 * it stuck showing "Stop".
 *
 * A composite therefore wraps its pieces in this provider and renders a single
 * button that reads the whole module in order — which is also what a student
 * actually wants.
 */
const SuppressReadAloud = createContext(false)

export function ReadAloudSuppressed({ children }: { children: ReactNode }) {
  return <SuppressReadAloud.Provider value={true}>{children}</SuppressReadAloud.Provider>
}

export function ReadAloudButton({ text, label = 'Read aloud' }: { text: string; label?: string }) {
  const suppressed = useContext(SuppressReadAloud)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)

  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  const toggle = useCallback(() => {
    if (!hasSpeech) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }, [hasSpeech, isSpeaking, text])

  if (!hasSpeech || suppressed) return null

  return (
    <button
      type="button"
      aria-label={isSpeaking ? 'Stop reading' : `${label}: read this aloud`}
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors ${
        isSpeaking
          ? 'border-sky-300 bg-sky-100 text-sky-800'
          : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50'
      }`}
    >
      <span aria-hidden="true">{isSpeaking ? '⏹' : '🔊'}</span>
      {isSpeaking ? 'Stop' : label}
    </button>
  )
}
