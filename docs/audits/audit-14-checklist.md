# Audit 14: Parent Progress Summary (Phase 14)

Spec reference: Section 36.15 / Section 23 (Parent Portal — Phase 1) / Section 22
(audit-log catalog: "Share parent summary").

Phase 14 builds **Phase 1 of the parent portal**: a *teacher-generated*, print-to-PDF
progress summary for a student. True parent login is deferred to Phase 18. The summary is
composed as an **allowlist** view-model (`src/lib/parent-summary/summary.ts`) so forbidden
data (calibration, decay, overrides, accommodations, item-level analysis) cannot leak.
Driver tests live in `tests/integration/audit14/` (+ a pure unit test in
`tests/unit/parent-summary/fields-allowlist.test.ts`).

---

- [ ] 1. Teacher can generate a progress report for any student on their roster.
      Driver: `01-generate-roster-student.test.ts` — `getParentSummary` returns a VM for a
      roster student and throws `RosterError('FORBIDDEN')` for a non-roster student.

- [ ] 2. Report excludes answer keys, item bank, distractor analysis, other students, and
      (spec §23) confidence-calibration data / internal flags.
      Driver: `02-excludes-forbidden-fields.test.ts` — even with calibration snapshots on
      record, the VM's top-level keys equal the allowlist and a deep serialization contains
      no forbidden tokens; recent assessments carry only score/pass/date.

- [ ] 3. Report can be exported as PDF.
      Driver: `03-pdf-export-path.test.ts` — the actions component calls `window.print()`
      (browser "Save as PDF", matching `teacher/reports`; a server-side PDF library is
      deferred to Phase 17), the toolbar is `print:hidden`, and the page uses `print:`
      utilities. **Manual:** open `/teacher/students/[id]/parent-summary`, click
      "Save as PDF", confirm a clean document.

- [ ] 4. Sharing creates an audit-log entry.
      Driver: `04-share-writes-audit-log.test.ts` — `shareParentSummary` writes one
      `PARENT_SUMMARY_SHARED` `AuditLog` with actor (teacher), entity (student), and
      `metadataJson.fieldsIncluded`; refuses (and writes nothing) for a non-roster student.

---

## Manual / Tier-3 (deferred — see `docs/audits/deferred/phase-14.md`)

- [ ] `next build` clean.
- [ ] axe e2e: 0 WCAG 2.1 AA violations on the parent-summary page.
- [ ] Keyboard-only: toolbar buttons reachable and operable; focus-visible rings present.
- [ ] 200% zoom: report remains readable and the print output is tidy.
- [ ] VoiceOver: header, section headings, and the readiness bars are announced sensibly
      (bars are decorative; numeric % precede them).

## Notes

- Authorization is `assertStudentInTeacherClass` (roster scope) — satisfies "no other
  students" at the data layer, not just the UI.
- Per the tiered gate (ADR 0006), the jest drivers are blocking Tier-1/2 items to run in
  CI / a healthy Node environment; `tsc` is green locally. See the deferred ledger.
