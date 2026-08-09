'use client'

/**
 * AccommodationPrefsProvider
 *
 * Carries the display accommodations (ACC-CHUNK, ACC-T2-VOCAB) from the student
 * layout — which already loads the student's active accommodation codes — down
 * to `StimulusDisplay`, which is mounted from five different places
 * (AssessmentPlayer, LessonStepRenderer, ScenarioLab, SourceDecoderMission, and
 * the standalone Source Lab page).
 *
 * A context rather than props: threading two booleans through five component
 * chains would touch a lot of unrelated code and be easy to drop on the next new
 * mount site. A context makes forgetting impossible — a new caller inherits the
 * accommodation automatically.
 *
 * No flash-of-unaccommodated-content: the value is computed in the RSC layout and
 * serialised into the first render, so chunking is on from the first paint rather
 * than switching on after hydration.
 *
 * The default is deliberately "no accommodations". `StimulusDisplay` is also
 * rendered by the teacher lesson walkthrough, which sits outside the student
 * layout and has no student to resolve — it must keep working, showing the
 * unaccommodated view an unaccommodated student would see.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { NO_DISPLAY_PREFS, type DisplayPrefs } from '@/lib/accommodations'

const AccommodationPrefsContext = createContext<DisplayPrefs>(NO_DISPLAY_PREFS)

export function AccommodationPrefsProvider({
  prefs,
  children,
}: {
  prefs: DisplayPrefs
  children: ReactNode
}) {
  return (
    <AccommodationPrefsContext.Provider value={prefs}>
      {children}
    </AccommodationPrefsContext.Provider>
  )
}

/** Display accommodations for the current student; all-false outside the student layout. */
export function useAccommodationPrefs(): DisplayPrefs {
  return useContext(AccommodationPrefsContext)
}
