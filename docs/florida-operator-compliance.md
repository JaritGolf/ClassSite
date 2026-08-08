# Florida SOPIPA — Operator Compliance Mapping

> Fla. Stat. **§ 1006.1494**, Student Online Personal Information Protection (ch. 2023-170,
> effective 2023-07-01). Statute text retrieved directly from leg.state.fl.us on 2026-08-07.
> **Not legal advice.** Prepared for the district review packet; not filed.

## Why this document exists

Most of this project's privacy work has been framed as *what the district requires of a vendor*.
§ 1006.1494 is different: it places duties on the **operator** directly, and by its own definition
this application is one.

**§ 1006.1494(1)(e), VERIFIED:**

> "'Operator' means, to the extent that it is operating in this capacity, the operator of an
> Internet website, online service, online application, or mobile application with actual
> knowledge that the site, service, or application is used primarily for K-12 school purposes, or
> the site, service, or application was designed and marketed for K-12 school purposes."

A Florida 7th-grade Civics platform built for a Florida classroom is squarely inside that. The
duties below attach whether or not a district agreement is ever executed, and enforcement runs
through FDUTPA with the **Department of Legal Affairs as the sole enforcer** (§ 1006.1494(7)) —
there is no private right of action.

## What counts as "covered information" here

**§ 1006.1494(1)(a)3** lists covered information expansively. The items that exist in this
schema, and where:

| Covered category (statutory wording) | Where it lives |
|---|---|
| "first and last name" | `User.firstName`, `User.lastName` |
| "electronic mail address" | `User.email` (nullable; never populated by Clever) |
| "student identifiers" | `User.cleverId`, `Student.districtStudentId` |
| "grades", "test results" | `AssessmentAttempt`, `AttemptResponse`, `StudentProgress` |
| **"special education data"**, **"disabilities"** | `Student.eseStatus`, `StudentAccommodation` |
| (ELL status, adjacent) | `Student.ellStatus`, `Student.l1Language` |
| "text messages, documents" | `Suggestion.body` — student-authored free text |
| "search activity" | **Not collected.** No search feature exists. |
| "political affiliations, religious information" | **Not collected** — see § 4 below |
| "biometric information", "photos", "voice recordings", "geolocation" | **Not collected.** Denied at the HTTP header level via `Permissions-Policy`. |
| "medical records", "health records", "juvenile dependency records", "criminal records", "socioeconomic information", "food purchases" | **Not modeled anywhere.** |

`Student.eseStatus` and `StudentAccommodation` are the most sensitive rows in the database and
are the clearest reason a written district agreement is required before real student use.

## Prohibitions — § 1006.1494(2)

| Duty | Status |
|---|---|
| (a) No targeted advertising | **Met.** No advertising of any kind. No ad SDK, no marketing identifier. `connect-src 'self'` means the browser itself blocks any outbound request that could feed one. |
| (b) No amassing a student profile except for K-12 school purposes | **Met.** Every stored attribute exists to drive mastery, remediation, spaced retrieval, or accommodation. Note § 1006.1494(6)(b) expressly preserves use "for adaptive learning or customized student learning purposes" — direct statutory cover for the mastery and SM-2 engines. |
| (c) No sharing, selling, or renting student information | **Met.** No third-party data flow exists. No analytics, no telemetry. Enforced by a static guard test (`tests/integration/audit17/04`) and by CSP. |
| (d) No disclosure outside the listed purposes | **Met.** Disclosure surfaces are the teacher of record (roster-scoped), an admin, and a verified parent link. The parent portal ships disabled. |

**Sub-processor flow-down — § 1006.1494(2)(d)6** requires that a third party be contractually
barred from using covered information for anything but the contracted service, barred from
re-disclosing it, and required to maintain reasonable security.

> ⚠️ **This is an open obligation, not a met one.** Student data would reside with **Vercel** and
> **Neon**. Their standard terms are not a substitute for the contractual restrictions this
> paragraph requires. **No agreement is executed with either.** See `docs/hosting-plan.md` §6.

## Affirmative duties — § 1006.1494(3)

### (a) Collect no more than reasonably necessary

**Improved 2026-08-07.** Clever previously requested `read:students` and `read:teachers` for a
name lookup that was never implemented. Narrowed to `read:user_id`, which is all the one endpoint
this app calls actually needs. **No name and no email now reaches the database from Clever.**

Beyond that: no date of birth, no phone, no address, no photo, no IP address column, no user-agent
column. Verified by direct schema inspection.

### (b) Reasonable security procedures

Server-side grading with no client trust; role-based access enforced in depth; roster scoping so a
teacher cannot reach another teacher's students; answer keys never serialized to a student;
HTTP security headers including HSTS and a CSP whose `connect-src 'self'` makes exfiltration a
browser-level failure; 8-hour sessions; audit logging of 38 action types.

Disclosed weaknesses, unchanged: the CSP permits inline script and style, and a stateless JWT
session cannot be revoked server-side (ADR 0002). Both are in the packet's §9.

### (c) Deletion — the duty that needed machinery

> "Unless a parent or guardian expressly consents to the operator retaining a student's covered
> information, delete the covered information at the conclusion of the course or corresponding
> program and no later than **90 days** after a student is no longer enrolled in a school within
> the district, upon notice by the school district."

**Implemented 2026-08-07.** Previously there was no deletion path at all — retention defaulted to
"keep forever" and only audit logs and *voided* attempts were purgeable.

The statutory trigger is *district notice*, which software cannot observe, so the flow is:

1. An administrator records the notice — `markStudentDisenrolled()` sets `Student.deactivatedAt`
   and writes a `STUDENT_DISENROLLED` audit row. Idempotent, so the deadline cannot be pushed back.
2. `purgeDisenrolledStudents()` deletes every record belonging to that student on or before day
   90, then the `Student` and `User` rows, and writes `STUDENT_RECORDS_PURGED`.

`STUDENT_RECORD_RETENTION_DAYS` defaults to **90** and is **capped** at 90 — a district may
direct a shorter window but cannot configure a longer one, because the only lawful route past 90
days is the express parental consent the statute names, which is a per-student fact rather than an
environment variable. An unparseable value falls back to 90 rather than to 0, so a typo cannot
silently switch the duty off.

Full mechanics: `docs/data-retention.md`. Implementation:
`src/lib/retention/student-records.ts`. Tests: `tests/integration/retention-student-records.test.ts`.

## 4. Collection limits — § 1002.222(1)(a)

A separate statute, and for a **civics** application a live one rather than a formality:

> "(1) An agency or institution … may not: (a) Collect, obtain, or retain information on the
> **political affiliation**, voting history, **religious affiliation**, or biometric information
> of a student or a parent or sibling of the student."

**Audited 2026-08-07 across every student input path. No field collects any of these**, and none
exists in the schema.

**The distinction a reviewer needs stated plainly:** the application *teaches about* religion and
political parties — First Amendment items, political-cartoon stimuli, questions on the
establishment clause. That is subject matter mandated by the SS.7.CG standards. It is not
collection of a student's own affiliation, and a keyword scan of this codebase will surface the
former.

The one residual risk is the **suggestion box**, the only place a student can enter free prose.
Three mitigations: the box now carries a plain reminder ("Tell us about the app, not about
yourself"); `SUGGESTION_RETENTION_DAYS` bounds how long anything unexpected persists; and the
body is never copied into audit metadata and has no CSV export.

## 5. Notice, not consent

Florida requires **notice** for required online services, not consent — SDPBC Policy 5.50
§12(j)(ii) publishes what an approved service collects. Consent is required where a service
shares or sells PII commercially (not applicable), and for biometric scans and video/voice
recordings under § 1014.04(1)(g),(i).

> One trap worth naming: § 1014.04(1)(i) requires written parental consent before a political
> subdivision "makes a video or voice recording" of a minor. **Text-to-speech played *to* a
> student is not a recording; capturing a student's voice would be.** This application's
> read-aloud is synthesis only — it has no microphone access, and `Permissions-Policy` denies it
> at the header level.

## 6. What remains open

1. **Sub-processor agreements with Vercel and Neon** — required by § 1006.1494(2)(d)6, not
   executed.
2. **Whether the district requires PBSD 2220** given there is no commercial vendor.
3. **Hosting tenancy** — student PII would sit outside the district perimeter.
4. **Who issues the disenrollment notice** the 90-day clock depends on, and through what channel.
