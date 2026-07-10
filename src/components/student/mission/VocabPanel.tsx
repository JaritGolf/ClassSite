'use client'

/**
 * Key Terms Unlock (spec §10.4 step 3).
 *
 * Shows the benchmark's approved tier-3 Term records as definition cards
 * (with the student's L1 gloss when one is approved and active — Phase 16
 * pipeline), followed by the lesson's VOCABULARY steps (terms used in
 * context sentences).
 */

import { LessonStepRenderer, type LessonStepView } from './LessonStepRenderer'

export interface TermView {
  term: string
  definition: string
  relatedVocab: string | null
  l1Definition?: string
  l1Language?: string
}

const L1_LABELS: Record<string, string> = { es: 'Español', ht: 'Kreyòl Ayisyen' }

interface VocabPanelProps {
  terms: TermView[]
  vocabSteps: LessonStepView[]
  onContinue: () => void
}

export function VocabPanel({ terms, vocabSteps, onContinue }: VocabPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Key Terms Unlock</h2>
        <p className="text-sm text-gray-600">
          Learn these words first — they unlock everything else in this mission.
        </p>
      </div>

      {terms.length > 0 && (
        <ul className="space-y-2">
          {terms.map((t) => (
            <li key={t.term} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{t.term}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-orange-100 text-orange-700 px-2 py-0.5">
                  Civics term
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{t.definition}</p>
              {t.l1Definition && t.l1Language && (
                <p className="mt-1 text-sm leading-relaxed text-indigo-800" lang={t.l1Language}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mr-1">
                    {L1_LABELS[t.l1Language] ?? t.l1Language}:
                  </span>
                  {t.l1Definition}
                </p>
              )}
              {t.relatedVocab && (
                <p className="mt-1 text-xs text-gray-600">Related: {t.relatedVocab}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {vocabSteps.map((step) => (
        <div key={step.id} className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-2">
            {step.title}
          </p>
          <LessonStepRenderer step={step} />
        </div>
      ))}

      {terms.length === 0 && vocabSteps.length === 0 && (
        <p className="text-sm text-gray-600">
          Review the key terms for this benchmark before diving into training.
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        Terms Unlocked — Continue
      </button>
    </div>
  )
}
