# ADR 0021 — Nav-bar Suggestion Box

**Date:** 2026-07-24
**Status:** Accepted
**Supersedes:** nothing. **Amends:** ADR 0016 (see §3).

## Context

Nobody using the site had any way to say "this page is confusing." A student stuck
on a mission, or a teacher who finds a dashboard column misleading, had no channel —
the feedback died in the room. Nothing resembling a suggestion or feedback model
existed in the schema.

The owner asked for a suggestion box living permanently in the nav bar of the
student and teacher UI: a one-line field that expands into a small editor on hover,
with a submit button, that automatically records **where in the site the author
was** when they wrote it. Student suggestions route to the teacher report page;
teacher suggestions route to an admin report page.

The captured location is the point. Aggregated by route, it answers *which pages
confuse people* — a question no existing surface in this app can answer, and one we
cannot answer with third-party analytics (non-negotiable rule #9).

## Decisions

### 1. `audience` is stored, derived from the author's role at submit time

`Suggestion.audience` (`TEACHER | ADMIN`) is computed from the author's role when
the row is created and then **stored**, never recomputed from `User.role` at read
time. A role change or correction must not silently relocate a year of existing
suggestions. `authorRole` is snapshotted alongside it for the same reason.

`STUDENT → TEACHER`, `TEACHER → ADMIN`, `ADMIN → ADMIN`. `PARENT` throws
`ROLE_NOT_ALLOWED` in the domain layer — the box is not mounted in the parent UI,
and the domain layer asserts that rather than trusting the UI not to render it.

### 2. A student's recipient teacher is snapshotted AND resolved by roster union

`Suggestion.teacherId` is the "teacher in the loop": the recipient for a
student-authored row (resolved at submit time from the student's earliest active
enrollment, deterministic on `enrolledAt` then `classId`), or the author themselves
for a teacher-authored one. That dual meaning is documented on the field, because it
otherwise reads as a pure recipient FK.

A teacher's queue reads the **union** of two branches (`src/lib/suggestions/scope.ts`):

- `teacherId === mine` — the stored snapshot
- `authorStudentId IN myRoster` — current roster membership

Neither branch is sufficient alone:

- Snapshot-only loses suggestions filed before the student was enrolled anywhere
  (those rows have `teacherId: null`, which is deliberately **not** an error).
- Roster-only means a mid-year transfer yanks a student's entire feedback history
  out of Teacher A's queue and drops it, contextless, into Teacher B's.

The union also handles a co-taught / multi-class student with **one row** rather
than fan-out, and costs nothing extra — `/teacher/reports` already loads the roster.

**One predicate, one home.** `scope.ts` is used by both `list.ts` (what a teacher can
read) and `review.ts` (what a teacher can triage), so "can see" and "can act on"
cannot drift apart.

### 3. Hover is the headline trigger, but focus and click open it identically

ADR 0016 records hover-only `ExplainerHover` as an owner-approved deviation from
rule #10, justified by every popover being *supplementary* context — never the only
path to the information.

**That justification does not extend to a form.** A hover-only suggestion box would
be literally unusable for keyboard-only users, every touch user, and every
screen-reader user. So `SuggestionBox` wires `onMouseEnter`, `onFocusCapture`, and
click to the same open path, with `Escape` to close. The differing behavior between
the two components is intentional; this section is the record of why.

A hover-open deliberately does **not** steal focus — brushing the nav while typing
elsewhere must not yank the caret. Only a click/tap open focuses the textarea.

### 4. No formatting toolbar; "normal text functions" are the native ones

The owner chose a plain multi-line `<textarea>` over a formatting toolbar. What that
still provides, for free and with zero dependencies: undo/redo, cut/copy/paste
(plain text only — a security win over any contenteditable), select-all, word/line
caret motion, shift-selection, spellcheck (left on; the primary authors are
7th-graders), the OS context menu, IME composition, and dictation.

Consequence: **nothing is ever parsed.** Bodies are stored and rendered as plain
text inside `whitespace-pre-wrap`. There is no `dangerouslySetInnerHTML` anywhere in
this feature, and no markdown/HTML sanitization surface to get wrong. Rendering
markdown later would need either a new dependency (owner approval) or a hand-rolled
renderer plus a sanitizer — a new security review, not a tweak.

### 5. Positioning is `position: fixed` off a measured rect

Both `StudentNav`'s item row and `TeacherNav`/`AdminNav`'s `<nav>` are
`overflow-x-auto`. Per the CSS overflow spec, setting one axis coerces the other to
`auto`, so an absolutely-positioned panel taller than the nav row **renders with
correct styles — visible, opacity 1 — and never paints.** This is the exact bug
class `ExplainerHover` already documents, and `SuggestionBox` reuses its fix:
measure `getBoundingClientRect()` on the slot, then position `fixed`.

Two differences from `ExplainerHover`, both deliberate:

- **Below-only.** The nav is pinned to the viewport top, so the above/below flip has
  nothing to solve.
- **Scroll/resize listeners.** `ExplainerHover` closes on mouseleave, so it never
  needs them. This panel stays open across scrolling and typing and would visually
  detach from its trigger on the first scroll without them.

The slot keeps a fixed box in both states, so promoting the panel to `fixed` causes
no nav layout shift and needs no spacer element. The `<textarea>` is a single DOM
node in both states — swapping a collapsed `<input>` for an expanded `<textarea>`
would destroy focus, caret, selection, the native undo stack, and IME state at the
exact moment the user starts typing.

### 6. Submit is NOT sub-mode-gated; triage IS

Every other write route in this codebase calls `assertNotSubMode()`. `POST
/api/suggestions` deliberately does not, and both route headers say so, because the
omission would otherwise read as an oversight.

Substitute mode exists to stop a substitute mutating instructional state or student
records. Filing a suggestion mutates neither, and a substitute is exactly the person
most likely to walk into confusing UI with fresh eyes — silently 403-ing their
feedback would be a bug, not a safety feature. Working through the queue, by
contrast, is the owning teacher's bookkeeping.

**The line: anyone may submit; only the owner may triage.**

*(Separately noted: `src/middleware.ts`'s `SUB_MODE_READ_ONLY` block for
`/api/(teacher|mastery|...)/` never executes, because `config.matcher` lists only
page prefixes and no `/api` pattern. Real enforcement everywhere is the explicit
`assertNotSubMode()` call. That is a pre-existing bug, reported separately, and NOT
fixed inside this feature — but it does mean this route's mount path is irrelevant
to sub-mode, and only the explicit call matters.)*

### 7. Privacy posture

- **The body text is never copied into `AuditLog.metadataJson`.** Audit rows are
  CSV-exportable via `/api/admin/audit/export` and purge on a different clock
  (`AUDIT_LOG_RETENTION_DAYS`); a second export-friendly copy of student prose is a
  liability with no triage value. The metadata carries `bodyChars`, not the body.
- **`contextJson` holds `viewportWidth` only** — no user-agent, no IP.
  Fingerprinting-adjacent data on minors is out of bounds (rule #9).
- **No PII in URLs.** Filter parameters are enum values, cuids, dates, and
  `routePattern` (the parameterized route, so it carries no student identifiers).
  Author names live in table columns only. `pathname` is stored but never placed in
  a query string by the read surfaces.
- **No CSV export in this pass.** Unlike the audit export (structured, non-prose),
  a suggestions CSV is a bulk export of student free text and needs a
  `docs/privacy-review.md` entry plus an owner decision first.
- **Admin visibility of student suggestions is off by default**, behind an explicit
  checkbox. `ADMIN` is already a super-role here — it reads every roster and every
  audit row — so hiding them would be a false boundary a determined admin routes
  around in one click. But defaulting them on would bury the teacher-authored signal
  an admin actually needs.

### 8. Domain-layer throttle

No rate-limiting infrastructure exists in this app. A queue a bored student can
flood is a queue teachers stop opening, which would kill the feature on day one.
`createSuggestion` enforces a 10-second minimum interval and a 20/day cap per author
via two cheap `count` queries → `RATE_LIMITED` → HTTP 429.

### 9. Three bugs the browser walk caught (kept here so they aren't reintroduced)

None of these were visible to `tsc` or to any DOM-less test. Each now has an E2E
assertion in `tests/e2e/suggestion-box.test.ts`.

1. **The icon variant opened but swallowed every keystroke.** The button was
   rendered only while collapsed. On a mouse, the pointer entering the slot fires
   `open()` *before* the click lands — so the button unmounted and the click hit
   empty space. Worse, even when the click did land, `setExpanded(true)` was already
   a no-op, so the `[expanded]` effect that focuses the field never re-ran. Fixed by
   keeping the trigger mounted while open and focusing directly in the click handler
   (the effect still covers the tap-without-hover case, where the field is not yet
   mounted).
2. **The panel ran off narrow viewports.** It was a fixed 384px clamped against
   `window.innerWidth`, which includes the scrollbar gutter — measured 405 against a
   375px layout viewport, putting the Submit button off screen. Now the width is
   `min(384, viewport − 16)` and all clamping uses
   `document.documentElement.clientWidth`, which is what `position: fixed` actually
   resolves against.
3. **A 224px field in the teacher nav pushed three links out of view.** Measured: the
   14-item row needs 1334px and the field left it 1136px, hiding Interventions,
   Reports, and Settings at 1600px. The teacher nav now uses the 36px icon at every
   width, and that group's `ml-4`/`gap-4` was tightened to `ml-2`/`gap-3` to pay back
   the remaining 10px. All 14 links are visible again at 1600px.

The collapse guard was also hardened in passing: it now reads the draft and submit
state from refs rather than a `useCallback` closure, so no ordering or staleness
question can let a mouseleave discard typed text.

### 10. Revision after owner feedback (2026-07-25)

Three changes on the owner's review of the first pass.

**(a) The panel was unreachable by mouse.** It appears on hover and hangs 8px below
the nav, off a slot only 36px tall — so travelling from the trigger to the panel
necessarily crosses pixels belonging to neither element, firing `mouseleave`.
Collapsing on that instant made the reported symptom: "the text box appears, however
it disappears as soon as you move the cursor away from the button."

Fixed with a 400ms grace period (`CLOSE_DELAY_MS`) before a hover-out collapses,
cancelled by re-entering either the slot or the panel. The panel is a DOM descendant
of the slot, so entering it re-fires `mouseenter` and cancels the pending close.
An outside *click* still closes immediately — a click is unambiguous, unlike a pointer
in transit. This is layered on top of the existing draft/focus/saving guards, which
remain.

**(b) One visual style everywhere, the plain LMS one.** The owner preferred the
teacher/admin look, so the `theme: 'game' | 'admin'` prop is gone from
`SuggestionBox`, `SuggestionsTable`, and `SuggestionStatusControl`. The bright
student card style is no longer used anywhere. Practical benefits beyond taste: one
style can't drift from the other, and it still neutralizes correctly under
`.cq-high-contrast` on student pages because it uses stock Tailwind class names.

**(c) Comment vs. Question, split into two teacher tabs.** New `SuggestionKind`
enum (`COMMENT` default, `QUESTION`) plus `Suggestion.kind`, added by the additive
migration `20260724130000_suggestion_kind`.

- The box shows a two-radio segmented toggle, gated on a new `allowKindToggle` prop.
  **Students only** — that is where the owner asked for it, and it's the audience
  whose queue is actually split. Teacher/admin submissions stay comments. Real radio
  inputs, not styled buttons, so arrow-key navigation and grouping semantics come
  free. Switching kind also switches the placeholder, the hint copy, the success
  message, and the textarea's accessible name.
- `/teacher/reports` gains a fourth tab, `tab=questions`. Suggestions is now
  comments-only, so nothing appears in both places.
- **Both tab badges are computed ignoring the kind filter** (`newCountsByKind` in
  `SuggestionListResult`). A teacher standing on Comments must still see that
  questions are waiting; a badge that only counted the current tab would hide the
  other queue entirely.
- The admin queue gains a Type column and a Type filter rather than a second page —
  admins receive comments almost exclusively, so a whole tab would be dead space,
  but a question arriving must not be invisible.

### 11. Icon-only everywhere, with a hover explainer (2026-07-25)

The owner preferred the teacher nav's 36px icon over the inline text field and asked
for it on every surface, plus a hover explainer and more separation from Sign out.

**(a) The `variant` prop is gone.** `SuggestionBox` renders one thing: the icon
trigger, with the panel on expand. The `'field'` variant had no remaining callers, and
leaving dead branches in a component with this much interaction logic invites drift.
Side effect worth noting: the "stable slot" single-`<textarea>` property only ever
mattered for the field variant (collapsed field → expanded panel). Icon-only mounts
the textarea with the panel and focuses it on open, so nothing typed is ever at risk —
the panel stays open while the draft is dirty.

**(b) Hover-intent timing, which the explainer required.** Previously hover opened the
panel on the *first* pixel, which left no state in which a tooltip could be seen — it
would have been covered by the panel instantly. So hover now has two stages:

| Elapsed | State |
|---|---|
| 0–120ms | nothing (a sweep across the nav opens nothing) |
| 120ms | explainer card appears |
| 450ms | panel opens — the explainer **stays** |

Click and keyboard focus bypass both delays. A pointer that leaves before 450ms
cancels the pending open, so brushing past the icon never opens the box.

**Explainer lifetime is tied to hovering the icon, NOT to the panel being closed.**
The first attempt dismissed it when the panel opened, which gave it only the ~330ms
between the two delays — the owner's verdict was "impossible to read". It now shows
after the 120ms delay and persists for as long as the pointer rests on the button,
with the panel open beside it (the owner explicitly approved both being on screen
together). Moving onto the panel drops the explainer — at that point the user is
reading the form, whose own hint line carries the same information.

Because the two coexist, the explainer cannot be anchored under the icon: both are
`position: fixed` below the nav and would overlap. `recomputeTip` places it to the
**left of the panel** at the same top so they read as a pair, and falls back to
**below the panel** when there is no room beside it (verified at a 375px viewport:
panel 359px wide, explainer placed underneath, zero overlap).

The explainer is hand-rolled rather than reusing `ExplainerHover`, deliberately:
that component has no way to be suppressed *or repositioned* once its own hover
fires, so wrapping the trigger would stack two cards in the same spot below the nav.
It uses the same `position: fixed` technique for the same nav-clipping reason, and is
wired to the trigger with `aria-describedby`.

**(c) Separation from Sign out.** The icon carries a right margin on all three navs so
reaching for it can't clip Sign out (24px of clearance on teacher, 20px on student).
The teacher nav had **zero** horizontal slack at 1600px, so that margin was paid for
by tightening the brand's `mr-4`→`mr-2` and the trailing group's `ml-2`→`ml-1`.
Re-measured: still 1336/1336 with all 14 links visible.

## Consequences

- New table `suggestions`, two new enums, one additive migration
  (`20260724120000_suggestion_box`). No existing table or column changed.
- New module `src/lib/suggestions/`. `constants.ts`, `location.ts`, and `status.ts`
  must stay free of any `@/lib/db` import — `SuggestionBox` deep-imports them, and
  the barrel reaches Prisma Client. Type-only barrel imports are safe.
- `location.ts` carries a hand-maintained, most-specific-first route table that must
  be extended whenever a page is added; an unmatched path degrades to the normalized
  pathname plus an "Unknown page" label rather than failing.
- `AdminNav` gains `/admin/reports` as its first item. There was no `/admin` index,
  so `Users` was the de facto landing page; Reports is the better one.
- `/teacher/reports` gains a third tab. Its `hasStudents` short-circuit had to move:
  a teacher with no current students can still have suggestions (that is the whole
  point of the snapshot branch), so the suggestions branch is evaluated first.
- Audit-log catalog +2: `SUGGESTION_SUBMITTED`, `SUGGESTION_STATUS_CHANGED`.

## Follow-ups

1. **Retention** — `suggestions` holds student free text and is not covered by
   `src/lib/retention/policy.ts`. Recorded in `docs/data-retention.md` as an open
   owner decision; needs either a `SUGGESTION_RETENTION_DAYS` window plus a purge
   branch, or an explicit "retain indefinitely" ruling.
2. **Notify the recipient.** Nothing tells a teacher a suggestion arrived except the
   tab badge. An email or dashboard widget is the obvious next step.
3. **Markdown rendering** in the read surfaces, if the owner wants it (§4).
4. **CSV export** for admins, pending the privacy note (§7).
5. **Parent portal** — the box is not mounted there, and the domain layer refuses
   `PARENT` authors. Revisit if parents should have a channel.
