# Audit 12: Accessibility and Equity (Phase 12)

Spec reference: Section 36.13

Items 1, 4, 5, 6, 7 are automated; items 2, 3, 8, 9, 10 include a manual procedure
(keyboard / screen-reader / zoom checks a tool cannot fully attest).

---

- [ ] 1. WCAG 2.1 AA automated audit (axe-core) shows zero violations on core pages.
      Automated by `tests/e2e/a11y.test.ts` (`@axe-core/playwright`, tags
      wcag2a/wcag2aa/wcag21a/wcag21aa) on dashboard, mission, assessment, settings.
      Run: `npx playwright test tests/e2e/a11y.test.ts`.

- [ ] 2. Manual keyboard-only navigation completes a mission end-to-end.
      Procedure: from `/student/dashboard`, Tab to the current mission, complete
      pre-check → briefing → vocab → training → scenario → readiness → mastery
      using only Tab/Shift-Tab/Enter/Space/Arrow keys. Confirm a visible focus
      ring at every step (high-contrast mode adds a 3px outline).

- [ ] 3. Screen reader (VoiceOver/NVDA) on dashboard, mission, assessment.
      Procedure: enable VoiceOver (Cmd-F5). Verify nav landmarks, headings, the
      readiness meter, answer-choice buttons (announce pressed state), the
      confidence selector, and the read-aloud / chunking controls are announced
      with sensible labels.

- [ ] 4. Read-aloud functions on all stimulus passages.
      `StimulusDisplay` (Web Speech API) is now used by the assessment player,
      source-lab, and Source Decoder — not just source-lab.

- [ ] 5. Sentence chunking persists across navigation.
      `StimulusDisplay` persists the toggle in localStorage
      (`civics-quest:sentence-chunking`); verify it survives navigation.

- [ ] 6. Tier-2 vocabulary popovers function on touch and hover.
      `GlossaryPopover` (hover/focus/tap) on stimulus pages with glossary terms
      (e.g. `/student/source-lab/[id]`).

- [ ] 7. Accommodations on student profile flow through to every assessment
      without per-assignment toggle.
      Teacher grants any catalog code in `AccommodationEditor`
      (`/teacher/students/[id]`); the student app shell reads active
      accommodations in `src/app/student/layout.tsx` and the assessment route
      passes `studentId` so reading-load variants apply. Verify: grant
      `ACC-HIGH-CONTRAST` → student pages render high-contrast with no other action.

- [ ] 8. High-contrast mode available and functional.
      Self-serve toggle in `/student/settings` (and `ACC-HIGH-CONTRAST`
      accommodation). Applies `.cq-high-contrast` on the student shell.

- [ ] 9. No color-only indicators in UI.
      Pass/fail, status, and tag-validity cues pair color with an icon/text label.
      Manual scan of dashboard, assessment result, teacher status tables, question bank.

- [ ] 10. 200% browser zoom does not break layout.
      Procedure: set browser zoom to 200% on dashboard, mission, assessment;
      confirm no horizontal scroll/overlap (Tailwind responsive + rem text).

---

## How to run the automated portion

```
# Terminal: dev server with mock auth + seeded student session (global-setup)
npx playwright test tests/e2e/a11y.test.ts
```
