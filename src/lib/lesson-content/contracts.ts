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

/**
 * Visual organizer for NOTE steps: a vertical timeline or cause-effect chain
 * (dual coding — spec §31.2 "visual organizers"). `marker` is the left-column
 * label (a year like "1215" or a chain label like "Cause"); `connector`
 * renders arrows between events for cause-effect chains.
 */
export const TimelineSchema = z.object({
  kind: z.literal('timeline'),
  intro: z.string().optional(),
  connector: z.enum(['line', 'arrow']).default('line'),
  events: z
    .array(
      z.object({
        marker: z.string().min(1).max(24),
        label: z.string().min(1),
        detail: z.string().optional(),
      })
    )
    .min(3)
    .max(8),
})
export type TimelineContent = z.infer<typeof TimelineSchema>

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

// ── Rich media steps (ADR 0015) ──────────────────────────────────────────────
// Dedicated step types (VIDEO/IMAGE/DIAGRAM/INFOGRAPHIC) carry structured JSON
// in `content`, like WORKED_EXAMPLE. Every schema REQUIRES a text equivalent
// (description/alt+longDescription/summary) — the read-aloud target and the
// guaranteed accessible content when the visual can't be perceived.

/**
 * Click-to-load YouTube facade (ADR 0015 rule-#9 compromise): only the
 * 11-char video id is stored — never a URL — and nothing is requested from
 * Google until the student presses play.
 */
export const VideoSchema = z.object({
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'must be an 11-char YouTube video id'),
  title: z.string().min(1),
  /** Always-visible text alternative: what the video covers (read-aloud target). */
  description: z.string().min(20),
  durationLabel: z.string().max(12).optional(),
  /** Motivation line shown on the facade ("Watch for how the colonists…"). */
  whyWatch: z.string().optional(),
  startSeconds: z.number().int().nonnegative().optional(),
})
export type VideoContent = z.infer<typeof VideoSchema>

/**
 * An illustration or public-domain photograph. `asset` is either
 * `svg:<registry-key>` (authored SVG scene, src/components/ui/illustrations)
 * or a self-hosted `/media/...` path under public/. Photos require intrinsic
 * dimensions (layout-shift guard) and carry credit/license for attribution.
 */
export const ImageSchema = z
  .object({
    asset: z
      .string()
      .regex(/^(svg:[a-z0-9-]+|\/media\/[a-z0-9][a-z0-9/._-]*)$/i, 'svg:<key> or /media/<path>'),
    alt: z.string().min(1).max(300),
    caption: z.string().min(1),
    credit: z.string().min(1),
    license: z.string().min(1),
    /** Rich description behind a "Describe this image" disclosure (read-aloud). */
    longDescription: z.string().min(40),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .refine((i) => !i.asset.startsWith('/media/') || (i.width && i.height), {
    message: 'photo assets require intrinsic width/height',
  })
export type ImageContent = z.infer<typeof ImageSchema>

const DiagramNodeSchema = z.object({
  label: z.string().min(1).max(60),
  detail: z.string().optional(),
})
const diagramBase = {
  title: z.string().min(1),
  /** Full-text equivalent of the diagram — always rendered, read-aloud target. */
  summary: z.string().min(40),
}

/** Semantic-HTML concept diagrams: process flow, repeating cycle, venn, 2-column comparison. */
export const DiagramSchema = z.discriminatedUnion('variant', [
  z.object({
    variant: z.literal('flow'),
    ...diagramBase,
    nodes: z.array(DiagramNodeSchema).min(2).max(6),
  }),
  z.object({
    variant: z.literal('cycle'),
    ...diagramBase,
    nodes: z.array(DiagramNodeSchema).min(3).max(6),
  }),
  z.object({
    variant: z.literal('venn'),
    ...diagramBase,
    left: z.object({ label: z.string().min(1), items: z.array(z.string().min(1)).min(1).max(5) }),
    right: z.object({ label: z.string().min(1), items: z.array(z.string().min(1)).min(1).max(5) }),
    shared: z.object({ label: z.string().min(1), items: z.array(z.string().min(1)).min(1).max(5) }),
  }),
  z.object({
    variant: z.literal('comparison'),
    ...diagramBase,
    columns: z
      .array(
        z.object({
          heading: z.string().min(1),
          items: z.array(z.string().min(1)).min(2).max(6),
        })
      )
      .length(2),
  }),
])
export type DiagramContent = z.infer<typeof DiagramSchema>

/** Stat-and-fact panel: big numbers, icon facts, quotes. */
export const InfographicSchema = z.object({
  title: z.string().min(1),
  intro: z.string().optional(),
  /** Full-text equivalent of the infographic — always rendered, read-aloud target. */
  summary: z.string().min(40),
  blocks: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('big-number'),
          value: z.string().min(1).max(12),
          label: z.string().min(1),
          detail: z.string().optional(),
        }),
        z.object({
          type: z.literal('fact'),
          /** TrackIconName; renderer falls back to 'star' for unknown names. */
          icon: z.string().min(1),
          text: z.string().min(1),
          detail: z.string().optional(),
        }),
        z.object({
          type: z.literal('quote'),
          text: z.string().min(1),
          attribution: z.string().min(1),
        }),
      ])
    )
    .min(2)
    .max(8),
})
export type InfographicContent = z.infer<typeof InfographicSchema>

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
  | ({ kind: 'timeline' } & Omit<TimelineContent, 'kind'>)
  | ({ kind: 'video' } & VideoContent)
  | ({ kind: 'image' } & ImageContent)
  | { kind: 'diagram'; diagram: DiagramContent }
  | { kind: 'infographic'; infographic: InfographicContent }

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
 *
 * NOTE steps are plain text UNLESS the content is valid timeline JSON
 * (`{"kind":"timeline",...}`) — the visual-organizer variant of a note.
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
    if (stepType === 'VIDEO') {
      const r = VideoSchema.safeParse(json)
      if (r.success) return { kind: 'video', ...r.data }
    }
    if (stepType === 'IMAGE') {
      const r = ImageSchema.safeParse(json)
      if (r.success) return { kind: 'image', ...r.data }
    }
    if (stepType === 'DIAGRAM') {
      const r = DiagramSchema.safeParse(json)
      if (r.success) return { kind: 'diagram', diagram: r.data }
    }
    if (stepType === 'INFOGRAPHIC') {
      const r = InfographicSchema.safeParse(json)
      if (r.success) return { kind: 'infographic', infographic: r.data }
    }
    if (stepType === 'NOTE') {
      const r = TimelineSchema.safeParse(json)
      if (r.success) {
        const { kind: _kind, ...rest } = r.data
        return { kind: 'timeline', ...rest }
      }
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
