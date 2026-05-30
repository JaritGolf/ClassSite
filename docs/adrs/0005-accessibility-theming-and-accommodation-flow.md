# ADR 0005 — Accessibility Theming + Accommodation Flow-Through

**Date:** 2026-05-30
**Status:** Accepted
**Phase:** 12

## Context

Audit 12 (spec §36.13) requires WCAG 2.1 AA, read-aloud/chunking/glossary on all stimulus
passages, and Appendix-G accommodations that flow through the app without per-assignment
toggling. The pieces existed in isolation (`StimulusDisplay`, `setAccommodation`,
`getEffectiveReadingLevel`) but were not applied app-wide, and there was no high-contrast /
large-text / reduced-motion mechanism.

## Decisions

1. **Theming via CSS classes on the student shell.** `src/app/student/layout.tsx` (RSC) reads
   `StudentUiSettings` + active `StudentAccommodation` codes once and applies `.cq-high-contrast`
   / `.cq-large-text` / `.cq-reduce-motion` (defined in `globals.css`) to the wrapper. One
   application point means every student page inherits the modes. Chosen over a client
   context/provider because the settings are server-known and SSR avoids a flash of un-themed UI;
   the settings page calls `router.refresh()` after save so the server layout re-applies.

2. **Accommodations are the source of truth; settings are self-serve overrides.** High-contrast
   and large-text are both teacher-grantable accommodations (`ACC-HIGH-CONTRAST`, `ACC-LARGE-TEXT`)
   and student-toggleable in `/student/settings`. The layout OR-merges them so a teacher grant
   forces the mode on without the student doing anything (Appendix G "set once, flows everywhere").
   `ACC-BREAKS` clamps the pause interval to 10 min.

3. **Persisted UI settings** (`StudentUiSettings.highContrast`, `largeText`) via migration
   `20260530120000`. `reduceMotion` (previously stored but never applied) is now wired into the
   same class mechanism, plus a global `prefers-reduced-motion` media query.

4. **Accommodations reach the assessment player.** `GET /api/assessment/[id]` now resolves the
   student and passes `studentId` to `fetchAssessmentForStudent`, so each question's
   accommodation-aware `stimulus` attachment is delivered. `AssessmentPlayer` renders it through
   `StimulusDisplay` (read-aloud, chunking, glossary) instead of a plain blockquote — previously
   assessments showed no stimulus at all. `SourceDecoderMission` also renders passages via
   `StimulusDisplay`.

5. **Teacher can grant any catalog code.** `AccommodationEditor` now lists the full
   `Accommodation` catalog (fetched in the student profile page) and grants/revokes via the
   existing upsert API, instead of only toggling codes already on record.

6. **Automated WCAG via `@axe-core/playwright`** (new devDependency, owner-approved):
   `tests/e2e/a11y.test.ts` asserts zero WCAG 2.0/2.1 A/AA violations on core pages. Manual
   keyboard/screen-reader/zoom items are documented in `docs/audits/audit-12-checklist.md`.

## Consequences

- High-contrast relies on overriding common Tailwind gray/tint utilities within
  `.cq-high-contrast` rather than restyling every component — pragmatic, but new components using
  unusual color utilities may need the override list extended.
- In-assessment glossary annotations are currently empty (`fetchStimulusForQuestion` is called
  with no terms in the assessment path); read-aloud + chunking work there, and full tier-2
  popovers function on the dedicated stimulus pages. Enriching in-assessment glossary is a future
  refinement.
- Context Boost cards (`ACC-CONTEXT-BOOST`) are seeded as a catalog code but the card feature is
  deferred to a later phase (owner decision).
