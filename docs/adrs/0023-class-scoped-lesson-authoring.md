# ADR 0023 — Class-scoped lesson authoring

**Status:** Accepted
**Date:** 2026-08-06
**Supersedes/extends:** ADR 0015 (lesson rich media + per-class visibility)

This ADR also **retroactively documents the lesson content editor**, which shipped earlier
undocumented — `prisma/schema.prisma` carried an `ADR TBD — lesson content editor` marker, now
resolved to this ADR, and `src/lib/lesson-editor/edit.ts` had no ADR reference at all.

---

## Context

The platform shipped a fixed curriculum. All 36 SS.7.CG missions and their lessons come from
`seed/`, and a teacher's only levers were:

- hiding four **media** step types (VIDEO / IMAGE / DIAGRAM / INFOGRAPHIC), per class or globally
- rewriting an existing step's title/content for one class

The owner — a classroom teacher — asked for full, intuitive control over what their own students
see: adding their own material to any module, creating modules, and arranging the lesson the way
they teach it.

The blocker was stated explicitly in `src/lib/lesson-editor/structure.ts`:

> "Structural changes affect every class/student, unlike a class-scoped content override, so this
> stays global by design (no per-class step lists)."

Add/remove/reorder existed, but only for ADMIN and only globally. **This ADR removes that
limitation** by giving per-class step lists a real home.

## Decision

### 1. Teacher modules live in their own table, not in `LessonStep`

`ClassLessonStep` (class-owned) rather than a nullable `classId` on `LessonStep`.

`lesson.steps` is read **unfiltered** by the student mission page, the teacher pages, the admin
page and the seeder. A nullable discriminator would require `where: { classId: null }` at every
one of those sites, and a single omission leaks one period's module into another's mission. A
separate table also means the seeder's `deleteMany({ lessonId, id: { notIn: keptIds } })` pass can
never reach teacher content, and no global surface has to learn it exists.

### 2. Order lives in `ClassLessonOutline`, not on the override row

One row per `(class, lesson)` holding an ordered array of ids, mixing built-in `LessonStep` ids
and `cstep:`-prefixed `ClassLessonStep` ids. **An absent row means "no ordering opinion"**, which
makes "a class that never reordered behaves exactly as before" a structural property rather than a
code path.

The rejected alternative was a `classSequence` column on `ClassLessonStepVisibility`. It fails on
that table's own invariant: `pruneOrUpdateOverrideRow` deletes a row once `visible`,
`overrideTitle` and `overrideContent` are all null, so **pressing "Reset to original" on a
module's content would silently delete the teacher's ordering.** It also files a lesson-level fact
on a step-level table and turns one `UPDATE` into N.

### 3. The anchor is reconstruction metadata, not position

`ClassLessonStep.anchorLessonStepId` / `anchorPosition` are consulted **only** when a module is
missing from the saved order. That buys "a new module lands where the teacher put it, not at the
end" without touching `ClassLessonStepVisibility` at all.

The FK is **`SET NULL`, not `CASCADE`** — the seeder dropping the anchor step must never take a
teacher's own module with it.

### 4. Reconciliation is pure and runs on every read

`reconcileClassOutline` (`src/lib/lesson-content/class-outline.ts`) filters the saved order to
live ids, re-inserts missing built-ins **at their natural neighbourhood**, and splices missing
class modules at their anchors. The load-bearing requirement is that a newly-seeded **mid-lesson**
step lands mid-list, not after the debrief.

It never writes on a student read (`changed === false` by construction when there is no saved
order). It persists in exactly two places: the reorder API and the builder's page load.

### 5. One resolver, one visibility predicate

`resolveClassLessonSteps` is the single choke point turning
(built-in steps + overrides + class modules + saved order) into what a class sees.
`resolveEffectiveSteps` remains exported and behaviourally identical; both delegate the per-step
content rule to one shared `applyOverride`, so they cannot drift. An equivalence test pins that a
class with nothing of its own gets element-wise identical output.

**One intentional divergence:** `sequenceOrder` is now list position, so hidden modules no longer
leave gaps (`1,2,4,5`). Nothing on the student path renders it.

### 6. Class-scoped hiding widens to every module type; the global switch does not

`getToggleableStep` split into `getStepForGlobalToggle` (media only — that flag is site-wide) and
`getStepForClassVisibility` (any type). A class-scoped hide is local, reversible and never mutates
shared content, so "I teach the source analysis on paper" is legitimate.

One **hard floor**: a class may not hide its last visible Guided Training module, which would
collapse the mission to pre-check → quiz. Enforced by running the *proposed* state through the
same resolver and `trainingStepsOf` the student path uses — not a reimplemented predicate. A
teacher's own modules count toward the floor.

Everything else (hiding all vocabulary, all source analysis) is a warning, not a block: an empty
bucket renders a benign fallback rather than breaking.

### 7. `DISCUSSION` is omitted from the teacher picker

It is a valid `LessonStepType`, both editors offer it, and `gating.ts` buckets it **nowhere** — it
renders on no student surface. `grep -rn DISCUSSION seed/` finds zero rows. Offering a module type
that silently shows students nothing is worse than not offering it. Making it render is a content
decision for a separate change.

### 8. Pasting an image link fetches and re-hosts, server-side

The CSP is `img-src 'self' data: blob:` and `ImageSchema.asset` only accepts `svg:<key>` or
`/media/<path>`, so hotlinking cannot render — and would be wrong anyway, because it would make
every student's browser contact a third-party server. `POST /api/lessons/media/import-url` fetches
once, validates, and stores the bytes exactly like a direct upload.

That makes the server fetch a user-supplied URL, so the guard set
(`src/lib/media-upload/ip-guard.ts`, `fetch-remote-image.ts`) is load-bearing and **re-applied on
every redirect hop**: https only, port 443 only, no credentials, no IP literals, DNS resolution
with every returned address required to be public, connection pinned to the validated address
(closing the DNS-rebind window), ≤3 redirects, 5s/10s timeouts, streaming 4 MB cap, magic bytes
authoritative, and errors that carry a code and nothing else.

IPv4-mapped and NAT64 IPv6 addresses are **unwrapped and re-checked against the IPv4 rules** —
otherwise `::ffff:169.254.169.254` reaches cloud metadata.

### 9. Resume pointers anchor to a built-in step in the same bucket

`StudentProgress.currentStepId` is an FK to `LessonStep`, so a teacher module can never be written
to it. `withResumeAnchors` gives each module the nearest preceding **built-in step in its own
bucket**.

"In the same bucket" is not a detail: `MissionFlow` resolves the pointer with
`trainingSteps.findIndex(...)`, so an anchor drawn from the whole lesson could name a VOCABULARY
step, resolve to `-1`, and silently restart the student's training.

`/api/mission/progress` also gained an explicit `cstep:` branch. It must **not** 404 — the early
return would skip the `studentProgress.upsert`, leaving a student whose first training module is
teacher-added with no progress row at all, no `IN_PROGRESS`, and no `recordLastActivity`. The
client's `.catch(() => {})` would hide it completely.

`SavedFlowState` gained an **optional** `trainingStepId` while staying `v: 1`, so resume survives a
module being inserted ahead of a student without invalidating saved state.

### 10. Three pages became two

The builder at `/teacher/lessons/[code]` absorbs the old visibility-preview page and the old
`/edit` page (now a redirect). Those were split by **capability** — hiding a video and rewording
it were different pages for the same module — which is an implementation fact, not something a
teacher thinks about.

The walkthrough survives as "Preview as a student" because it is a different **mode** (linear,
9-phase, gated), not a fourth capability.

## Consequences

- Teacher content is **reseed-safe by construction**: no seed stage references either new table.
  No `structureEditedAt`-style guard is needed.
- Editing is class-scoped, so the shipped curriculum stays pristine and two teachers cannot
  overwrite each other's lessons.
- **Positional seed ids remain a known limit** (inherited from ADR 0015): seeded step ids encode
  position (`lstep-SS7CG11-03`), so a content wave inserting a step mid-def shifts ids onto
  different content and no id-based reconciliation can detect it. `Lesson.structureEditedAt` limits
  the blast radius; the "this lesson changed" banner and the reset-order control are the
  mitigation.
- `ClassLessonStepVisibility` keeps a name narrower than its contract (it carries visibility AND
  content). Deliberately not renamed: a `@@map` rename touches every call site for no user-visible
  benefit. Its doc comment is the contract.
- `ScopeSwitcher` was **not** deleted, contrary to the original plan — the admin workspace still
  uses it. Only the teacher path moved to `ClassScopeBar`.
- The site-wide media kill-switch was **kept reachable** from the builder. The page that hosted it
  was replaced, and dropping it would have silently removed a capability.

## Rejected alternatives

| Option | Why not |
|---|---|
| Nullable `classId` on `LessonStep` | Six unfiltered read sites; one missed `where` leaks a module across periods |
| `classSequence` on `ClassLessonStepVisibility` | "Reset to original" would silently wipe the teacher's ordering |
| A second FK `currentClassStepId` on `StudentProgress` | Migration on the hottest student table plus a new null-out path in every delete, to buy precision on a pointer its own docblock calls "display/resume convenience only" |
| Hotlinking pasted image URLs | Blocked by CSP and by the asset schema; exposes students' IPs to third parties |
| Adding `DISCUSSION` to `TRAINING_STEP_TYPES` | Changes what students see in every lesson containing one; a content decision, not an authoring one |
| Deleting `ScopeSwitcher` | Still used by the admin workspace |

---

# Addendum — composite modules (2026-08-07)

## Context

The build above let a teacher add, reorder, hide and edit modules. It kept one assumption from
the seeded curriculum, though: **a module holds exactly one kind of content.** A text module holds
only text.

The owner hit it immediately: *"what happens now if there is a bit of text that would be best
supported with an image along with it? that is not possible right now."*

It genuinely wasn't. The only way to pair a paragraph with a picture was two modules — and Guided
Training paginates **one module per screen** (`TrainingWalkthrough` renders `steps[index]`), so
the two halves of one idea landed on two screens.

## Decision

**A module's content may be an ordered stack of pieces.**

### Content and questions stay separate — and that is what makes this small

Owner's rule: *"content and questions should be treated as two separate entities."* A composite
may hold text, pictures, video, timelines, diagrams, fact panels and worked examples. It may
**never** hold a quick check or a document study — those remain their own modules, which teachers
can still add freely.

That single constraint removes the hardest part of the design. Because a composite can never
contain something a student must answer:

- `stepNeedsAttempt` still reads `parsed.kind === 'interactive-check'` — no recursion into blocks
- `canAdvance` still keys on one step id — no aggregate "all checks in this module" state
- `ScenarioLab`'s completion filter is untouched
- there is no need for a per-block `required` flag, which has nowhere to live (the column is on
  the step)

`gating.ts` therefore needed **no change at all**, and a unit test pins that a composite never
gates, however many pieces it holds.

### Composite rides on existing step types

`{ kind: 'composite', blocks: [...] }`, accepted by `parseStepContent` **only** for
`COMPOSITE_CAPABLE_STEP_TYPES` (NOTE, VOCABULARY, IMAGE, VIDEO, DIAGRAM, INFOGRAPHIC,
WORKED_EXAMPLE). Same self-describing-envelope trick `TimelineSchema` already uses on NOTE.

No `COMPOSITE` enum value, so no migration — and, more importantly, no new value to add to the
eleven separate step-type allowlists, **each of which fails silently if missed** (a module absent
from `TRAINING_STEP_TYPES` simply vanishes from the student's lesson). The step type now says
*where the module sits*; the content shape says *what is in it*.

`ContentBlockSchema` is a `z.union` of `{type, data}` wrappers, not a `z.discriminatedUnion` —
`ImageSchema` is a `ZodEffects` (it carries a `.refine`) and `DiagramSchema` is itself a
discriminated union, so neither can be a direct member of one.

### Saving is shape-preserving

A module still holding one piece is saved in its **original single-shape form**. Opening a
built-in module and saving it unchanged therefore cannot rewrite the seeded curriculum into
composites, and the seed shape tests stay meaningful. It only becomes a composite once a second
piece exists.

### One read-aloud per module

Each media view renders its own `ReadAloudButton`, so a six-piece module would sprout six buttons
driving one speech queue — and the component cancels `speechSynthesis` globally on unmount, so any
one unmounting kills another's playback while its `onend` never fires. A composite renders a
single button covering every piece in order, with the per-piece ones suppressed through a small
context.

### The Add button shows everything

An always-visible **"+ Add to this module"** button, opening a box that lists **every** content
option at once. The previous `featured` / "More module types" split was a guess that hid Timeline,
Document study, Diagram and Fact panel behind a link where no teacher would find them; it is gone
from both pickers.

Key term is absent from the in-module box for a different reason from the questions: VOCABULARY is
a **placement** (those modules render in the Key Terms panel), not a content shape, so a key-term
piece inside a training module would just be text under a misleading label.

## Two defects this fixed on the way

1. **Every newly added module opened broken.** `LessonBuilder` passed a blank payload as a
   serialized string, and a blank payload can never satisfy its own schema, so it always fell out
   of `parseStepContent`'s text fallback: Text and Key term opened showing the literal `{"text":""}`,
   Timeline opened as a plain textarea full of raw JSON with the timeline editor never appearing,
   and the rest flew a "content didn't match the expected shape" banner on a module the teacher had
   just created. `blankPayloadFor` and `blankDraft` were two parallel definitions bridged by a
   lossy round trip; the editor now takes an `initialDraft` and the payload is derived from the
   draft.

2. **Field errors collapsed onto one key.** Both normalizers keyed on `issue.path[0]`, which with
   blocks would file every nested error in every block under the literal string `blocks` and keep
   only the first. Now keyed by full dotted path (and by first segment too, so the eight per-type
   editors keep reading flat keys unchanged), with a per-block slicer and a "Needs attention" chip
   so an error inside a collapsed piece is still discoverable.

## Consequences

- **Additive**: all 134 seeded steps parse exactly as before, pinned by
  `tests/unit/seed/lesson-bank-shape.test.ts` continuing to pass untouched.
- `estimateMissionMinutes` now counts pieces beyond the first, so a six-piece module is no longer
  advertised as 90 seconds.
- `StepContentEditor` keeps serving the two question types and the admin workspace; content
  modules route to `CompositeStepEditor`. Its `initDraft` gained a defensive `composite` case that
  deliberately does **not** squeeze a multi-piece module into a single-shape draft, which would
  discard every piece but one on save.
- `ImageAssetPicker`'s hardcoded DOM ids became `useId()` — two image pieces can each open a
  picker, and duplicates would point both labels at the first input.
- Pagination, resume anchors, the progress bar and "Step N of M" are all untouched: a composite is
  still one entry in `steps`.
