# ADR 0018 — Canva-Generated Visual Stimuli (EOC Stimulus-Type Pilot)

**Date:** 2026-07-17
**Status:** Accepted (owner-approved 3-visual pilot)

## Context

The `StimulusType` enum has 11 values, but until now only EXCERPT stimuli
existed. Consequences: the Republic Challenge *Source Sprint* returned
422 EMPTY_POOL for every visual type, the teacher "performance by stimulus
type" analytics dimension had almost no data, and students got no practice
reading the chart/timeline/flowchart items the real EOC leans on.
`Stimulus.mediaUrl` existed in the schema but was wired to nothing.

The owner connected the Canva MCP connector (claude.ai) and approved a
3-visual pilot to prove the pipeline end to end.

## Decision

**Pipeline (per visual):** Canva `generate-design` (infographic) → inspect
every candidate and fact-check the rendered text → `create-design-from-candidate`
→ editing transaction to correct content (AI-generated layouts routinely
scramble chronology, drop events, invent "Step N" labels, and add marketing
calls-to-action — every one of the three pilot visuals needed edits) →
`export-design` PNG → commit the asset under `public/stimuli/` with an entry
in `public/stimuli/attributions.json`.

**Pilot assets (fact-checked, committed):**
- `articles-to-constitution-timeline.png` — TIMELINE, six events 1781–1791 (SS.7.CG.1.7)
- `preamble-six-purposes-chart.png` — CHART, phrase→meaning pairs (SS.7.CG.1.8)
- `ratification-path-flowchart.png` — FLOWCHART, five-step sequence (SS.7.CG.1.10)

**Rendering:** `StimulusAttachment` now carries `mediaUrl` + `stimulusType`
(`src/lib/reading-load/question-filter.ts`); `StimulusDisplay` renders the
image above the passage text; `AssessmentPlayer` and the Source Lab page
thread it through. Display-only — grading paths untouched.

**Accessibility contract:** the level-1/2/3 TEXT VARIANTS of a visual
stimulus are its accessible equivalent — each expresses the visual's full
content at its reading load, and feeds read-aloud, sentence chunking, and
glossary popovers exactly like a text stimulus. The reading-load ladder
therefore doubles as the text-alternative system (`alt` carries the title;
the passage carries the long description). Enforced by
`tests/unit/seed/visual-stimuli-shape.test.ts` (asset exists on disk,
same-origin path, attribution entry, substantial + distinct variants).

**Seeding:** `seed/stimuli_visuals.ts` — find-by-title with a real UPDATE
path (edits propagate on re-seed, unlike the legacy unit-1 stimulus seeder);
variants upserted by `[stimulusId, readingLoadLevel]`; question attachment
fills only empty `stimulusId` slots.

## Guardrails honored

- **Rule #9:** generation happens at authoring time with no student data;
  exported assets are committed under `public/` and served same-origin —
  a student session makes zero external requests (verified live via the
  performance API: `externalRequests: []`).
- **Rules #1/#2:** stimuli carry no answer data; grading unchanged.
- **Licensing:** owner-generated designs via the owner's Canva account under
  the Canva Content License (educational classroom use); recorded per-asset
  in `public/stimuli/attributions.json` with the Canva design ids, for the
  district sign-off pack.
- **Tier discipline:** the CHART's attached questions (`q-SS7CG17-021..023`,
  Unit-2 bank) are Tier C NEEDS_REVIEW, so the CHART Source Sprint pool stays
  gated until the owner bulk-approves the 1.8 bank in /teacher/content — the
  serving gates working as designed, not a defect.

## Verification (2026-07-17)

`tsc` 0 errors; seed idempotent ×2 (3 created → 3 updated in place); full
jest **1330/1332 passed, 2 intentional skips, 131 suites**; live browser walk
as the demo student: TIMELINE and FLOWCHART Source Sprints now return 201
with sessions (previously 422 EMPTY_POOL), the timeline image renders in the
AssessmentPlayer with title/level chip/read-aloud/chunking, alt text present,
level-2 text equivalent in the DOM, zero external requests. Probe sprint
sessions deleted afterward.

## Addendum (2026-07-17, same day) — legibility pass

Owner feedback on the pilot: "text is way too small ... should be designed
for a middle school student." Root cause was two-layered — (1) the initial
Canva "infographic" design_type produces a dense, corporate-report layout
(many small text blocks on a 1200–1320px-wide × ~3000px-tall canvas), and
(2) `StimulusDisplay` capped the rendered `<img>` at `max-w-md` (448px),
so a passage already sized for print-density text was then shrunk to ~35%
on screen. Compounded, body captions rendered around 4–8px tall in the app.

**Fix:**
- Widened `StimulusDisplay`'s image cap from `max-w-md` to `max-w-xl`
  (448px → 576px) — a real but partial improvement on its own.
- Regenerated all three visuals using Canva's **`poster`** design_type
  instead of `infographic`, with prompts explicitly specifying a handful of
  large chunky elements (poster-for-a-wall framing, not a dense report) —
  this yields comfortably larger native font sizes.
- Still not enough on its own: every regenerated candidate had the classic
  Canva AI content problems (scrambled year/event pairings, an invented
  "Ten amendments protect our freedoms" heading with no numbered slot, a
  duplicate purpose, two entirely blank grid cells) — same lesson as the
  first pass, worse because layouts were also restructured (a 3×3 grid
  instead of the requested 2×3, circles missing their year digit). Fixed via
  direct `perform-editing-operations` on each: `replace_text` to correct
  every mislabeled event/purpose, `delete_element` to remove blank/duplicate
  cells, `position_element`/`resize_element` to reflow the survivors into a
  clean grid, and `format_text` to push captions to **42–46px** and headlines
  to **58–66px** at native resolution (roughly 3–4× the original ~14–22px).
- One AI-tool limitation hit: there is no "insert new text element"
  operation, only edits to existing elements — so the ratification poster's
  5th step (Bill of Rights) has no numeral badge (the AI's own layout never
  produced one for that slot). Left as-is; the vertical sequence and
  headline make the step unambiguous regardless.

**Verification:** `tsc` 0 errors; `tests/unit/seed/visual-stimuli-shape.test.ts`
green (pure, asset-existence + attribution checks unaffected by pixel
content); live browser re-check of the TIMELINE and FLOWCHART Source Sprints
confirmed headline/caption text is now clearly legible at the actual in-app
render width (~556px CSS, image natural size 1400×1980) — a qualitative
jump from the initial pass, not just a numeric font bump. `attributions.json`
updated with the new Canva design ids (`DAHPq2Xm2fg`, `DAHPq8YD0y4`,
`DAHPqwakBEU`) and a note on why each was regenerated.

**Full-suite jest note:** while iterating on this fix, `npm test` showed a
handful (5–17) of unrelated, non-reproducible failures (calibration
auto-apply, assessment-allocation counts, login-audit) that trace to a
concurrent Claude Code session actively working the same repo/dev database —
confirmed via `ps aux` (a `next dev` process kept respawning under a
different PID) and `git status` (many modified/untracked files belong to an
unrelated teacher-lesson-walkthrough / admin-audit feature this session never
touched). One genuine piece of DB debris (`[phase9c-approve]` orphan
question, 0 options) was found and removed — a known class of leftover from
an interrupted run, not caused by this change. The pure test scoped to this
change (`visual-stimuli-shape.test.ts`) and `tsc` are unaffected by that
contention and are green.

## Follow-ups (backlog)

- Owner bulk-approves the Unit-2 (1.8) bank → CHART pool opens with no code
  change.
- Next waves: MAP / TABLE / POLITICAL_CARTOON / DIAGRAM types, and 1–2
  visuals per benchmark folded into each Phase 15 content wave (same
  pipeline; always fact-check candidate text before committing).
- Owner may review/curate the three pilot designs in Canva (ids in the
  attribution manifest) — re-export + overwrite the PNG and re-seed to update.
