# ADR 0015 — Lesson rich media (video/image/diagram/infographic) + teacher visibility controls

Status: Accepted (2026-07-16)

## Context

Lessons delivered nearly all content as flat text: every visual was Tailwind
HTML or inline SVG, `public/` was empty, and the `VIDEO` step type had existed
since Phase 1 without a contract, renderer, or any authored content. The owner
directed that every lesson deliver content through diverse media — diagrams,
infographics, images, and video — for 11–13 year olds with varied learning
styles, and that teachers be able to toggle each media item in and out of
lessons. Initial seed content auto-approves (per the ADR 0013 owner directive)
but must remain teacher-controllable afterward.

## Decision

1. **Dedicated media step types, JSON-in-content contracts.** `LessonStepType`
   gains `IMAGE`, `DIAGRAM`, `INFOGRAPHIC` (additive enum migration; `VIDEO`
   already existed). Payloads are structured JSON stored in
   `LessonStep.content`, validated by zod schemas in
   `src/lib/lesson-content/contracts.ts` and dispatched by `parseStepContent`
   with the established plain-text fallback — a malformed media row degrades to
   readable text and never breaks or gates the mission flow. We deliberately do
   NOT overload the NOTE-carries-JSON convention (that stays timeline-only, as
   pinned by the lesson-bank-shape test); dedicated types are explicit and let
   the teacher toggle target exactly the media steps.

2. **Video = curated YouTube behind a click-to-load privacy facade (the
   rule-#9 compromise).** Non-negotiable rule #9 forbids third-party requests
   carrying student data. A plain YouTube `<iframe>` (or even a remote
   `img.youtube.com` thumbnail) pings Google on page load. Instead,
   `VideoStepView` renders an entirely LOCAL facade — styled tile, title,
   duration, an always-visible text description (the read-aloud/text
   alternative), and a play button. **Zero external requests occur until the
   student deliberately clicks play**; only then does an iframe load from
   `youtube-nocookie.com` (YouTube's privacy-enhanced player) with
   `referrerPolicy="no-referrer"`. The facade discloses this to the student
   ("Video loads from YouTube's privacy-enhanced player when you press play").
   The nocookie host lives in a single exported constant in `VideoStepView.tsx`;
   the audit-17 no-analytics guard test is extended to forbid `youtube.com` /
   `ytimg.com` anywhere in `src/` and to pin `youtube-nocookie.com` to exactly
   that one file. Seeds store only the 11-character video id, never a URL.
   A district that later objects can self-host: swapping the facade's iframe
   for a `<video>` element is contained to that one component.

3. **Images = authored SVG illustrations + public-domain photographs.**
   `ImageSchema.asset` is either `svg:<key>` (an authored React SVG scene from
   the illustration registry, consistent with the bright-learning-game art
   style) or `/media/...` (a self-hosted file under `public/media/`). Every
   photo is verified public domain (Library of Congress / Wikimedia Commons /
   National Archives — pre-1930 publication, US federal works, or faithful 2D
   reproductions of PD art) and recorded in `public/media/attributions.json`
   (`file, title, author, date, source, sourceUrl, license, retrieved`), which
   is served publicly for transparency and asserted by tests (every file has an
   entry; every entry's file exists). Photos are resized (≤1600px), EXIF-
   stripped, and carry intrinsic width/height in the seed (CLS guard). Plain
   `<img>` is used rather than `next/image` — assets are pre-sized local files,
   so the optimizer adds a moving part without benefit.

4. **Accessibility is structural, not bolted on.** Every media contract
   REQUIRES a text equivalent: `description` (video), `alt` + `longDescription`
   (image), `summary` (diagram/infographic) — rendered visibly (or behind a
   disclosure) and wired to the shared `ReadAloudButton` (Web Speech, extracted
   from NoteView). Diagrams/infographics are semantic HTML (lists/blockquotes),
   so 200% zoom, reflow, and `.cq-high-contrast` work for free; components use
   only color families already in the high-contrast allowlist. Video autoplays
   only after a user-initiated click (WCAG-fine); no timer patterns.

5. **Teacher control at two scopes.** `LessonStep.enabled` (default true) is a
   global kill-switch; `ClassLessonStepVisibility(classId, lessonStepId,
   visible)` is a per-class tri-state override (row absent = inherit global).
   Effective visibility = `override.visible ?? step.enabled`, resolved
   server-side in the student mission page (student's first ACTIVE class, same
   convention as strategy requirements). Only media step types
   (`VIDEO/IMAGE/DIAGRAM/INFOGRAPHIC`) are toggleable — notes, timelines,
   checks, worked examples, and source analyses are core instruction, and
   hiding a required check would corrupt walkthrough gating. Toggles are
   enforced server-side (`TOGGLEABLE_STEP_TYPES`), roster-guarded
   (`assertClassOwnedByTeacher` for class scope), sub-mode-gated, and
   audit-logged (`LESSON_MEDIA_VISIBILITY_CHANGED`). Known limitation, accepted
   for this single-owner deployment: the GLOBAL toggle is site-global — any
   teacher can flip it for everyone (the audit log makes it traceable); a
   future multi-teacher deployment should scope it or drop it in favor of
   per-class only.

6. **Media seeds auto-approved inside APPROVED Unit-1 lessons (ADR 0013).**
   Approval remains Lesson-level; media steps ship as part of the already-
   approved owner-commissioned Unit 1 lessons (Tier D). The visibility toggles
   are the ongoing teacher control the owner required. Teachers preview every
   step at full fidelity on the new `/teacher/lessons/[benchmarkCode]` page
   (reusing the student `LessonStepRenderer`).

## Caveats

- **Positional step ids.** Step ids are positional (`lstep-SS7CG11-<n>`), so
  inserting steps mid-lesson on re-seed shifts which content an id points to.
  The seed run that introduces media steps nulls Unit-1
  `StudentProgress.currentStepId` resume pointers once (they are display-only).
  Per-class visibility rows likewise attach to position, not content, across
  future re-seeds that reorder steps — re-check toggles after any reordering
  content wave.
- **`ClassLessonStepVisibility.lessonStepId` is `onDelete: Cascade`** so the
  lesson seeder's delete-dropped-steps pass keeps working; an override dies
  with its step by design.

## Alternatives rejected

- **Plain YouTube embed:** violates rule #9 on page load (Google requests with
  student IP/cookies before any student action).
- **Self-hosted video only:** strictest privacy, but no video content exists to
  host; would make "video in every lesson" false on day one. The facade keeps
  this path open per-component.
- **NOTE-JSON media kinds:** breaks the pinned "NOTE JSON = timeline" contract
  and hides media from the toggle targeting.
- **Per-step approvalStatus:** approval semantics (queue, bulk approve) are
  heavier than the visibility need; `enabled` + per-class override is the
  minimal model that satisfies "auto-approve but teacher-controllable."
