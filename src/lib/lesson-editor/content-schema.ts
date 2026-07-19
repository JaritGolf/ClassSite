/**
 * Server-side content validation for the lesson content editor.
 *
 * Reuses the EXACT zod schemas from src/lib/lesson-content/contracts.ts that
 * already validate/parse this content on the read path — zero
 * reimplementation, so a write can never accept a shape the reader would
 * reject. Unlike the read path (`parseStepContent`, which degrades malformed
 * content to plain text so a bad row never breaks the mission), WRITES are
 * always rejected outright — a broken edit must never reach the DB.
 *
 * `LessonStep.title` (the step-list label) and a content schema's OWN
 * `title` field (e.g. VideoContent.title, the video's on-screen title) are
 * different concepts — this module only validates/serializes the CONTENT
 * payload; callers (edit.ts) handle the step/override title separately.
 */

import { z, type ZodIssue } from 'zod'
import {
  VideoSchema,
  ImageSchema,
  DiagramSchema,
  InfographicSchema,
  WorkedExampleSchema,
  InteractiveCheckSchema,
  SourceAnalysisSchema,
  TimelineSchema,
} from '@/lib/lesson-content'
import { assertYoutubeVideoExists } from './youtube'

export class LessonEditorValidationError extends Error {
  constructor(public readonly issues: ZodIssue[]) {
    super('Lesson step content failed validation')
    this.name = 'LessonEditorValidationError'
  }
}

const PlainTextSchema = z.object({ text: z.string().min(1) })

/** NOTE accepts plain text OR the optional timeline visual-organizer shape. */
const NoteSchema = z.union([PlainTextSchema, TimelineSchema])

export const EDITABLE_STEP_TYPES = [
  'VIDEO',
  'NOTE',
  'INTERACTIVE_CHECK',
  'DISCUSSION',
  'WORKED_EXAMPLE',
  'VOCABULARY',
  'SOURCE_ANALYSIS',
  'IMAGE',
  'DIAGRAM',
  'INFOGRAPHIC',
] as const
export type EditableStepType = (typeof EDITABLE_STEP_TYPES)[number]

export function isEditableStepType(stepType: string): stepType is EditableStepType {
  return (EDITABLE_STEP_TYPES as readonly string[]).includes(stepType)
}

/**
 * Validate a raw content payload against its stepType's schema and serialize
 * it into the string `LessonStep.content` (and `ClassLessonStepVisibility.
 * overrideContent`) expect: JSON for structured types, plain text for
 * NOTE-as-text/VOCABULARY/DISCUSSION. Throws LessonEditorValidationError on
 * any schema mismatch. For VIDEO, additionally verifies the YouTube id
 * actually exists (see youtube.ts) — folded in here so every caller (global
 * edit + class-scope override) gets the check for free from one call site.
 */
export async function validateAndSerializeStepContent(
  stepType: string,
  raw: unknown
): Promise<string> {
  if (!isEditableStepType(stepType)) {
    throw new LessonEditorValidationError([
      {
        code: 'custom',
        path: [],
        message: `Unknown or non-editable step type: ${stepType}`,
      } as ZodIssue,
    ])
  }

  switch (stepType) {
    case 'VIDEO': {
      const result = VideoSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      await assertYoutubeVideoExists(result.data.youtubeId)
      return JSON.stringify(result.data)
    }
    case 'IMAGE': {
      const result = ImageSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return JSON.stringify(result.data)
    }
    case 'DIAGRAM': {
      const result = DiagramSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return JSON.stringify(result.data)
    }
    case 'INFOGRAPHIC': {
      const result = InfographicSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return JSON.stringify(result.data)
    }
    case 'WORKED_EXAMPLE': {
      const result = WorkedExampleSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return JSON.stringify(result.data)
    }
    case 'INTERACTIVE_CHECK': {
      const result = InteractiveCheckSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return JSON.stringify(result.data)
    }
    case 'SOURCE_ANALYSIS': {
      const result = SourceAnalysisSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return JSON.stringify(result.data)
    }
    case 'NOTE': {
      const result = NoteSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return 'kind' in result.data ? JSON.stringify(result.data) : result.data.text
    }
    case 'VOCABULARY':
    case 'DISCUSSION': {
      const result = PlainTextSchema.safeParse(raw)
      if (!result.success) throw new LessonEditorValidationError(result.error.issues)
      return result.data.text
    }
  }
}
