/**
 * Lesson-step content resolution (lesson content editor + ADR 0023).
 *
 * Sibling to visibility.ts, not a modification of it — the existing, tested
 * `resolveVisibleSteps` path is untouched. A class can independently:
 *   - hide/show a step (existing ADR 0015 visibility axis)
 *   - override a step's title/content (content axis)
 *   - add its own steps and reorder the whole list (ADR 0023)
 * The first two facts live on the same ClassLessonStepVisibility row and
 * compose independently: a step can be globally enabled but hidden for class A
 * while also carrying a content override that only matters for class B.
 *
 * `resolveClassLessonSteps` is the single choke point that turns
 * (built-in steps + overrides + class steps + saved order) into the final
 * ordered, visible, content-resolved list a class sees. Pure so jest covers it
 * without DB infra; callers fetch the inputs via getClassStepOverrideMap /
 * getClassLessonSteps / getClassLessonOutline (src/lib/lesson-media).
 */

import { reconcileClassOutline, type ClassStepAnchorInfo, type StepOrigin } from './class-outline'

export interface StepOverride {
  /** null = no visibility opinion for this class; inherit the step's global `enabled`. */
  visible: boolean | null
  /** null = inherit the step's global title. */
  overrideTitle: string | null
  /** null = inherit the step's global content. */
  overrideContent: string | null
}

/**
 * THE per-step content rule, factored out so the legacy and class-aware
 * resolvers cannot drift. Visibility is applied by the callers because they
 * filter before mapping.
 */
function applyOverride<T extends { id: string; title: string; content: string }>(
  step: T,
  override: StepOverride | undefined
): T {
  if (!override) return step
  return {
    ...step,
    title: override.overrideTitle ?? step.title,
    content: override.overrideContent ?? step.content,
  }
}

/**
 * Resolve the effective (title, content) a class sees for each step: filter
 * by visibility first (a class-hidden step's content override never
 * surfaces), then substitute title/content for any surviving step that
 * carries an override. Order is preserved.
 *
 * Superseded by `resolveClassLessonSteps` on the student mission path, but
 * kept exported and behaviourally identical — several teacher surfaces and its
 * own unit suite depend on this exact shape.
 */
export function resolveEffectiveSteps<
  T extends { id: string; enabled: boolean; title: string; content: string },
>(steps: T[], overrides: ReadonlyMap<string, StepOverride>): T[] {
  return steps
    .filter((s) => overrides.get(s.id)?.visible ?? s.enabled)
    .map((s) => applyOverride(s, overrides.get(s.id)))
}

/** A seeded LessonStep row, as far as resolution is concerned. */
export interface BuiltInStepInput {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
  enabled: boolean
}

/** A teacher-added ClassLessonStep row. `id` is already `cstep:`-prefixed. */
export interface ClassStepInput extends ClassStepAnchorInfo {
  stepType: string
  title: string
  content: string
  required: boolean
  /** The teacher's own hide switch for their own module. */
  visible: boolean
}

/** One module in a class's effective lesson, ready to render. */
export interface ResolvedStep {
  /** Built-in: the raw LessonStep id. Class: `cstep:<cuid>`. */
  id: string
  origin: StepOrigin
  stepType: string
  title: string
  content: string
  /**
   * 1-based POSITION in this class's effective list — recomputed, not the raw
   * DB value, so hidden steps no longer leave gaps (1,2,4,5). Nothing on the
   * student path renders it; the teacher surfaces that display a step number
   * read raw DB rows instead.
   */
  sequenceOrder: number
  required: boolean
  /**
   * Always false on the student path — hidden modules are filtered out there.
   * Only ever true when a caller passed `includeHidden`, i.e. the teacher's
   * builder, which must show a hidden module in order to offer "show again".
   */
  hidden: boolean
  /** True when this class replaced the built-in title/content. */
  edited: boolean
}

export interface ResolveClassLessonInput {
  /** Seeded steps, sorted by sequenceOrder ASC. */
  builtInSteps: readonly BuiltInStepInput[]
  overrides: ReadonlyMap<string, StepOverride>
  /** Teacher modules, sorted by createdAt ASC. Omit → today's behaviour exactly. */
  classSteps?: readonly ClassStepInput[]
  /** ClassLessonOutline.orderedItemIds. Omit/null → today's order exactly. */
  savedOrder?: readonly string[] | null
  /**
   * TEACHER SURFACES ONLY. Keep hidden modules in the list, flagged, so the
   * builder can render them greyed with a "show again" control. Never set this
   * on a student path — it would show students content their teacher hid.
   */
  includeHidden?: boolean
}

/**
 * The student-facing resolution: order, visibility and content overrides in
 * one pass.
 *
 * With no class steps and no saved order this is element-wise identical to
 * `resolveEffectiveSteps` — the reconciler returns the built-in ids verbatim,
 * the visibility predicate is the same expression, and the content
 * substitution is the same `applyOverride`. That equivalence is pinned by a
 * unit test so the two can never silently diverge.
 */
export function resolveClassLessonSteps(input: ResolveClassLessonInput): ResolvedStep[] {
  const classSteps = input.classSteps ?? []
  const savedOrder = input.savedOrder ?? null

  const { order } = reconcileClassOutline({
    builtInIds: input.builtInSteps.map((s) => s.id),
    classSteps,
    savedOrder,
  })

  const builtInById = new Map(input.builtInSteps.map((s) => [s.id, s]))
  const classById = new Map(classSteps.map((s) => [s.id, s]))

  const resolved: ResolvedStep[] = []
  for (const id of order) {
    const builtIn = builtInById.get(id)
    if (builtIn) {
      const override = input.overrides.get(builtIn.id)
      // Identical predicate to resolveEffectiveSteps.
      const visible = override?.visible ?? builtIn.enabled
      if (!visible && !input.includeHidden) continue
      const effective = applyOverride(builtIn, override)
      resolved.push({
        id: effective.id,
        origin: 'BUILTIN',
        stepType: effective.stepType,
        title: effective.title,
        content: effective.content,
        sequenceOrder: resolved.length + 1,
        required: effective.required,
        hidden: !visible,
        edited: Boolean(override?.overrideTitle || override?.overrideContent),
      })
      continue
    }

    const classStep = classById.get(id)
    // An id in the order that matches neither table is stale; skip rather than
    // throw, matching how parseStepContent degrades malformed content.
    if (!classStep) continue
    if (!classStep.visible && !input.includeHidden) continue
    resolved.push({
      id: classStep.id,
      origin: 'CLASS',
      stepType: classStep.stepType,
      title: classStep.title,
      content: classStep.content,
      sequenceOrder: resolved.length + 1,
      required: classStep.required,
      hidden: !classStep.visible,
      edited: false,
    })
  }

  return resolved
}
