'use client'

/**
 * Reusable read-aloud pill (Web Speech API) — extracted from NoteView so every
 * media view (video description, image long description, diagram/infographic
 * summaries) offers the same affordance. Renders nothing when the browser has
 * no speech synthesis.
 */

import { useCallback, useEffect, useState } from 'react'

export function ReadAloudButton({ text, label = 'Read aloud' }: { text: string; label?: string }) {
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

  if (!hasSpeech) return null

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
