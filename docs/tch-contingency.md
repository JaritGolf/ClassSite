# Operating Without Technology Clearinghouse Approval — Contingency

> **Status: planning document. Nothing here has been filed with or sent to the district.**
> Research date 2026-08-07. **Not legal advice.** Every claim is marked VERIFIED (quoted from a
> source retrieved directly), NOT FOUND (searched for, absent), or INFERRED.

## Why this document exists

`docs/district-approval-packet.md` requests pilot approval for one classroom. It has not been
submitted. School starts in weeks. This document answers the question: *if the Technology
Clearinghouse says no — or simply says nothing — what can the platform still do, without
breaking any rule and without prejudicing a later approval?*

Two owner decisions frame everything below:

1. **No students on the platform until approval.**
2. **Nothing is filed or sent to the district** without a separate, explicit go-ahead. The forms
   and the questions in this repo are drafts held locally.

---

## 1. The governing rule, and it is categorical

**SDPBC Board Policy 3.29, "Acceptable Use of Technology by Employees"** — active, adopted
2024-11-06, revised 2025-10-21. VERIFIED:

> "Use of non-District approved products whether on-prem or cloud-based services is prohibited
> unless approved by the District's Technology Clearinghouse (TCH)."

> "Users shall utilize only hardware and licensed software that have been approved through a
> submission to the Technology Clearinghouse (TCH) utilizing the PBSD 2199 Software Hardware
> Technology request form for fact-finding, review and assessment."

Enforcement, VERIFIED: non-compliance "may be subject to disciplinary action up to and including
termination."

**There is no cost threshold and no purchase trigger.** Free web tools are in scope.

**No exemption exists** for any of the workarounds one might reach for. Each was searched for
specifically and came back **NOT FOUND** as a written exemption:

| Proposed allowance | Status |
|---|---|
| Teacher-created materials | NOT FOUND. Florida law is likewise origin-neutral (§ 4). |
| No student accounts / no logins | NOT FOUND. Removes the *PII* trigger under Policy 5.50 §12(j), but 3.29's approval requirement is not conditioned on data collection. |
| Teacher-side preparation only | NOT FOUND. |
| Projected to the class rather than used by students | NOT FOUND. |
| Optional / at-home use | Closest thing to an allowance — see §2 — but still not a teacher-side exemption from 3.29. |

This is not a local invention. Policy 5.50 §12(l) cites **SBER 6A-1.09550**, and Fla. Admin.
Code R. 6A-1.09550(3)(a)2 requires every district to designate someone responsible for reviewing
and approving online educational services. The Technology Clearinghouse Committee is SDPBC's
implementation of a state rule.

> ⚠️ **Two currency traps.** The version of Policy 3.29 that ranks first in a web search is the
> **archived** one ("IN USE FROM 5/4/2016 - 11/6/2024") — do not cite it. And BoardDocs rejects
> ordinary fetching, so the current text above was retrieved through its API by a research agent
> and has **not** been read by the owner in the BoardDocs UI. Confirm before relying on it.

---

## 2. The one accommodating provision — and why it is not a permission slip

**Policy 5.50, §12(k)** — VERIFIED, quoted in full:

> "For online educational services that students and parents are referred to as part of a school
> activity or function, but are not required to use, the School Board must provide notice to
> parents and eligible students if such online services have not been reviewed and approved in
> accordance with sub-paragraph (12)(j) above."

Read carefully, it does two things: it **acknowledges a category** of service that is *referred
to but not required*, and it places the resulting duty — parental notice — **on the School
Board**, not on the teacher.

**A teacher cannot discharge that duty unilaterally and cannot treat it as self-issued
permission.** Note also that 5.50 governs student-records and PII risk and draws the
required/referred distinction, while 3.29 governs employee conduct and draws no such distinction
at all. **A "not required, no login" use may satisfy 5.50 and still violate 3.29.**

Nothing published reconciles the two. That tension is genuinely open on the public record, and
getting the district's own reading in writing is worth more than any reading offered here — see
`docs/district-questions-draft.md`, question 1.

---

## 3. What survives with no approval

| Tier | What it is | Status |
|---|---|---|
| **A** | Printed instructional materials — lesson packets, practice sets, answer keys, key-term glossaries | **The real fallback. Built — see §5.** |
| **B** | Teacher's own planning and authoring, personal equipment and personal time | Genuinely ambiguous under 3.29. Flag it, ask, don't rely on it. |
| **C** | 5.50 §12(k) "referred to but not required" optional use | **Do not self-authorize.** Ask only. |
| **D** | The full platform | Post-approval only |

### Honest capability accounting

**Survives on paper:** every authored lesson, the question banks with full tagging, worked
examples, source analysis, timelines, remediation content, the three reading-load variants,
tier-2/tier-3 glossaries and the approved Spanish glosses, and the standards alignment that
documents compliance with the FLDOE DPS 2023-90 content criteria.

**Does not survive:** server-side grading, the mastery engine and the 80% unlock, SM-2 spaced
retrieval, adaptive within-session difficulty, confidence calibration, every teacher analytic,
Focus Mode, and all student-facing game elements.

**The content survives; the engine does not.** That is the actual cost of no approval, and it is
most of what makes this platform different from a worksheet packet. It should not be minimized
when weighing how hard to push for approval.

---

## 4. Why printed output is a different question

Florida has **no separate legal category of "supplemental materials" and no state pre-approval
requirement** for them — VERIFIED negative: the word "supplemental" appears in neither
§ 1006.28 nor § 1006.283. Instead § 1006.28(2)(a)1 makes the district board responsible for the
content of:

> "all instructional materials and **any other materials used in a classroom** … whether adopted
> and purchased from the state-adopted instructional materials list … **or otherwise purchased or
> made available.**"

Governance runs through **content standards** (FLDOE DPS 2023-90: material must be "suited to
student needs and their ability to comprehend" and not "inappropriate for the grade level") and an
**objection process** (§ 1006.28(2)(a)2 — objected material removed within 5 school days), not
through a technology review. A worksheet is not a cloud-based service.

Two honest caveats:

- **Origin-neutrality cuts both ways.** Authoring the material yourself neither exempts it from
  the content standards and objection process nor adds a state-level review burden. Same legal
  box as a purchased product.
- **Generating the materials is a separate question from handing them out.** Producing them on
  district equipment is arguably itself "use of a non-District approved cloud-based service"
  under a literal reading of 3.29. The conservative practice is personal equipment on personal
  time, and this is question 4 in the draft to Ed Tech rather than something resolved here by
  assumption.

Note also: **HB 1467 does not reach this** (VERIFIED on three grounds — the certification
requirement is limited to a *book* in a library media center or on a reading list, and the
implementing rule 6A-7.0713 is titled for elementary library listings). But
**§ 1014.05(1)(c) expressly names "software, applications, and any digital media made available
to students"** as material a parent may object to.

---

## 5. What was built (2026-08-07)

Printable materials: **`/teacher/lessons/[benchmarkCode]/print`**, TEACHER/ADMIN only, read-only,
creates no assessment attempt.

- **Student packet** — lesson content, key terms, name/date line, practice questions with answer
  choices and nothing marked.
- **Teacher answer key** — the same document with the correct choice marked and the authored
  feedback shown.

The two are separate server-rendered documents chosen by URL, not a client toggle, so a student
packet never contains the answers in its markup at all.

Deliberately **excludes the Mastery Challenge** from printable question sets: its forms rotate per
student and it is the instrument that decides whether a benchmark unlocks. Practice and the
pre-check are what a worksheet is for. Source: `src/lib/lesson-print/packet.ts`.

---

## 6. Compliance work done at the same time

These close live gaps and remove the most likely reasons a reviewer would say no. Full detail in
`docs/florida-operator-compliance.md`.

| Gap | Resolution |
|---|---|
| Clever requested `read:students` / `read:teachers`, never called them | Narrowed to `read:user_id`. No name or email now reaches the database from Clever at all. |
| No deletion mechanism for a disenrolled student's records (§ 1006.1494(3)(c)) | `Student.deactivatedAt` + `purgeDisenrolledStudents()`, defaulting to the 90-day statutory ceiling and capped there. |
| Suggestion free text had no retention window | `SUGGESTION_RETENTION_DAYS`, plus a plain reminder in the box not to include personal details (§ 1002.222(1)(a)). |
| `ACC-EXT-TIME`, `ACC-REDUCED-CHOICES`, `ACC-SCREEN-READER` were IEP-style labels with no implementation | Reduced choices implemented for practice-style assessments only; the other two re-described honestly (the platform is untimed for everyone, and ARIA/tab order is application-wide). |
| Any Google account could initiate sign-in (ADR 0003 recommended a domain restriction, never built) | `GOOGLE_ALLOWED_DOMAINS`, checked before the user row is created. Unset by default to avoid locking out the existing admin — set it deliberately. |
| Packet §3.2 asserted no URLs are collected; `Suggestion.pathname` stores one | Disclosed precisely in §3.2. |

**Still outstanding and owner-only:** `DEMO_OPEN_LOGIN=true` is set on the production deployment,
so any visitor can currently sign in as ADMIN. That is one environment variable and a redeploy,
and it must be closed before the site URL is given to any reviewer.

---

## 7. Do not do — these would prejudice a future approval

- **Do not put students on the platform before approval.** Also the single fact most likely to
  surface during a review.
- **Do not request a content-filter allowlist exception** for the domain. Policy 3.29 separately
  forbids circumventing filters, and asking signals use before approval. Reachability is not
  permission — filter allowlisting and TCH approval are separate gates (INFERRED).
- **Do not treat 5.50 §12(k) as self-issued permission.**
- **Do not monetize anything.** Policy 3.29 bars using district technology for financial gain
  ("offering products or services for sale"), and **§ 112.313(3), F.S.** bars a public employee
  acting in a private capacity from selling goods or services to their own political subdivision.
  The one favorable ethics opinion (CEO 88-14, 1988) turned on the developer having **no
  ownership interest**. An unmonetized, district-benefiting classroom tool appears to fit 3.29's
  "unless the use of the technology will benefit the District" carve-out; a paid license would
  not. Request a current Commission on Ethics opinion before any money is involved.
- **Do not collect political or religious affiliation** in any form, including free text
  (§ 1002.222(1)(a) and § 1006.1494(1)(a)3).
- **Do not cite the archived Policy 3.29.**

---

## 8. Open items only the district can answer

Carried into `docs/district-questions-draft.md`, held and unsent:

1. How 3.29 and 5.50 §12(k) interact for an employee-developed, no-cost application.
2. Who may submit a PBSD 2199 — **NOT FOUND** in any published source.
3. Realistic review timeline — **NOT FOUND**; no published SLA exists. Do not assume one.
4. Whether teacher-side authoring and printed output are distinguished from student use.
5. The **IT User Standards Manual**, normative by incorporation into 3.29, whose indexed URL 404s.
6. Full text of Policies **8.12, 8.122, 8.125** (BoardDocs attachments, not publicly retrievable).
7. **Employee intellectual property.** All 371 active board policies were enumerated; there is
   **no** outside-employment, IP, or work-for-hire policy, and Policy 8.121 covers only *using
   others'* copyrighted work. This should be answered before anything further is published under
   a personal name — the site is already public at a personally-owned domain.

Contact of record: Educational Technology Director, **Rebecca Smykla, (561) 969-5878**.
Forms: **PBSD 2199** (request) and **PBSD 2220** (student information addendum), from
`https://www2.palmbeachschools.org/formssearch/`.
