'use client'

/**
 * SourceDecoderMission
 *
 * Renders a single Source Decoder level mission with the appropriate
 * activity widget, scaffolding hint, and completion flow.
 *
 * Activity types:
 *   HIGHLIGHT_ANSWER   — Click a sentence in the passage to highlight it
 *   PARAPHRASE_CLAIM   — Two textareas: claim + evidence
 *   AUTHOR_PURPOSE     — Radio selectors: purpose + stated/implied
 *   COMPARE_SOURCES    — Two textareas: agreement + disagreement
 *
 * At this phase, completion is ungraded — any submission triggers onComplete.
 * Graded Source Decoder is a Phase 9+ concern.
 *
 * Spec reference: Section 16.4, Audit 7 item 8
 */

import { useState } from 'react'
import type { SourceDecoderMission as MissionDef } from '@/lib/reading-load'
import { StimulusDisplay } from '@/components/reading-load/StimulusDisplay'

interface SourceDecoderMissionProps {
  mission: MissionDef
  isCompleted: boolean
  /** True if the prerequisite level has not been completed */
  isLocked: boolean
  /** Optional stimulus passage to work with */
  stimulusContent?: string
  /** Called when the student submits the activity */
  onComplete: () => void
}

export function SourceDecoderMission({
  mission,
  isCompleted,
  isLocked,
  stimulusContent,
  onComplete,
}: SourceDecoderMissionProps) {
  if (isLocked) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6 text-center">
        <div className="text-3xl mb-2">🔒</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Complete Level {mission.level - 1} to unlock this mission.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
      {/* Mission header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Source Decoder · Level {mission.level}
          </span>
          {isCompleted && (
            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
              ✓ Completed
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold mt-1 text-gray-900 dark:text-gray-100">
          {mission.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {mission.objective}
        </p>
      </div>

      {/* Stimulus passage (if provided) — rendered with read-aloud + chunking */}
      {stimulusContent && (
        <StimulusDisplay
          stimulusId={`source-decoder-l${mission.level}`}
          title="Passage"
          content={stimulusContent}
          resolvedLevel={2}
          fromVariant={false}
          glossaryAnnotations={[]}
        />
      )}

      {/* Instructions */}
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {mission.instructions}
      </p>

      {/* Activity widget */}
      <ActivityWidget
        mission={mission}
        isCompleted={isCompleted}
        onComplete={onComplete}
      />

      {/* Scaffolding hint */}
      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline select-none">
          💡 Need a hint?
        </summary>
        <p className="mt-2 pl-4 border-l-2 border-blue-200 text-gray-600 dark:text-gray-400">
          {mission.scaffoldingHint}
        </p>
      </details>
    </div>
  )
}

// ── Activity widgets ───────────────────────────────────────────────────────

function ActivityWidget({
  mission,
  isCompleted,
  onComplete,
}: {
  mission: MissionDef
  isCompleted: boolean
  onComplete: () => void
}) {
  switch (mission.activityType) {
    case 'HIGHLIGHT_ANSWER':
      return (
        <HighlightAnswerWidget
          isCompleted={isCompleted}
          onComplete={onComplete}
        />
      )
    case 'PARAPHRASE_CLAIM':
      return (
        <ParaphraseClaimWidget
          isCompleted={isCompleted}
          onComplete={onComplete}
        />
      )
    case 'AUTHOR_PURPOSE':
      return (
        <AuthorPurposeWidget
          isCompleted={isCompleted}
          onComplete={onComplete}
        />
      )
    case 'COMPARE_SOURCES':
      return (
        <CompareSourcesWidget
          isCompleted={isCompleted}
          onComplete={onComplete}
        />
      )
    default:
      return null
  }
}

// Level 1: Highlight a sentence
function HighlightAnswerWidget({
  isCompleted,
  onComplete,
}: {
  isCompleted: boolean
  onComplete: () => void
}) {
  const [selected, setSelected] = useState(false)

  if (isCompleted) {
    return <CompletedBadge />
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Click the sentence in the passage above that best answers the question.
        (In the full app, sentences will be individually selectable.)
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected(true)}
          className={[
            'px-3 py-1.5 text-sm rounded-md border transition-colors',
            selected
              ? 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 dark:bg-gray-800 dark:text-gray-300',
          ].join(' ')}
        >
          {selected ? '✓ Sentence selected' : 'Select a sentence'}
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={onComplete}
          className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  )
}

// Level 2: Paraphrase claim + evidence
function ParaphraseClaimWidget({
  isCompleted,
  onComplete,
}: {
  isCompleted: boolean
  onComplete: () => void
}) {
  const [claim, setClaim] = useState('')
  const [evidence, setEvidence] = useState('')

  if (isCompleted) return <CompletedBadge />

  const canSubmit = claim.trim().length > 0 && evidence.trim().length > 0

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          The author&apos;s claim (in your own words):
        </label>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          rows={2}
          className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="The author argues that…"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Evidence from the passage:
        </label>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          rows={2}
          className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="The passage says…"
        />
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onComplete}
        className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </div>
  )
}

// Level 3: Author's purpose
function AuthorPurposeWidget({
  isCompleted,
  onComplete,
}: {
  isCompleted: boolean
  onComplete: () => void
}) {
  const [purpose, setPurpose] = useState<string | null>(null)
  const [conclusionType, setConclusionType] = useState<string | null>(null)

  if (isCompleted) return <CompletedBadge />

  const canSubmit = purpose !== null && conclusionType !== null

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          The author&apos;s purpose:
        </legend>
        <div className="flex flex-wrap gap-2">
          {['To inform', 'To persuade', 'To explain'].map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="purpose"
                value={opt}
                checked={purpose === opt}
                onChange={() => setPurpose(opt)}
                className="text-blue-600"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          The conclusion is:
        </legend>
        <div className="flex gap-4">
          {['Stated directly', 'Implied'].map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="conclusion"
                value={opt}
                checked={conclusionType === opt}
                onChange={() => setConclusionType(opt)}
                className="text-blue-600"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onComplete}
        className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </div>
  )
}

// Level 4: Compare sources
function CompareSourcesWidget({
  isCompleted,
  onComplete,
}: {
  isCompleted: boolean
  onComplete: () => void
}) {
  const [agreement, setAgreement] = useState('')
  const [disagreement, setDisagreement] = useState('')

  if (isCompleted) return <CompletedBadge />

  const canSubmit = agreement.trim().length > 0 && disagreement.trim().length > 0

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          One thing both authors agree on:
        </label>
        <textarea
          value={agreement}
          onChange={(e) => setAgreement(e.target.value)}
          rows={2}
          className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Both authors agree that…"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          One thing they disagree about:
        </label>
        <textarea
          value={disagreement}
          onChange={(e) => setDisagreement(e.target.value)}
          rows={2}
          className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="They disagree about…"
        />
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onComplete}
        className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </div>
  )
}

function CompletedBadge() {
  return (
    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-md px-3 py-2">
      <span className="text-lg">✅</span>
      <span className="text-sm font-medium">You completed this level!</span>
    </div>
  )
}
