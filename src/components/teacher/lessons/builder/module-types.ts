/**
 * Teacher-facing vocabulary for lesson module types (ADR 0023).
 *
 * The single source of truth, replacing the two duplicated TYPE_LABELS maps in
 * LessonEditorWorkspace.tsx and LessonPreview.tsx — they were already separate
 * copies of the same list, which is how such lists drift.
 *
 * The names here are what a 7th-grade civics teacher would call these things,
 * not the enum values. "INTERACTIVE_CHECK" is a schema fact; "Quick check" is
 * what the teacher is making.
 */

import type { TrackIconName } from '@/components/ui/TrackIcon'
import {
  blankDraft,
  blankTimelineDraft,
  toPayload,
  type DraftValue,
} from '../editors/blocks/block-draft'

/**
 * TIMELINE is not a LessonStepType — it is a NOTE whose content parses as the
 * timeline visual-organizer schema. Surfacing it as its own choice matters:
 * today it is reachable only as a mode toggle buried inside the plain-text
 * editor, where no teacher will ever find it.
 */
export type ModuleTypeKey =
  | 'NOTE'
  | 'VIDEO'
  | 'IMAGE'
  | 'INTERACTIVE_CHECK'
  | 'VOCABULARY'
  | 'WORKED_EXAMPLE'
  | 'TIMELINE'
  | 'SOURCE_ANALYSIS'
  | 'DIAGRAM'
  | 'INFOGRAPHIC'

export interface ModuleTypeMeta {
  key: ModuleTypeKey
  /** The LessonStepType actually stored. */
  stepType: string
  name: string
  blurb: string
  icon: TrackIconName
  /** Shown as a card up front, vs. behind "More module types". */
  featured: boolean
  /** Rough authoring effort, so a teacher can pick by how much time they have. */
  effort: string
}

/**
 * Ordered by what a teacher actually reaches for, not by enum order.
 *
 * DISCUSSION is deliberately absent: it renders on no student surface (see
 * gating.ts) and no seeded lesson uses it. Offering a module type that
 * silently shows students nothing is worse than not offering it at all.
 */
export const MODULE_TYPES: readonly ModuleTypeMeta[] = [
  {
    key: 'NOTE',
    stepType: 'NOTE',
    name: 'Text I write',
    blurb: 'Your own explanation, instructions, or reading. The most flexible one.',
    icon: 'book',
    featured: true,
    effort: 'about 2 min',
  },
  {
    key: 'VIDEO',
    stepType: 'VIDEO',
    name: 'YouTube video',
    blurb:
      'Paste a YouTube link. Students tap to play — nothing loads from YouTube until they do.',
    icon: 'flame',
    featured: true,
    effort: 'about 1 min',
  },
  {
    key: 'IMAGE',
    stepType: 'IMAGE',
    name: 'Picture',
    blurb: 'A photo, map, or drawing. Upload one, paste a link, or pick from the library.',
    icon: 'star',
    featured: true,
    effort: 'about 5 min',
  },
  {
    key: 'INTERACTIVE_CHECK',
    stepType: 'INTERACTIVE_CHECK',
    name: 'Quick check',
    // Says "never graded" on purpose: these checks really are ungraded and
    // client-local (ADR 0013), and a teacher who assumes otherwise will be
    // rightly annoyed later.
    blurb:
      'One multiple-choice question with feedback for every answer. Practice only — never graded.',
    icon: 'target',
    featured: true,
    effort: 'about 5 min',
  },
  {
    key: 'VOCABULARY',
    stepType: 'VOCABULARY',
    name: 'Key term',
    blurb: "One word and what it means, added to this mission's word list.",
    icon: 'search',
    featured: true,
    effort: 'about 1 min',
  },
  {
    key: 'WORKED_EXAMPLE',
    stepType: 'WORKED_EXAMPLE',
    name: 'Worked example',
    blurb: 'Show your thinking step by step, then give the answer.',
    icon: 'compass',
    featured: true,
    effort: 'about 5 min',
  },
  {
    key: 'TIMELINE',
    stepType: 'NOTE',
    name: 'Timeline',
    blurb: 'Dated events in order, or a cause-and-effect chain.',
    icon: 'flag',
    featured: false,
    effort: 'about 5 min',
  },
  {
    key: 'SOURCE_ANALYSIS',
    stepType: 'SOURCE_ANALYSIS',
    name: 'Document study',
    blurb: 'A primary-source passage with 1–4 guiding questions.',
    icon: 'shield',
    featured: false,
    effort: 'about 10 min',
  },
  {
    key: 'DIAGRAM',
    stepType: 'DIAGRAM',
    name: 'Diagram',
    blurb:
      'A process, cycle, Venn, or side-by-side comparison — built from text, so it reads aloud.',
    icon: 'map',
    featured: false,
    effort: 'about 8 min',
  },
  {
    key: 'INFOGRAPHIC',
    stepType: 'INFOGRAPHIC',
    name: 'Fact panel',
    blurb: 'Big numbers, quick facts, and quotes in one panel.',
    icon: 'bolt',
    featured: false,
    effort: 'about 8 min',
  },
]

/**
 * Everything a MODULE can start as.
 *
 * There used to be a `featured` split with the rest behind a "More module
 * types" link — which hid Timeline, Document study, Diagram and Fact panel
 * where a teacher would never find them. The `featured` flag is retained on the
 * data only as ordering intent; nothing filters on it any more.
 */
export const ALL_MODULE_TYPES = MODULE_TYPES

/**
 * Everything a PIECE inside a module can be — content only.
 *
 * Quick check and Document study are absent by design: content and questions
 * are separate entities, so a question is always its own module. That is what
 * keeps "does this module stop the student until they answer?" answerable from
 * outside the module, and keeps gating.ts free of block awareness.
 *
 * Key term is absent for a different reason: VOCABULARY is a PLACEMENT, not a
 * content shape — those modules render in the Key Terms panel rather than in
 * Guided Training, and that routing is decided by the module's step type. A
 * "key term" piece inside a training module would just be text under a
 * misleading label.
 */
const NON_BLOCK_MODULE_KEYS: readonly ModuleTypeKey[] = [
  'INTERACTIVE_CHECK',
  'SOURCE_ANALYSIS',
  'VOCABULARY',
]

export const CONTENT_BLOCK_TYPES: readonly ModuleTypeMeta[] = MODULE_TYPES.filter(
  (m) => !NON_BLOCK_MODULE_KEYS.includes(m.key)
)

/** The block `type` discriminant stored for each option. */
export const BLOCK_TYPE_BY_KEY: Record<string, string> = {
  NOTE: 'text',
  TIMELINE: 'timeline',
  IMAGE: 'image',
  VIDEO: 'video',
  DIAGRAM: 'diagram',
  INFOGRAPHIC: 'infographic',
  WORKED_EXAMPLE: 'worked-example',
}

/**
 * Teacher-facing label for a stored step type.
 *
 * A stored NOTE can be plain text or a timeline; the caller passes the parsed
 * kind when it knows, so a timeline module reads "Timeline" in the list rather
 * than the generic text label.
 */
export function moduleTypeLabel(stepType: string, parsedKind?: string): string {
  // A module holding several pieces is described by that fact, not by whatever
  // step type it happens to be stored on.
  if (parsedKind === 'composite') return 'Several pieces'
  if (stepType === 'NOTE' && parsedKind === 'timeline') return 'Timeline'
  const match = MODULE_TYPES.find((m) => m.stepType === stepType && m.key !== 'TIMELINE')
  if (match) return match.name
  // DISCUSSION and anything added to the enum later still get a readable label.
  return stepType.charAt(0) + stepType.slice(1).toLowerCase().replace(/_/g, ' ')
}

export function moduleTypeIcon(stepType: string, parsedKind?: string): TrackIconName {
  if (parsedKind === 'composite') return 'sparkle'
  if (stepType === 'NOTE' && parsedKind === 'timeline') return 'flag'
  return MODULE_TYPES.find((m) => m.stepType === stepType && m.key !== 'TIMELINE')?.icon ?? 'book'
}

/**
 * The starting DRAFT for a newly added module of each kind.
 *
 * Derived from `blankDraft` rather than hand-written a second time. There used
 * to be a parallel `blankPayloadFor` here that was serialized and handed to the
 * editor as `initialContent`; because a blank payload can never satisfy its own
 * schema, parsing it back always fell out of `parseStepContent`'s text
 * fallback, so every newly added module opened either showing raw JSON or
 * flying a "content didn't match the expected shape" banner. Passing a draft
 * removes the round trip entirely.
 */
export function blankDraftFor(key: ModuleTypeKey): DraftValue {
  if (key === 'TIMELINE') return blankTimelineDraft()
  const meta = MODULE_TYPES.find((m) => m.key === key)
  return blankDraft(meta?.stepType ?? 'NOTE')
}

/** The payload shape of a blank module — kept in step with the draft above. */
export function blankPayloadFor(key: ModuleTypeKey): unknown {
  return toPayload(blankDraftFor(key))
}
