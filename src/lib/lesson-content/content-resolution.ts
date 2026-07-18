/**
 * Lesson-step content resolution (lesson content editor).
 *
 * Sibling to visibility.ts, not a modification of it — the existing, tested
 * `resolveVisibleSteps` path is untouched. A class can independently:
 *   - hide/show a step (existing ADR 0015 visibility axis)
 *   - override a step's title/content (this feature's content axis)
 * Both facts live on the same ClassLessonStepVisibility row, but the two
 * axes compose independently: a step can be globally enabled but hidden for
 * class A while carrying a content override that only matters for class B.
 * Pure so jest covers it without DB infra; callers fetch the override map via
 * getClassStepOverrideMap (src/lib/lesson-media/index.ts).
 */

export interface StepOverride {
  /** null = no visibility opinion for this class; inherit the step's global `enabled`. */
  visible: boolean | null
  /** null = inherit the step's global title. */
  overrideTitle: string | null
  /** null = inherit the step's global content. */
  overrideContent: string | null
}

/**
 * Resolve the effective (title, content) a class sees for each step: filter
 * by visibility first (a class-hidden step's content override never
 * surfaces), then substitute title/content for any surviving step that
 * carries an override. Order is preserved.
 */
export function resolveEffectiveSteps<
  T extends { id: string; enabled: boolean; title: string; content: string },
>(steps: T[], overrides: ReadonlyMap<string, StepOverride>): T[] {
  return steps
    .filter((s) => overrides.get(s.id)?.visible ?? s.enabled)
    .map((s) => {
      const o = overrides.get(s.id)
      if (!o) return s
      return {
        ...s,
        title: o.overrideTitle ?? s.title,
        content: o.overrideContent ?? s.content,
      }
    })
}
