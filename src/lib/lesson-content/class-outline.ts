/**
 * Per-class lesson outline reconciliation (ADR 0023).
 *
 * A class's effective module order lives in ONE ordered array
 * (ClassLessonOutline.orderedItemIds) mixing built-in LessonStep ids and
 * teacher-added ClassLessonStep ids. An ABSENT row means the class has
 * expressed no ordering opinion and sees the pristine built-in sequence —
 * which is what makes "behaviour is identical for a class that never
 * reordered" a structural property rather than a code path.
 *
 * Because the array holds ids with no referential integrity, it must be
 * reconciled against the live step list on every read: the seeder can add,
 * drop or renumber built-in steps at any time, and an admin can delete one.
 * The load-bearing requirement is that a NEWLY-SEEDED MID-LESSON STEP LANDS
 * MID-LIST, not at the end — a teacher who arranged their lesson should not
 * silently get next term's new material dumped after the debrief.
 *
 * Everything here is pure: no DB, no Date, no randomness. Reconciliation runs
 * in memory on every student read and never writes (a null saved order yields
 * `changed: false` by construction, so a student GET can never trigger a
 * teacher-scoped write). It is persisted in exactly two places: the teacher
 * reorder API, and the lesson builder's page load — where `inserted`/`dropped`
 * drive the "this lesson changed since you arranged it" banner.
 *
 * ⚠️ KNOWN LIMIT, inherited from ADR 0015: seeded step ids are POSITIONAL
 * (`lstep-SS7CG11-03`). If a content wave inserts a step mid-lesson in a seed
 * def, the ids from that point on keep existing but now point at different
 * content. No id-based reconciliation can detect that. `Lesson.structureEditedAt`
 * limits the blast radius; the teacher-facing banner and the "reset to the
 * original order" control are the mitigation.
 */

/**
 * Marks a ClassLessonStep id inside the shared ordering/rendering id space.
 *
 * A cuid is `[a-z0-9]` only, so ':' can never appear in a real LessonStep id —
 * the two namespaces are provably disjoint rather than heuristically distinct.
 * That matters in three places: the mission-progress route classifies an id
 * with a string check instead of probing both tables on the hottest student
 * write path; TrainingWalkthrough/ScenarioLab key their `attempted` sets on
 * step id; and a collision would silently render one step in place of another.
 */
export const CLASS_STEP_ID_PREFIX = 'cstep:'

/** Whether a step came from the seeded curriculum or from a teacher. */
export type StepOrigin = 'BUILTIN' | 'CLASS'

export const toClassStepViewId = (id: string): string => `${CLASS_STEP_ID_PREFIX}${id}`
export const isClassStepViewId = (id: string): boolean => id.startsWith(CLASS_STEP_ID_PREFIX)
export const fromClassStepViewId = (id: string): string => id.slice(CLASS_STEP_ID_PREFIX.length)

/** Where a class step sits relative to the built-in step it was added against. */
export type ClassStepAnchorPosition = 'BEFORE' | 'AFTER'

export interface ClassStepAnchorInfo {
  /** ALREADY PREFIXED (`cstep:<cuid>`). Callers prefix once, at the DB edge. */
  id: string
  /**
   * The built-in LessonStep this module was added against, or null to append
   * at the end. Never a class-step id — anchors cannot chain, so cycles are
   * impossible by construction.
   *
   * This is RECONSTRUCTION METADATA ONLY. Position is authoritative in the
   * saved order; the anchor is consulted only when this step is missing from
   * it (created on another device, outline never written because the teacher
   * never reordered, or the outline was reset).
   */
  anchorLessonStepId: string | null
  anchorPosition: ClassStepAnchorPosition
}

export interface ReconcileOutlineInput {
  /** Built-in step ids in CURRENT global sequenceOrder. Caller sorts. */
  builtInIds: readonly string[]
  /** This class's own steps in createdAt ASC — the deterministic tie-break. */
  classSteps: readonly ClassStepAnchorInfo[]
  /** ClassLessonOutline.orderedItemIds, or null when no row exists. */
  savedOrder: readonly string[] | null
}

export interface ReconcileOutlineResult {
  /** Every live id exactly once, in the order this class should see. */
  order: string[]
  /**
   * The reconciled order differs from what was saved. Callers MAY persist —
   * but only teacher-scoped ones. Always false when `savedOrder` is null.
   */
  changed: boolean
  /** Live ids absent from `savedOrder` — drives the teacher banner. */
  inserted: string[]
  /** Ids in `savedOrder` that no longer exist — drives the same banner. */
  dropped: string[]
}

/**
 * Splice a class step into `order` at its anchor.
 *
 * When several class steps share one anchor we step past the ones already
 * placed so they keep createdAt order; inserting each directly at the anchor
 * would silently reverse them.
 */
function spliceClassStep(order: string[], step: ClassStepAnchorInfo): void {
  if (!step.anchorLessonStepId) {
    order.push(step.id)
    return
  }
  const anchorAt = order.indexOf(step.anchorLessonStepId)
  if (anchorAt === -1) {
    // The anchor was deleted (the FK is SET NULL, but a stale in-memory view
    // can still reference it). Fall back to the end rather than dropping the
    // teacher's module.
    order.push(step.id)
    return
  }
  if (step.anchorPosition === 'BEFORE') {
    order.splice(anchorAt, 0, step.id)
    return
  }
  let insertAt = anchorAt + 1
  while (insertAt < order.length && isClassStepViewId(order[insertAt])) insertAt++
  order.splice(insertAt, 0, step.id)
}

/** The order a class with no saved opinion sees: built-ins, class steps spliced in. */
function buildDefaultOrder(
  builtInIds: readonly string[],
  classSteps: readonly ClassStepAnchorInfo[]
): string[] {
  const order = [...builtInIds]
  for (const step of classSteps) spliceClassStep(order, step)
  return order
}

/**
 * Re-insert a built-in step that the saved order doesn't know about, next to
 * the neighbours it has in the CURRENT global sequence.
 *
 * Scans backwards for the nearest preceding built-in that survived, then
 * forwards for the nearest following one. This is what keeps a step seeded
 * into the middle of a lesson in the middle of the teacher's list, and it
 * deliberately follows TEACHER intent rather than global index: if the teacher
 * moved step A to the front, a step newly seeded right after A globally lands
 * right after A where the teacher put it.
 */
function insertBuiltInAtNeighbourhood(
  order: string[],
  id: string,
  builtInIds: readonly string[]
): void {
  const k = builtInIds.indexOf(id)

  for (let i = k - 1; i >= 0; i--) {
    const at = order.indexOf(builtInIds[i])
    if (at === -1) continue
    // Step past built-ins already re-inserted at this same anchor in this
    // pass, so a run of adjacent new steps keeps its own relative order.
    let insertAt = at + 1
    while (insertAt < order.length) {
      const candidate = builtInIds.indexOf(order[insertAt])
      if (candidate !== -1 && candidate > i && candidate < k) {
        insertAt++
        continue
      }
      break
    }
    order.splice(insertAt, 0, id)
    return
  }

  for (let i = k + 1; i < builtInIds.length; i++) {
    const at = order.indexOf(builtInIds[i])
    if (at === -1) continue
    order.splice(at, 0, id)
    return
  }

  // No built-in survives in the order at all (e.g. the saved order was empty,
  // or held only class steps). Place in global order relative to any built-ins
  // already restored in this pass.
  let insertAt = 0
  while (insertAt < order.length) {
    const candidate = builtInIds.indexOf(order[insertAt])
    if (candidate !== -1 && candidate < k) {
      insertAt++
      continue
    }
    break
  }
  order.splice(insertAt, 0, id)
}

/**
 * Reconcile a class's saved module order against the live step list.
 *
 * Total and deterministic: same input always yields the same output, never
 * throws, never mutates its inputs. An empty saved order restores the full
 * built-in spine — order is NOT a hiding axis, so it can never be used (or
 * corrupted into) a way to blank a lesson.
 */
export function reconcileClassOutline(input: ReconcileOutlineInput): ReconcileOutlineResult {
  const { builtInIds, classSteps, savedOrder } = input

  if (savedOrder === null) {
    return {
      order: buildDefaultOrder(builtInIds, classSteps),
      changed: false,
      inserted: [],
      dropped: [],
    }
  }

  const live = new Set<string>([...builtInIds, ...classSteps.map((s) => s.id)])
  const dropped = savedOrder.filter((id) => !live.has(id))

  // Keep the saved order, minus anything that no longer exists; first
  // occurrence wins so a duplicated id can't render the same step twice.
  const placed = new Set<string>()
  const order: string[] = []
  for (const id of savedOrder) {
    if (!live.has(id) || placed.has(id)) continue
    placed.add(id)
    order.push(id)
  }

  // Built-ins first (they define the neighbourhoods class steps anchor to).
  // `filter` preserves global sequence order, which the neighbourhood scan
  // depends on for runs of adjacent new steps.
  for (const id of builtInIds) {
    if (placed.has(id)) continue
    insertBuiltInAtNeighbourhood(order, id, builtInIds)
    placed.add(id)
  }

  for (const step of classSteps) {
    if (placed.has(step.id)) continue
    spliceClassStep(order, step)
    placed.add(step.id)
  }

  const wasSaved = new Set(savedOrder)
  const inserted = order.filter((id) => !wasSaved.has(id))
  const changed =
    order.length !== savedOrder.length || order.some((id, i) => id !== savedOrder[i])

  return { order, changed, inserted, dropped }
}
