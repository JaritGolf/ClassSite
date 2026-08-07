'use client'

/**
 * Renders the right per-type editor for a draft.
 *
 * Lifted verbatim out of StepContentEditor, which already switched on
 * `draft.kind` rather than on the step type — so the same function serves a
 * whole module's content and a single block inside a composite module, with no
 * logic change. The eight per-type editors are pure controlled components
 * (`value` / `onChange` / `errors`) that render no heading and no save button,
 * which is what makes them reusable at both levels.
 */

import { VideoStepEditor } from '../VideoStepEditor'
import { ImageStepEditor } from '../ImageStepEditor'
import { DiagramStepEditor } from '../DiagramStepEditor'
import { InfographicStepEditor } from '../InfographicStepEditor'
import { WorkedExampleStepEditor } from '../WorkedExampleStepEditor'
import { InteractiveCheckStepEditor } from '../InteractiveCheckStepEditor'
import { SourceAnalysisStepEditor } from '../SourceAnalysisStepEditor'
import { PlainTextStepEditor } from '../PlainTextStepEditor'
import type { DraftValue } from './block-draft'

export function DraftEditor({
  draft,
  onChange,
  errors,
  /**
   * Whether the plain-text editor may switch itself into timeline mode.
   * Only true for a whole NOTE module: inside a composite, "text" and
   * "timeline" are two distinct block types, so letting a text block mutate
   * itself into a timeline would silently invalidate its own block label.
   */
  allowTimeline,
}: {
  draft: DraftValue
  onChange: (draft: DraftValue) => void
  errors: Record<string, string>
  allowTimeline: boolean
}) {
  switch (draft.kind) {
    case 'VIDEO':
      return (
        <VideoStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'VIDEO', data })}
          errors={errors}
        />
      )
    case 'IMAGE':
      return (
        <ImageStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'IMAGE', data })}
          errors={errors}
        />
      )
    case 'DIAGRAM':
      return (
        <DiagramStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'DIAGRAM', data })}
          errors={errors}
        />
      )
    case 'INFOGRAPHIC':
      return (
        <InfographicStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'INFOGRAPHIC', data })}
          errors={errors}
        />
      )
    case 'WORKED_EXAMPLE':
      return (
        <WorkedExampleStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'WORKED_EXAMPLE', data })}
          errors={errors}
        />
      )
    case 'INTERACTIVE_CHECK':
      return (
        <InteractiveCheckStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'INTERACTIVE_CHECK', data })}
          errors={errors}
        />
      )
    case 'SOURCE_ANALYSIS':
      return (
        <SourceAnalysisStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'SOURCE_ANALYSIS', data })}
          errors={errors}
        />
      )
    case 'PLAIN_TEXT':
      return (
        <PlainTextStepEditor
          value={draft.data}
          onChange={(data) => onChange({ kind: 'PLAIN_TEXT', data })}
          errors={errors}
          allowTimeline={allowTimeline}
        />
      )
  }
}
