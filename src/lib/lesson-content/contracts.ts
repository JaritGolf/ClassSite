/**
 * Lesson-content contracts (ADR 0013).
 *
 * Structured LessonStep types (WORKED_EXAMPLE, INTERACTIVE_CHECK,
 * SOURCE_ANALYSIS) and authored RemediationItem content store JSON in their
 * `content` column. These zod schemas are the single source of truth for that
 * shape: the seed shape-tests validate every authored row parses, and the
 * renderers parse through here with a plain-text fallback so legacy rows and
 * simple notes always render.
 *
 * Lesson interactive checks are ungraded formative self-checks — client-local,
 * never persisted, no mastery impact (scoping recorded in ADR 0013).
 */

import { z } from 'zod'

// ── Building blocks ───────────────────────────────────────────────────────────

export const CheckOptionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
  feedback: z.string().min(1),
})
export type CheckOption = z.infer<typeof CheckOptionSchema>

const exactlyOneCorrect = (options: CheckOption[]) =>
  options.filter((o) => o.correct).length === 1

export const InteractiveCheckSchema = z.object({
  question: z.string().min(1),
  options: z
    .array(CheckOptionSchema)
    .length(4)
    .refine(exactlyOneCorrect, { message: 'exactly one option must be correct' }),
})
export type InteractiveCheckContent = z.infer<typeof InteractiveCheckSchema>

export const WorkedExampleSchema = z.object({
  problem: z.string().min(1),
  /** 3–5 expert reasoning steps per spec §18; allow 2–8 for authoring latitude. */
  thinkAloud: z.array(z.string().min(1)).min(2).max(8),
  answer: z.string().min(1),
  whyItWorks: z.string().min(1),
})
export type WorkedExampleContent = z.infer<typeof WorkedExampleSchema>

export const SourceAnalysisSchema = z.object({
  sourceTitle: z.string().min(1),
  sourceAttribution: z.string().min(1),
  passage: z.string().min(1),
  guidingQuestions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z
          .array(CheckOptionSchema)
          .min(3)
          .max(4)
          .refine(exactlyOneCorrect, { message: 'exactly one option must be correct' }),
      })
    )
    .min(1)
    .max(4),
})
export type SourceAnalysisContent = z.infer<typeof SourceAnalysisSchema>

// ── Remediation reteach content (spec §14: examples + non-examples) ──────────

export const RemediationContentSchema = z
  .object({
    concept: z.string().min(1),
    examples: z
      .array(
        z.object({
          text: z.string().min(1),
          isExample: z.boolean(),
          explanation: z.string().min(1),
        })
      )
      .min(4),
    tryIt: InteractiveCheckSchema.optional(),
  })
  .refine((c) => c.examples.filter((e) => e.isExample).length >= 2, {
    message: 'at least 2 examples required',
  })
  .refine((c) => c.examples.filter((e) => !e.isExample).length >= 2, {
    message: 'at least 2 non-examples required',
  })
export type RemediationContent = z.infer<typeof RemediationContentSchema>

// ── Step parsing (discriminated union with plain-text fallback) ──────────────

export type ParsedStepContent =
  | { kind: 'text'; text: string }
  | ({ kind: 'worked-example' } & WorkedExampleContent)
  | ({ kind: 'interactive-check' } & InteractiveCheckContent)
  | ({ kind: 'source-analysis' } & SourceAnalysisContent)

function tryJson(content: string): unknown | undefined {
  try {
    return JSON.parse(content)
  } catch {
    return undefined
  }
}

/**
 * Parse a LessonStep's `content` for its `stepType`. Structured types fall back
 * to `{ kind: 'text' }` when the content is not valid JSON for their schema, so
 * a malformed or legacy row degrades to readable text instead of breaking the
 * mission flow (and never gates progression — see gating.ts).
 */
export function parseStepContent(stepType: string, content: string): ParsedStepContent {
  const json = tryJson(content)
  if (json !== undefined) {
    if (stepType === 'WORKED_EXAMPLE') {
      const r = WorkedExampleSchema.safeParse(json)
      if (r.success) return { kind: 'worked-example', ...r.data }
    }
    if (stepType === 'INTERACTIVE_CHECK') {
      const r = InteractiveCheckSchema.safeParse(json)
      if (r.success) return { kind: 'interactive-check', ...r.data }
    }
    if (stepType === 'SOURCE_ANALYSIS') {
      const r = SourceAnalysisSchema.safeParse(json)
      if (r.success) return { kind: 'source-analysis', ...r.data }
    }
  }
  return { kind: 'text', text: content }
}

/** Parse authored remediation content; null → render as legacy plain text. */
export function parseRemediationContent(content: string): RemediationContent | null {
  const json = tryJson(content)
  if (json === undefined) return null
  const r = RemediationContentSchema.safeParse(json)
  return r.success ? r.data : null
}
