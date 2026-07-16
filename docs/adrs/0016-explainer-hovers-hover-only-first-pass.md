# ADR 0016 — Explainer hovers: hover-only trigger for the first pass

Status: Accepted (2026-07-16)

## Context

The owner asked for hover-triggered explainer popovers across the site so any
user can understand what a feature does. Before building, the owner was shown
three trigger options: (1) hover + keyboard-focus + touch/tap (matching the
existing `GlossaryPopover` pattern, most inclusive), (2) a click/tap `(i)`
icon (works identically on touch and desktop, no hover timer), or (3)
mouse-hover-only on desktop, explicitly flagged as leaving keyboard-only and
touch-device users without access to the explainer content — a WCAG 2.1 AA
gap against this project's non-negotiable rule #10 (accessibility is a
first-class requirement). The owner chose option 3, prioritizing shipping
speed for this first pass.

## Decision

`ExplainerHover` (`src/components/ui/ExplainerHover.tsx`) opens only on mouse
`onMouseEnter` after a ~1s delay, and closes on `onMouseLeave` or `Escape`.
It does **not** wire `onFocus`/`onBlur`/`onClick`, so keyboard-only and
touch/tap users cannot open it at all in this pass.

This is a **known, owner-approved deviation** from rule #10, not an
oversight. It is scoped narrowly:

- Applies only to `ExplainerHover` (new, UI-chrome explainers). The existing
  `GlossaryPopover` (vocabulary terms in lesson/stimulus text) already wires
  hover + focus + click/tap + `Escape` and is untouched — it remains the
  fully accessible pattern for glossary content.
- Applies only to Phase 1 (student game UI). Teacher/parent/admin rollouts
  are separate follow-up passes.
- Every `ExplainerHover` popover is supplementary context, not the only path
  to the information it explains — a student who can't trigger a popover can
  still use every feature it's attached to; nothing is gated behind hover.

## Consequences

- Keyboard-only and touch-device (tablet/phone) students get zero access to
  explainer content until follow-up work lands. This does not currently block
  any interaction — everything the explainers describe is also usable
  without reading the popover — but it is a real, tracked accessibility gap
  and should not be left open-ended.
- Adding keyboard/touch support later is **cheap, not a rewrite**:
  `GlossaryPopover` already proves the exact pattern (`onFocus`/`onBlur`
  mirroring `onMouseEnter`/`onMouseLeave`, `onClick` toggle for tap,
  `role="button" tabIndex={0}` on the trigger, `onKeyDown` for Enter/Space/
  Escape) in ~10 additional lines. `ExplainerHover` already carries the
  matching `role="tooltip"`/`aria-describedby` wiring so this is additive.

## Addendum: single-span trigger (found during verification, same session)

The first draft used two nested spans — an outer `relative inline-block`
positioning wrapper and an inner span carrying the actual hover handlers.
Browser verification of the `StepIndicator` instance (small flex-col items
inside a horizontally-scrollable row) found that real hover events could
silently fail to open the popover: the browser's hit-test sometimes landed on
the outer span's hairline edge instead of the inner one, under normal
sub-pixel layout at `devicePixelRatio: 2`, with no error and no visual sign
anything was wrong. Fixed by merging both roles onto a single span (handlers,
positioning, and trigger styling together) — there is no longer a seam for
the hit-test to fall into. Confirmed fixed live; confirmed no regression on
the already-working dashboard/map instances. Worth remembering if
`GlossaryPopover`'s similar two-span shape is ever touched — it has not
exhibited this in practice, but the same class of bug is structurally
possible there too.

## Follow-up (required, not optional)

- Add keyboard-focus and touch/tap triggers to `ExplainerHover` before this
  pattern is considered accessibility-complete. Track alongside the Phase 12
  WCAG 2.1 AA target rather than deferring indefinitely.
- When teacher/parent/admin explainer passes are built, revisit whether the
  hover-only tradeoff is still acceptable for those higher-stakes,
  keyboard-heavy surfaces (e.g. data tables, forms) before extending it
  further.
