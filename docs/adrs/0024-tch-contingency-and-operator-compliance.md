# ADR 0024 — Technology Clearinghouse contingency, printable materials, and Florida operator compliance

**Date:** 2026-08-07
**Status:** Accepted (code); district items prepared and deliberately unfiled

## Context

The district approval packet requests pilot approval for one classroom and has **not** been
submitted. The owner asked what the platform could still do if PBCSD's Technology Clearinghouse
declined, under an explicit constraint: stay inside the rules and do nothing that would
prejudice a later approval.

Research into the actual governing policy changed the shape of the answer.

**SDPBC Board Policy 3.29** (active; adopted 2024-11-06, revised 2025-10-21) is categorical:

> "Use of non-District approved products whether on-prem or cloud-based services is prohibited
> unless approved by the District's Technology Clearinghouse (TCH)."

There is no cost threshold, no purchase trigger, and — searched for specifically — **no written
exemption** for free tools, no-login tools, teacher-side preparation, projected-only use, or
optional use. Enforcement reaches termination. Policy 5.50 §12(k) does acknowledge services
"referred to … but are not required to use," but the duty it creates runs to the School Board,
not to a teacher, and nothing published reconciles it with 3.29.

Separately, the research surfaced a statute nobody had accounted for. **Fla. Stat. § 1006.1494**
(Florida's SOPIPA) regulates the *operator* of a K-12 online service directly. By its own
definition this application is one, and its duties attach whether or not a district agreement
exists.

## Decisions

### 1. Do not look for a way to use the platform with students before approval

There isn't one that survives reading Policy 3.29, and constructing a clever reading of a policy
whose enforcement clause reaches termination is not a service to the owner. The contingency is
therefore about what retains value with **zero student platform use**, plus removing every
avoidable reason a reviewer would say no.

### 2. Printed materials are the fallback

New `/teacher/lessons/[benchmarkCode]/print` produces a **student packet** and a **teacher
answer key** from the authored curriculum.

The reasoning is that paper is a different legal question, not a loophole. Florida has no
separate category of "supplemental materials" and no state pre-approval requirement for them
(verified negative — the word appears in neither § 1006.28 nor § 1006.283); the board is
responsible for "any other materials used in a classroom," governed through content standards and
an objection process rather than a technology review. A worksheet is not a cloud-based service.

Two consequences recorded honestly rather than glossed:

- **The content survives; the engine does not.** Server-side grading, the mastery threshold,
  SM-2, adaptive difficulty, and every analytic are lost. That is most of what distinguishes this
  platform from a worksheet packet.
- **Generating the materials is a separate question from handing them out.** Producing them on
  district equipment is arguably itself "use" under a literal reading of 3.29. That is question 4
  to Ed Tech, not something resolved by assumption.

**The two documents are separate server-rendered URLs, not a client toggle.** A student packet
must not contain the answers in its markup at all — hidden by CSS or otherwise. Verified in the
browser: the packet HTML contains zero filled markers, zero feedback spans, and zero bold-marked
options.

The Mastery Challenge is deliberately excluded from printable question sets: its forms rotate per
student and it decides whether a benchmark unlocks.

### 3. Student-record deletion defaults ON at the statutory ceiling

§ 1006.1494(3)(c) requires deletion "no later than 90 days after a student is no longer enrolled
… upon notice by the school district." Every other retention window in this project defaults to
"retain forever" because retaining is the conservative choice. **Here it is the opposite:**
retaining past 90 days is the violation.

So `STUDENT_RECORD_RETENTION_DAYS` defaults to **90**, is **clamped** to 90, and an unparseable
value falls back to 90 rather than to 0 — a typo must not silently disable a statutory duty. Only
a literal `0` opts out, which requires a documented district arrangement.

Shipping it enabled is safe because the clock is started by a human act: `markStudentDisenrolled()`
records the district's notice in `Student.deactivatedAt`. A student who is still enrolled has no
clock running and is never in scope. The statutory trigger is notice, which software cannot
observe, so an exercisable and audited capability plus a documented procedure is the compliance
posture — not a timer.

**Every delete is explicit and hand-maintained.** None of Student's ~21 child relations declare
`onDelete: Cascade`, so deleting a Student with any child row present fails with a foreign-key
error. `CHILD_DELETION_ORDER` must be extended whenever a table gains a `studentId`;
`tests/integration/retention-student-records.test.ts` fails loudly if it is not. This was
mutation-tested: removing one table from the list produced exactly the expected FK failure in
three tests.

**Audit logs are not deleted.** `AuditLog.actor` is optional, so removing the user nulls the
actor reference and leaves the trail intact — an action name and a bare identifier that no longer
resolves to anyone. The purge record deliberately does not list the student ids it removed;
writing them there would re-create the identifier the purge just deleted.

### 4. Clever scope narrowed to what the code actually calls

`read:students` and `read:teachers` were requested for a name lookup that was never implemented.
The only endpoint this app calls is `/v3.0/me`, covered by `read:user_id` alone. Unused scope
conflicts with § 1006.1494(3)(a) data minimisation and is exactly the mismatch a Legal review
tests. Net effect: **no student name or email reaches the database from Clever at all.**

Restore the scope in the same commit as the API call, never ahead of it.

### 5. Accommodations: implement, or describe honestly — never both-and-neither

Three codes were grantable, audit-logged, IEP-style labels with no implementation.

- `ACC-REDUCED-CHOICES` was implementable and is now implemented — three choices instead of four,
  on practice-style assessments only. Never where mastery is decided: removing a distractor
  raises a random guess from 25% to 33%, which would change what the 80% threshold means. The
  eligible set is an **allowlist** so a new assessment type fails closed.
- `ACC-EXT-TIME` is inapplicable by design. There is no time limit anywhere in the platform, so
  every student already has unlimited time — which exceeds the accommodation. The description now
  says that instead of promising a multiplier.
- `ACC-SCREEN-READER` is not a per-student setting. ARIA labelling and tab order apply to every
  page for everyone.

Neither of the latter two was deleted: an IEP may name the code, and the grant should still
appear on the student's profile as documentation.

The principle, now a comment in the seed file: **an accommodation description is a promise to a
teacher reading an IEP.** If the code does not do what the text says, a teacher grants the
support, believes it took effect, and the student does not get it.

### 6. Google domain allowlist ships permissive by default

ADR 0003 recommended restricting Google sign-in to the district domain and it was never built.
It is now implemented and checked **before** the user row is created, so a rejected sign-in
leaves nothing behind.

`GOOGLE_ALLOWED_DOMAINS` unset means "allow any," which is the previous behaviour. That is
deliberate: the production administrator account was bootstrapped by attaching a Google address
to a seeded row, and a hard-coded `palmbeachschools.org` default would lock it out on the next
deploy with direct database access as the recovery path. A security control that removes the
owner's own access is not a security control. Set it deliberately, after confirming your own
address matches.

Matching is exact, not suffix-based — a suffix match on `palmbeachschools.org` would also accept
`evilpalmbeachschools.org`. Subdomains must be listed explicitly.

### 7. Nothing is filed or sent

`docs/district-questions-draft.md` and `docs/tch-submission-mapping.md` are prepared and held.
No PBSD 2199, no PBSD 2220, no email. Sending is a separate, explicit owner decision.

## Consequences

- A compliant classroom option exists this term (paper) without any district action.
- Three packet §9 disclosures are closed and one Clever mismatch removed before a reviewer sees
  either.
- The 90-day deletion duty is met by capability and procedure, but **no scheduler runs it** — the
  packet says so.
- **`DEMO_OPEN_LOGIN=true` remains set in production.** One environment variable and a redeploy,
  and it must be closed before the URL is given to any reviewer. It is the one item on the
  pre-submission list that code in this repo cannot close.
- Sub-processor agreements with Vercel and Neon (§ 1006.1494(2)(d)6) remain unexecuted.
- Employee IP ownership is unresolved and no board policy covers it — worth settling regardless
  of the Clearinghouse outcome, since the site is already public at a personally-owned domain.

## References

- `docs/tch-contingency.md` — the contingency analysis, with VERIFIED / NOT FOUND labelling
- `docs/florida-operator-compliance.md` — § 1006.1494 duty-by-duty mapping
- `docs/tch-submission-mapping.md` — packet routed to the real review chain
- `docs/district-questions-draft.md` — questions for Ed Tech (unsent)
- SDPBC Board Policy 3.29; Policy 5.50 §12(j)–(l); Fla. Admin. Code R. 6A-1.09550
- Fla. Stat. §§ 1002.222, 1006.1494, 1006.28, 1014.05, 112.313
