# ADR 0008 — Parent Progress Summary: browser print-to-PDF, no PDF library

**Status:** Accepted
**Date:** 2026-06-11
**Phase:** 14 (Parent Progress Summary, spec §23 Phase 1, Audit §36.15)

## Context

Audit 14 item 3 requires that the teacher-generated parent progress summary "can be
exported as PDF." We need to decide how PDF output is produced for Phase 14.

Options:
1. **Browser print → "Save as PDF"** — a print-optimized page (`window.print()` plus
   Tailwind `print:` utilities). No new dependency.
2. **Server-side PDF library** (puppeteer / @react-pdf/renderer / pdfkit) — renders a PDF
   document server-side and streams it to the client.

Constraints in play:
- CLAUDE.md "Stop and Ask Before adding any new external dependency."
- The existing `src/app/teacher/reports/page.tsx` already establishes the print pattern
  (`onClick={() => window.print()}`, `print:hidden`, `print:p-0`) and explicitly defers a
  server-side "Export PDF" library to **Phase 17** (District Readiness — exports).

## Decision

Use **browser print-to-PDF** for Phase 14. The parent-summary page is print-optimized; a
"Save as PDF" button triggers `window.print()`, and the toolbar/breadcrumb are
`print:hidden`. No PDF library is added.

## Consequences

- **No new dependency**, no dependency-approval gate, no duplication of the heavier
  export work already scheduled for Phase 17.
- Consistent with the established `teacher/reports` pattern — one mental model for
  printable teacher artifacts.
- "Export as PDF" is satisfied via the OS/browser print dialog's "Save as PDF" target,
  which every supported browser provides.
- **Trade-off:** output styling depends on the browser's print engine rather than a
  pixel-controlled server render. Acceptable for a teacher-driven handout; if Phase 17
  needs byte-identical, server-generated PDFs (e.g. for archival/email), it can introduce
  a library then and the parent summary can reuse it. Reversible.

## Alternatives rejected

- **Server-side PDF library now:** trips the new-dependency rule, front-loads Phase 17
  work, and adds a native/binary dependency (puppeteer) on a machine already sensitive to
  toolchain/disk issues. Not justified for a single printable report.
