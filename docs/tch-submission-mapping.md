# Technology Clearinghouse Submission — Mapping

> ## ⚠️ PREPARED, NOT FILED.
> No PBSD 2199 or PBSD 2220 has been submitted. Prepared 2026-08-07.

## What the existing packet is, and what it isn't

`docs/district-approval-packet.md` (60KB, ~1,000 lines) is a strong general review document. It
was written before the actual SDPBC process was researched, so it is **addressed to no one in
particular** and routed by reviewer *type* ("instructional / data-privacy / IT-security") rather
than to the district's real review chain. It does not mention the Technology Clearinghouse, the
Technology Clearinghouse Committee, PBSD 2199, or PBSD 2220 anywhere.

The content is right. The routing needs work.

## The actual review chain (VERIFIED — Policy 3.29 §Compliance + district IT newsletter)

```
PBSD 2199 submitted
   │
   ├─► Academic Committee ......... products used by students / to enhance curriculum
   │      └─ Library Media ........ reviews content        ┐ triggered when the product
   │      └─ Legal ................ reviews privacy/legal  ┘ touches student data
   │
   ├─► Technology Clearinghouse Committee (TCC) ... "functionality and technology"
   │
   ├─► Division Chief / Dept Director ............. functionality
   ├─► Chief Information Officer .................. technical aspects
   ├─► Chief Financial Officer .................... final approval
   └─► Purchasing ................................. (n/a — no cost, no vendor)
```

This application both is used by students **and** stores student data, so it takes the longest
route: every box above.

**PBSD 2220** ("Student Information Contract/Agreement Addendum") is specified by Policy 3.29 for
contracts where vendors receive confidential student information. Whether it applies where there
is no vendor and no contract is **question 5** in `docs/district-questions-draft.md`.

## Which packet section answers which reviewer

| Reviewer | Wants | Packet section | Also send |
|---|---|---|---|
| **Academic Committee** | Curriculum fit, standards alignment, instructional model | §2 (standards alignment, item tagging, approval workflow), §7 (accessibility, differentiation, equity) | — |
| **Library Media** | Content appropriateness | §2.4 content approval workflow; §2.5 AI-assistance disclosure | The FLDOE DPS 2023-90 criteria mapping in `docs/tch-contingency.md` §4 |
| **Legal** | FERPA, COPPA, § 1002.22, § 1006.1494 | §3 (what is stored / not stored), §4 (auth, authorization, audit), §9.12 (no agreements in place) | **`docs/florida-operator-compliance.md`** — the § 1006.1494 operator mapping, which is what Legal will actually test against |
| **TCC** | Functionality and technology | §5 (assessment integrity), §6 (application security), §8 (hosting and operations) | `docs/hosting-plan.md`, `docs/chromebook-lockdown.md` |
| **CIO** | Technical posture, hosting, data location | §6, §8; §9.10–9.11 (disclosed weaknesses) | `docs/hosting-plan.md` §3 options comparison |
| **CFO** | Cost | §1 — no cost, no vendor, no purchase order. Nothing to approve financially. | — |

## Before submitting — must be true first

| # | Item | Status |
|---|---|---|
| 1 | **`DEMO_OPEN_LOGIN` removed and redeployed.** A reviewer given the URL currently signs in as ADMIN in one click. | ⛔ **Outstanding — owner action, production env var** |
| 2 | Clever scopes narrowed to what the code calls | ✅ Done 2026-08-07 |
| 3 | § 1006.1494(3)(c) deletion implemented | ✅ Done 2026-08-07 |
| 4 | IEP-labeled accommodations either implemented or honestly described | ✅ Done 2026-08-07 |
| 5 | Suggestion retention window exists | ✅ Done 2026-08-07 |
| 6 | Packet §9 disclosures updated to match the above | ✅ Done 2026-08-07 |
| 7 | Google domain allowlist available | ✅ Implemented; **set the value** before real use |
| 8 | Ask the questions in `docs/district-questions-draft.md` | ⏳ Owner decision |

Item 1 is not optional. A security reviewer who lands on an admin dashboard uninvited will not
finish reading §6, and the packet's own §1.3 pre-discloses it — which reads as candour in a
document and as a live finding on a website.

## Honest framing to keep

The packet's §9 is a deliberate 13-item disclosure of current limitations, and it should stay
that way. Its closing note is the right posture and worth preserving verbatim:

> "The developer would rather have the district find the gaps in §9 in this document than in the
> application."

Three §9 items are now closed by this session's work (§9.6 accommodations, §9.9 retention, and
the Clever scope mismatch that was not previously listed). **The largest one is not:** §9.2,
content coverage — 8 of 36 benchmarks have approved items. That is the honest reason the request
is for a single-classroom pilot rather than anything wider, and it should not be softened.
