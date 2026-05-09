# Civics Quest: Build the Republic — v3 Build Specification

**Florida 7th Grade Civics Mastery Learning Platform**
**Document type:** Product Requirements Document and autonomous build specification
**Prepared:** May 9, 2026
**Supersedes:** `civics_quest_eoc_optimized_prd.md` (v2)
**Primary audience:** Claude Code (autonomous coding agent)
**Secondary audience:** Arthur (developer-owner), curriculum reviewer, district reviewer
**Build directive:** Execute end-to-end through phased build. Run all audit checkpoints. Halt at any audit failure and report.

---

## Table of Contents

1. What Changed in v3 (Read First)
2. Build Directive for Claude Code
3. Project Setup and CLAUDE.md
4. Executive Summary
5. Product Vision
6. Key Product Decisions (v3)
7. Research Basis and EOC Assumptions
8. Goals, Non-Goals, and Success Criteria
9. User Roles and Permissions
10. Course, Curriculum, and Learning Architecture
11. EOC Alignment Matrix
12. Mastery, Assessment, and Remediation Model
13. Assessment Item Requirements
14. Diagnostic Remediation Logic
15. Spaced Retrieval Engine (NEW)
16. Reading-Load Ladder and Reading-as-Skill Track (NEW)
17. Confidence and Metacognition Layer (NEW)
18. Adaptive Difficulty (Within-Session) (NEW)
19. EOC Stamina and Test-Taking Strategy Track (NEW)
20. EOC-Score Calibration Feedback Loop (NEW)
21. Student Game-Based Portal
22. Teacher LMS Experience
23. Parent Portal
24. Content Approval Workflow
25. Data, Privacy, and District Readiness
26. Technical Architecture
27. Database Schema
28. Page-by-Page Sitemap
29. API and Service Requirements
30. EOC Review Mode: Republic Challenge
31. Accessibility, Differentiation, and Equity (Expanded)
32. MVP Scope
33. Full Build Roadmap
34. Acceptance Criteria
35. AI Coding Agent Implementation Instructions
36. Build Audit Checkpoints (NEW)
37. Open Questions / District Verification Checklist
38. Build Priority Summary
39. References and Source Links

**Appendices**
- A. Sample Mission Blueprint
- B. Sample Question Tagging Record
- C. Student-Facing Tone Guide
- D. Teacher-Facing Intervention Examples
- E. Misconception Inventory — Starter List of 50 (NEW)
- F. Vocabulary Tier List (NEW)
- G. Accommodations Matrix (NEW)
- H. Claude Code Workflow Guide (NEW)

---

## 1. What Changed in v3 (Read First)

This version is a structural revision of v2. Most v2 content is preserved. The following are the substantive changes the coding agent must understand before beginning:

| Area | v2 | v3 |
|---|---|---|
| Spaced review | Vague mention of "spiral review" added to mission flow | Real **Spaced Retrieval Engine** using SM-2 algorithm with daily review queue (Section 15) |
| Mastery pacing | Strict gates only | Strict gates **with structured off-ramp** after 3 failed attempts plus completed remediation; gap remains visible in dashboards and spaced review (Section 12.4) |
| Difficulty | Static thresholds only | **Within-session adaptive difficulty** (3-correct bumps up, 3-incorrect bumps down with worked example) (Section 18) |
| Reading load | Mentioned generically | **Reading-Load Ladder** as a first-class dimension; reading skills as their own progression (Section 16) |
| Metacognition | Not present | **Confidence ratings** required on Mastery Challenges and Republic Challenge; drives diagnosis of knowledge-gap vs misconception (Section 17) |
| Stamina/test-taking | Final simulation only | **Stamina ladder** across the year + explicit **test-taking strategy missions** (Section 19) |
| EOC feedback loop | Not present | Schema and methodology to **calibrate the platform's readiness model against actual EOC outcomes** in year 2+ (Section 20) |
| Misconception inventory | Schema only | **50-entry starter list** in Appendix E, organized by reporting category, ready for distractor authoring |
| Vocabulary | Generic | Explicit **Tier 2 (academic) and Tier 3 (civics)** lists in Appendix F |
| Accommodations | Listed as features | **First-class student-profile attributes** that flow through every assessment; Appendix G matrix |
| Equity in MVP | Deferred | Read-aloud (Web Speech API), sentence chunking, tier-2 vocab support **in MVP**; L1 glosses (Spanish, Haitian Creole) phased to align with full course expansion |
| Engagement model | Heavy on competence | Adds **autonomy** (constrained choice within unit) and **relatedness** (class-level Republic building, peer-explanation prompts) per self-determination theory |
| Content approval workflow | Approval on every item | **Trust tiers** (FDOE released items auto-approved at import; AI drafts always require review; teacher-authored optionally bulk-approvable) plus **bulk approve-by-tag** operations |
| Build audits | Implicit | **Explicit audit checkpoints** at each phase (Section 36) the agent must run before proceeding |

If anything in v3 conflicts with v2, v3 wins.

---

## 2. Build Directive for Claude Code

Read this section before any code is touched.

### 2.1 How to Execute This Document

This document is the single source of truth for the Civics Quest build. The expectation is that you will:

1. Read this document end-to-end before beginning. Do not skim.
2. Inspect the existing repository at the project root to understand current code, package manager, framework choices, and any prior `CLAUDE.md` or seed data.
3. Create or update `CLAUDE.md` at repo root using the template in Section 3.
4. Build in **phase order** (Section 33). Do not skip ahead.
5. At each phase boundary, run the **Audit Checkpoint** for that phase (Section 36). Do not begin the next phase if any audit item fails.
6. When uncertain about a requirement, prefer the more conservative interpretation (more privacy, more accessibility, more teacher control, more student wellbeing).
7. When you find that this document is genuinely silent on a decision, propose two options with tradeoffs and stop for input rather than guessing on something material.

### 2.2 Decisions That Are Already Made — Do Not Substitute

The following choices have been deliberated and finalized. Implement as specified.

- **Spaced repetition algorithm:** SM-2. Do not substitute FSRS or other algorithms.
- **Mastery threshold:** 80% for Mastery Challenge and reassessments.
- **Pacing off-ramp:** After 3 failed mastery attempts plus completed remediation, mark benchmark as "Exposure Complete — Continued Spiral Review" and unlock the next benchmark. Gap stays visible.
- **Within-session adaptation rule:** 3-correct bumps complexity up; 3-incorrect bumps down with a worked example.
- **Confidence ratings:** Required on Mastery Challenges and Republic Challenge items. Optional/teacher-toggle on practice. Three levels: "Not sure," "Pretty sure," "Very sure."
- **Database:** PostgreSQL. SQLite acceptable only for local prototype.
- **Auth:** Clever-first SSO; Google fallback. Mock/dev auth allowed when production credentials are unavailable.
- **Frontend:** React/Next.js. Tailwind for styling.
- **Server-side grading:** All grading and unlock decisions happen server-side. Never trust the client.
- **Read-aloud in MVP:** Browser-native Web Speech API. No paid TTS service required.
- **L1 glosses:** Schema in MVP; content delivery deferred to Phase 4 (Spanish first, Haitian Creole second).

### 2.3 Stop and Ask Before

- Adding any new external paid service or SaaS dependency.
- Deviating from PostgreSQL or the auth provider order.
- Introducing third-party state-management libraries beyond what comes with Next.js.
- Adding analytics or telemetry that transmits any student data outside the app's own database.
- Touching anything labeled "Phase X" before phase X-1 audit has passed.

### 2.4 Things to Build Even Though They Are Not Explicitly Requested

- A health-check endpoint at `/api/health`.
- Migration files for every schema change (no destructive direct edits).
- Environment-variable validation on app boot using a typed schema (Zod or equivalent).
- A `seed/` directory with idempotent seed scripts.
- Integration tests for the assessment engine, mastery engine, remediation engine, and spaced retrieval scheduler.
- A `docs/` directory for architecture notes, ADRs (architecture decision records), and runbook.

---

## 3. Project Setup and CLAUDE.md

Create or update `CLAUDE.md` at repo root with the following content. This is what Claude Code will read on every subsequent session and is the agent's standing instructions.

### 3.1 CLAUDE.md Template

```
# Civics Quest — Standing Instructions for Claude Code

## What this project is
Civics Quest is a Florida 7th Grade Civics mastery-learning platform with an EOC-readiness focus. Students experience it as a game ("Build the Republic"). Teachers experience it as an LMS with deep analytics.

## Source of truth
The build specification is `civics_quest_v3_build_spec.md` at repo root. When in doubt, that document wins.

## Non-negotiable rules
1. All grading and unlock decisions happen server-side. The client is never trusted.
2. Answer keys must never be exposed to the client before submission.
3. Every question must be tagged: benchmark, reporting_category, cognitive_complexity, stimulus_type, skill_tag, misconception_tag, remediation_tag, approval_status.
4. Mastery threshold is 80%. Off-ramp after 3 failed attempts + remediation.
5. Spaced repetition uses SM-2.
6. Confidence ratings required on Mastery Challenges and Republic Challenge.
7. Build in phase order. Run the audit checkpoint at each phase boundary.
8. PostgreSQL only. Clever-first SSO with Google fallback.
9. No analytics or telemetry that sends student data outside this app's own database.
10. Accessibility is a first-class requirement, not a polish item.

## Current build phase
[Update this every time you finish a phase. Format: "Phase N — In Progress" or "Phase N — Complete, audit passed YYYY-MM-DD"]

## Last action
[Update this at the end of every session with what was just done and what should be next.]

## Open questions
[Add any decisions that the spec was silent on and you had to make a judgment call on. Surface for human review.]
```

### 3.2 Required Repo Structure

```
/
├── CLAUDE.md
├── civics_quest_v3_build_spec.md
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── seed/
│   ├── benchmarks.ts
│   ├── reporting_categories.ts
│   ├── misconception_inventory.ts
│   ├── vocabulary.ts
│   └── sample_questions_unit_1.ts
├── src/
│   ├── app/                    # Next.js routes
│   ├── components/
│   ├── lib/
│   │   ├── assessment/
│   │   ├── mastery/
│   │   ├── remediation/
│   │   ├── spaced-retrieval/
│   │   ├── adaptive-difficulty/
│   │   ├── eoc-analytics/
│   │   └── auth/
│   ├── server/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── architecture.md
    ├── adrs/
    └── runbook.md
```

---

## 4. Executive Summary

Civics Quest: Build the Republic is a mastery-based, game-themed learning platform for Florida 7th Grade Civics. It serves as the primary classroom hub for instruction, practice, assessment, remediation, review, progress tracking, teacher decision-making, and Florida Civics EOC preparation.

The student-facing experience is a civics adventure game. Students complete benchmark missions, receive briefings, train with practice activities, fight mastery challenges, earn badges, build regions of a digital republic, and unlock new content only after demonstrating mastery.

The teacher, admin, and parent-facing experience is a formal learning management system providing visibility into benchmark mastery, EOC readiness, assessment history, remediation needs, classwide trends, common misconceptions, and student progress.

The platform is an **EOC-readiness engine disguised as a fun civics game**. Every lesson, practice activity, question, remediation path, badge, dashboard, and readiness metric connects back to Florida's Civics and Government benchmarks, EOC reporting categories, item specifications, and expected student thinking. v3 adds explicit learning-science instrumentation: spaced retrieval, confidence calibration, adaptive difficulty, reading-load progression, and a feedback loop from real EOC outcomes back into the readiness model.

### Core Product Rule
Students may move independently through the curriculum only after demonstrating benchmark mastery. If a student does not master a benchmark after 3 attempts plus completed remediation, the system marks the benchmark "Exposure Complete — Continued Spiral Review" and unlocks the next benchmark while keeping the gap visible in dashboards and the daily spaced-review queue.

### Core EOC Rule
Every mission, question, remediation activity, review challenge, and dashboard metric must be tagged to Florida Civics EOC expectations: benchmark code, reporting category, cognitive-complexity level, stimulus type, reading-load level, misconception tag, and remediation skill.

### Core Learning-Science Rule
Every benchmark mastered enters the spaced retrieval queue. Every Mastery Challenge captures confidence data. Every assessment is calibrated against actual EOC outcomes when those become available.

---

## 5. Product Vision

The platform should help a 7th grade Civics teacher run the course with a blend of:

1. **Standards-based instruction** aligned to Florida SS.7.CG benchmarks.
2. **Mastery learning** that prevents students from advancing with major gaps without leaving them stuck for weeks.
3. **Game-based motivation** that makes repeated practice feel purposeful.
4. **EOC-style assessment practice** woven throughout the year, not crammed at the end.
5. **Learning-science-grounded design** so that retention, transfer, and metacognitive accuracy are systematically supported.
6. **Actionable teacher analytics** that quickly identify who needs help, what they missed, and what intervention should happen next.

Desired student experience:

> "I am on a mission to build and defend a republic. Every civics concept I master unlocks new parts of the republic, sticks with me through daily training, and prepares me for the final Republic Challenge."

Desired teacher experience:

> "I can see exactly which benchmarks, reporting categories, concepts, and question types each student has mastered, which they are forgetting, and which I need to act on this week."

---

## 6. Key Product Decisions (v3)

| Input / Constraint | Product Decision |
|---|---|
| Primary users | 7th grade Civics students, teacher/admin, parents/guardians |
| District context | Palm Beach County School District |
| Login priority | Clever first; Google second/fallback |
| Student experience | Game-based Civics portal |
| Teacher / parent experience | Formal LMS-style dashboards |
| Student pacing | Independent progression after mastery; structured off-ramp after 3 attempts + remediation |
| Assessment use | Progression through curriculum; internal to site only |
| EOC purpose | Maximize readiness for Florida Civics EOC |
| Assessment format | Primarily multiple choice and EOC-style; other items must be system-gradable |
| Required item style | Scenario, source, excerpt, chart, table, timeline, diagram, map, and political-cartoon style items when appropriate |
| Remediation rule | Required before next benchmark unlocks; off-ramp available after 3 attempts |
| Remediation style | Diagnostic remediation based on missed skill, misconception, stimulus type, and cognitive-complexity level |
| Spaced retrieval | SM-2 algorithm; daily review queue; alternate items drawn from same skill/misconception tag |
| Adaptive difficulty | Simple within-session rule in MVP (3-correct/3-incorrect); full IRT in Phase 5 |
| Confidence ratings | Required on Mastery Challenges and Republic Challenge; optional on practice |
| Reading-load progression | Stimulus levels 1-3 per benchmark; mastery requires success at level 2 minimum |
| Content rule | Student-facing content must be pre-approved before publication; trust tiers reduce burden |
| Question bank rule | Tagged by benchmark, reporting category, cognitive complexity, stimulus type, reading-load level, misconception, remediation target, source |
| Devices | Chromebook-first responsive design |
| Accessibility | WCAG 2.1 AA target; read-aloud and sentence chunking in MVP |
| L1 support | Spanish glosses Phase 4; Haitian Creole Phase 5 |
| Privacy | Minimize student data; FERPA/COPPA aware; SSO integration; no third-party analytics on student data |

---

## 7. Research Basis and EOC Assumptions

### 7.1 Official Florida Resources to Use as Source of Truth

| Source | Use in Product |
|---|---|
| Florida Department of Education Civics and Government Resources | Standards, instructional guides, course resources, civics literacy resources |
| FDOE Grades 6-8 Civics and Government Instructional Guide (Feb 2026) | Benchmark clarifications, connecting benchmarks, vocabulary, misconceptions, instructional guidance |
| Civics EOC Assessment Test Item Specifications | Item format, alignment rules, stimulus guidance, content limits, cognitive-complexity expectations |
| Test Design Summary and Blueprint: State Academic Standards for Social Studies | Reporting categories and weighting |
| Civics Reporting Category Statements | Student-facing and teacher-facing grouping of standards |
| Civics EOC Spring 2024 Released Test Items and Answer Key | Model item style, stimulus use, phrasing, EOC-like practice design |
| Florida Citizen / Lou Frey Institute resources | Supplemental civics practice and teacher resource links |
| District policies and SSO requirements | Clever, Google, student data, parent portal, hosting, privacy, accessibility constraints |

### 7.2 Learning-Science Foundations Used in v3

The platform's design choices are grounded in the following research traditions. Implementation should remain faithful to the underlying findings:

| Principle | Source Tradition | Where Used in Product |
|---|---|---|
| Spaced retrieval / spacing effect | Ebbinghaus, Cepeda, Karpicke, Roediger | Section 15 (Spaced Retrieval Engine) |
| Testing effect / retrieval practice | Roediger, Karpicke | Frequent low-stakes formative testing throughout |
| Pre-testing effect | Richland, Kornell, Kao | Mission Pre-Check step before instruction (Section 10.4) |
| Interleaving | Rohrer, Taylor | Mixed Mission and Republic Challenge modes (Section 30) |
| Worked example effect / fading | Sweller, Renkl | Within-session adaptation drops to worked examples on failure (Section 18) |
| Metacognitive calibration | Bjork, Dunlosky | Confidence ratings (Section 17) |
| Self-determination theory | Deci, Ryan | Engagement design (Section 21) |
| Desirable difficulties | Bjork | Mastery threshold and reading-load ladder calibration |

### 7.3 EOC Reporting Categories

| Reporting Category | Approximate Blueprint Weight | Product Implication |
|---|---:|---|
| Origins and Purposes of Law and Government | 25-30% | Frequent source/excerpt work with founding ideas, founding documents, Enlightenment influence, colonial concerns, Declaration of Independence, Articles of Confederation, Constitution, limits on government |
| Roles, Rights, and Responsibilities of Citizens | 25-30% | Strong emphasis on rights, responsibilities, citizenship, Bill of Rights, due process, civic participation, media, public opinion, elections, public policy |
| Government Policies and Political Processes | 15-20% | Practice with public policy, political parties, interest groups, media influence, bias, policy problem-solving, civic action scenarios |
| Organization and Function of Government | 20-25% | Heavy practice with branches, federalism, courts, lawmaking, amendments, Electoral College, levels of government, constitutional structures |

The exact official blueprint must be re-verified before production; the platform should architect categories as a configurable lookup, not hard-coded percentages.

### 7.4 Cognitive Complexity Expectations

| Cognitive Complexity | Target Range | Product Meaning |
|---|---:|---|
| Low | 15-25% | Recall definitions, identify examples, match terms, recognize basic facts |
| Moderate | 45-65% | Interpret scenarios, explain relationships, connect concepts, analyze charts/timelines/excerpts |
| High | 15-25% | Evaluate civic situations, compare arguments, apply principles to unfamiliar contexts, analyze complex stimuli |

### 7.5 EOC Item Design Principles

- Multiple choice as primary format, since the EOC is multiple choice.
- Real-world or historically grounded contexts.
- Stimuli include excerpts, charts, tables, maps, flowcharts, diagrams, timelines, political cartoons, short scenarios, primary-source passages.
- Clear stems with one best answer.
- No trick questions; distractors should reveal misconceptions, not random confusion.
- Each distractor tagged to a likely misconception when possible (use Appendix E inventory).
- Reading level appropriate to grade 7 while preserving necessary civics vocabulary.
- Immediate learning feedback in practice mode; protected answer keys in secure mastery and review modes.

---

## 8. Goals, Non-Goals, and Success Criteria

### 8.1 Product Goals

- Teach all required Florida 7th Grade Civics SS.7.CG benchmarks through structured, student-friendly lessons.
- Prepare students for the Florida Civics EOC using repeated, benchmark-aligned, EOC-style practice.
- Use assessment results to control progression through the curriculum.
- Require remediation before students move past underperforming benchmarks; provide structured off-ramp to prevent stuck-student failure mode.
- Maintain mastered-benchmark retention through systematic spaced retrieval.
- Build students' metacognitive accuracy through confidence calibration.
- Train test stamina and test-taking strategy explicitly.
- Provide real-time teacher visibility into mastery, retention, misconceptions, question performance, and intervention needs.
- Provide parent/guardian visibility into student progress when feasible.
- Make the student platform entertaining, age-appropriate, and motivating without weakening academic rigor.
- Keep all student-facing instructional and assessment content pre-approved.

### 8.2 EOC Performance Goals

- Students repeatedly practice the same thinking demanded by the EOC: interpreting sources, applying constitutional principles, analyzing civic scenarios, distinguishing levels/branches of government, identifying rights/responsibilities.
- Students build stamina with cumulative mixed review throughout the year.
- Students see their readiness in a way that motivates growth without creating test anxiety.
- Teachers can answer: Which benchmarks are weak? Which reporting categories are weak? Which item types are weak? Which students are forgetting previously mastered material? Which students need intervention today?
- The platform's readiness score is calibrated against actual EOC outcomes year-over-year.

### 8.3 Non-Goals for Initial Build

- External gradebook sync.
- Live AI-generated student-facing instruction without teacher approval.
- Long-form written response items (the EOC is primarily multiple choice).
- Storing unnecessary student personal data.
- Building the full course before proving the complete learning loop with an MVP unit.
- Game mechanics that reward speed over mastery.
- Exposing answer keys or item-level secure data to students or parents.
- Public leaderboards that shame struggling students.
- Third-party analytics on student data.

### 8.4 Success Criteria

| Measure | Target |
|---|---|
| Instructional coverage | All SS.7.CG benchmarks represented with approved lesson, practice, assessment, remediation, EOC review content |
| Question bank | 30 approved questions per benchmark in full build, larger pool for high-weight benchmarks |
| EOC tagging | 100% of questions tagged by benchmark, reporting category, cognitive complexity, stimulus type, reading-load level, misconception, remediation skill |
| Progression reliability | No student can unlock the next benchmark without meeting mastery, completing the off-ramp path, or receiving teacher override |
| Remediation reliability | Failed mastery attempts assign targeted remediation before reassessment |
| Spaced retention | Mastered benchmarks enter the spaced retrieval queue within 24 hours |
| Confidence calibration | Calibration data captured on every Mastery Challenge submission |
| Teacher usefulness | Teacher can identify underperforming benchmarks and students needing remediation within two clicks |
| EOC readiness visibility | Teacher and student dashboards show readiness by benchmark and reporting category |
| Student clarity | Student dashboard clearly shows current mission, daily review queue, next required action, mastery status, EOC readiness progress |
| Engagement | Students regularly complete missions, practice attempts, daily review, and challenges |
| Accessibility | Core workflows function on Chromebooks; keyboard navigation, readable fonts, captions/transcripts, screen reader needs, read-aloud, sentence chunking all work |

---

## 9. User Roles and Permissions

| Role | Primary Capabilities | Restrictions |
|---|---|---|
| Student | View assigned missions, complete lessons/practice/assessments/remediation/daily review, view own badges/progress/EOC readiness meter | Cannot edit content, view other students, bypass locks, view answer keys, see exact secure item tags before submission |
| Teacher | Manage classes, assign content, view dashboards, approve/edit content, override locks, reset attempts, view reports, create/edit questions | Cannot access unrelated classes unless granted |
| Parent/Guardian | View linked student progress, current benchmark, remediation status, recent assessment summary, suggested at-home review | Cannot see answer keys, other students, internal teacher-only notes, item-level distractor analysis unless explicitly shared |
| Admin / Curriculum Manager | Manage benchmark library, global content, user roles, district configuration, question approval, reporting, item bank quality | Limited to trusted accounts |
| AI Content Assistant / Agent | May draft content, questions, scenarios, remediation items | Generated content remains Draft/Needs Review until human approval |

---

## 10. Course, Curriculum, and Learning Architecture

### 10.1 Course Unit Structure

| Unit | Benchmark Range | Theme | Game Region |
|---|---|---|---|
| Unit 1: Foundations of American Government | SS.7.CG.1.1-1.6 | Origins, founding ideas, Enlightenment, British policies, Declaration of Independence | Founders' Harbor |
| Unit 2: Creating and Limiting Government | SS.7.CG.1.7-1.11 | Articles of Confederation, Constitution, Preamble, limited government, rule of law, ratification | Constitution Forge |
| Unit 3: Citizenship, Rights, and Responsibilities | SS.7.CG.2.1-2.5 | Citizenship, obligations, Bill of Rights, rights limits, trial process | Rights District |
| Unit 4: Participation and Public Influence | SS.7.CG.2.6-2.10 | Elections, media, interest groups, bias, public policy problem solving | Civic Square |
| Unit 5: Constitutional Structure and Federalism | SS.7.CG.3.1-3.5 | Constitutional republic, federalism, branches, state/national relationship, amendment process | Federalism Frontier |
| Unit 6: Rights Expansion, Branches, Courts, and Law | SS.7.CG.3.6-3.12 | Voting amendments, branches, law types, Supreme Court cases, trial/appellate courts | Justice Citadel |
| Unit 7: Government Services, Electoral College, and Economics | SS.7.CG.3.13-3.15 | Government obligations, Electoral College, capitalism/free market vs. government-controlled systems | Republic Summit |

### 10.2 Reporting Category Overlay

| Product Layer | Student Language | Teacher/EOC Language |
|---|---|---|
| Course | Republic Campaign | Florida 7th Grade Civics Course |
| Unit | Region of the Republic | Benchmark cluster / instructional unit |
| Benchmark | Mission | SS.7.CG benchmark |
| Lesson | Briefing | Instructional content |
| Practice | Training | Formative practice |
| Assessment | Mastery Challenge / Boss Challenge | Benchmark mastery assessment |
| Remediation | Training Mission | Targeted intervention |
| Daily review | Daily Republic Drill | Spaced retrieval queue |
| Cumulative Review | Republic Challenge | EOC readiness review |
| Readiness Metric | Republic Strength Meter | EOC readiness by benchmark/reporting category |

### 10.3 Benchmark Object Requirements

Each benchmark record must include:

- Benchmark code, title, reporting category.
- Official benchmark clarifications.
- Student-friendly learning target.
- Vocabulary and definitions (Tier 2 and Tier 3 from Appendix F).
- Related/connecting benchmarks.
- Common misconceptions (linked to Appendix E inventory).
- Primary and supplemental resources.
- Instructional strategies.
- Lesson summary and learning scale.
- Approved lesson steps.
- Question bank with full tagging.
- Remediation activities.
- Reading-load tier coverage targets.
- Cognitive-complexity targets.
- Stimulus type coverage targets.
- Approval status and version history.

### 10.4 Mission Template (v3 — adds pre-check, daily review entry)

Every benchmark mission follows this student learning loop:

1. **Mission Pre-Check (NEW):** 2-3 ungraded questions before instruction. Frame as scouting. Captures pre-instruction baseline; does not affect mastery score.
2. **Mission Briefing:** Short, student-friendly introduction with the civic problem or historical context.
3. **Key Terms Unlock:** Vocabulary in context, with Tier 2 academic verbs treated as a parallel mini-track.
4. **Guided Training:** Interactive lesson steps, examples, checks for understanding.
5. **Scenario Lab:** Apply concept to a civic situation, historical situation, source, chart, flowchart, or map. Reading-load level 1-2.
6. **Source Quest (when applicable):** Excerpt analysis at the appropriate reading-load tier.
7. **Readiness Check:** Short formative quiz that determines whether the Mastery Challenge unlocks.
8. **Mastery Challenge:** EOC-style benchmark assessment at reading-load level 2 minimum, with confidence ratings required.
9. **Victory / Remediation / Off-Ramp:** Unlock next mission if mastered; assign training mission if not; after 3 failed attempts plus remediation, mark "Exposure Complete" and unlock next.
10. **Spaced Review Entry (NEW):** Mastered benchmark immediately enters the SM-2 spaced retrieval queue.

---

## 11. EOC Alignment Matrix

| Alignment Field | Required? | Description |
|---|---:|---|
| Benchmark code | Yes | SS.7.CG.x.x |
| Reporting category | Yes | EOC reporting category |
| Clarification | Yes | Official benchmark clarification supported by content/item |
| Student-friendly target | Yes | Plain-language learning goal |
| Cognitive complexity | Yes | Low, moderate, or high |
| Stimulus type | Yes | None, excerpt, chart, map, table, flowchart, timeline, political cartoon, diagram, scenario, image |
| Reading-load level | Yes (NEW) | 1 (paraphrase + glossary), 2 (chunked excerpt), 3 (raw passage) |
| Civic thinking skill | Yes | Recall, compare, classify, infer, evaluate, apply, sequence, source analysis, cause/effect, constitutional reasoning |
| Misconception tag | Yes (strengthened) | Reference an entry from the Appendix E inventory; link distractor → misconception |
| Remediation tag | Yes | Skill path assigned after failure |
| Item source | Yes | Teacher-created, AI-draft approved, released-style model, official resource, district-created |
| Approval status | Yes | Draft, Needs Review, Approved, Needs Revision, Archived |
| Version | Yes | Supports audits and updates |

---

## 12. Mastery, Assessment, and Remediation Model

### 12.1 Student Benchmark Flow (v3 — adds off-ramp and spaced entry)

1. Student opens current unlocked benchmark mission.
2. Student completes Mission Pre-Check (ungraded).
3. Student completes briefing and required lesson steps.
4. Student completes vocabulary/concept practice.
5. Student completes scenario/source-based practice activity.
6. Student completes a formative readiness check.
7. If readiness met, student takes the benchmark Mastery Challenge with confidence ratings.
8. If mastery threshold met (80%), next benchmark unlocks, badge awarded, benchmark enters spaced retrieval queue.
9. If mastery threshold not met, next benchmark remains locked and remediation is assigned based on missed skill/misconception/stimulus tags.
10. Student completes targeted remediation.
11. Student takes alternate reassessment from the same skill/benchmark pool.
12. **If 3 failed attempts plus completed remediation:** benchmark marked "Exposure Complete — Continued Spiral Review." Next benchmark unlocks. Gap remains visible. Benchmark enters spaced retrieval queue at higher frequency. Teacher dashboard flags student for conference.
13. Teacher can override at any point.

### 12.2 Student Status Rules

| Status | Rule | System Behavior |
|---|---|---|
| Not Started | No activity | Tile available or locked depending on sequence |
| In Progress | Lesson/practice started | Returns to last unfinished activity |
| Ready for Mastery Check | Lesson complete and practice threshold met | Mastery assessment unlocks |
| Needs Remediation | Mastery check below threshold | Next benchmark locked; targeted remediation assigned |
| Remediation Complete | Required remediation finished | Alternate reassessment unlocks |
| Mastered | Meets mastery threshold | Next benchmark unlocks; badge awarded; benchmark enters spaced queue |
| Exposure Complete (NEW) | 3 failed attempts + completed remediation | Next benchmark unlocks; gap visible; high-frequency spaced review; teacher flagged |
| Teacher Override | Teacher manually unlocks/marks complete | Audit log records reason and teacher ID |
| Intervention Required | Repeated failure or misconception pattern | Teacher dashboard flags for conference, small group, direct instruction |

### 12.3 Default Thresholds

| Activity | Default Threshold | Notes |
|---|---:|---|
| Lesson completion | 100% required steps | Includes videos, notes, checks, required interactions |
| Training practice | 70% | Readiness only; not mastery |
| Scenario/source lab | 70% | Required before Mastery Challenge where applicable |
| Benchmark Mastery Challenge | 80% | Required to unlock next benchmark via mastery path |
| Remediation reassessment | 80% | Use alternate approved item set |
| Unit review challenge | 75-80% | Teacher-controllable |
| EOC readiness challenge | 80% | Used for cumulative review and readiness reporting |
| Off-ramp trigger | 3 failed mastery attempts + completed remediation | Auto-unlocks next; flags teacher |

### 12.4 Off-Ramp Mechanics (NEW)

The off-ramp prevents the most common failure mode of strict mastery learning: a student stuck on one benchmark for weeks while peers advance.

**When triggered:**
- Three Mastery Challenge attempts at or below threshold,
- AND remediation completed for each missed skill,
- AND at least 7 days elapsed since first attempt.

**What happens:**
- Benchmark status set to `EXPOSURE_COMPLETE`.
- Next benchmark unlocks normally.
- Benchmark enters spaced retrieval queue at higher frequency (interval halved).
- Teacher dashboard flags student with `OFF_RAMP_TRIGGERED` indicator.
- Student-facing language: "You've worked hard on this mission. We're moving you forward, and this topic will return in your daily training so you can keep building it."
- Off-ramp is logged with timestamps and remediation history.

**What it is not:**
- Not failure. Not punishment. Not a lower mastery rating in dashboards (it shows as a distinct status).
- Not permanent. Student can return to the benchmark at any time and take another Mastery Challenge.

### 12.5 Assessment Types

| Assessment Type | Purpose | Student Name | Teacher Name |
|---|---|---|---|
| Pre-check | Pre-instruction baseline | Mission Scout | Pre-test |
| Vocabulary mini-check | Check key civics terms | Word Builder | Vocabulary Check |
| Readiness check | Determine whether Mastery Challenge unlocks | Training Check | Formative Check |
| Benchmark assessment | Prove mastery of one benchmark | Mastery Challenge | Benchmark Assessment |
| Alternate reassessment | Retake after remediation | Second Chance Challenge | Alternate Benchmark Reassessment |
| Daily spaced review | Maintain mastered benchmarks | Daily Republic Drill | Spaced Retrieval Drill |
| Unit review | Review all benchmarks in a unit | Region Challenge | Unit Assessment |
| Mixed cumulative review | Spiral EOC practice | Republic Challenge | EOC Readiness Review |
| Stamina challenge | Build test endurance | Endurance Trial | Stamina Practice |
| Full EOC simulation | Practice stamina and blueprint distribution | Final Republic Trial | EOC Simulation |

---

## 13. Assessment Item Requirements

### 13.1 Supported Item Types

| Item Type | Use Case | System-Graded? | MVP Priority |
|---|---|---:|---:|
| Multiple choice | Primary EOC-aligned format | Yes | High |
| Scenario-based multiple choice | Apply civic principles to real-life examples | Yes | High |
| Source/excerpt multiple choice | Analyze primary sources, quotes, passages | Yes | High |
| Image/chart/table multiple choice | Interpret visuals and data | Yes | High |
| Flowchart/process multiple choice | Lawmaking, elections, courts, amendments, government processes | Yes | High |
| Timeline multiple choice | Sequence events, historical development | Yes | Medium |
| Matching | Terms, documents, rights, branches, concepts | Yes | Medium |
| Sequencing | Order events or process steps | Yes | Medium |
| Categorization | Sort examples into concepts, branches, rights, governments | Yes | Medium |
| Select all that apply | Advanced review; use carefully | Yes | Low for MVP |
| Short answer from word bank | Simple system-gradable check | Yes | Low for MVP |

### 13.2 Question Bank Target per Benchmark

| Question Category | Target Count Per Benchmark | Notes |
|---|---:|---|
| Vocabulary | 4 | Term-in-context, not only definition recall |
| Basic concept | 4 | Low to moderate complexity |
| Scenario application | 8 | Core EOC preparation category |
| Source/excerpt analysis | 4 | Founding documents, quotes, cases, laws, constitutional text |
| Chart/table/map/flowchart | 3 | Visual and process interpretation |
| Misconception check | 3 | Distractors tied to common student errors per Appendix E |
| EOC-style mixed review | 4 | Used in cumulative Republic Challenge |
| Total | 30 | Adjust upward for high-weight benchmarks |

Across the 30 questions per benchmark, distribution targets:
- Reading-load level 1: 30%
- Reading-load level 2: 50%
- Reading-load level 3: 20%
- Cognitive complexity: low 20%, moderate 55%, high 25%

### 13.3 Question Metadata Schema (v3 expanded)

Each question must include:

- Question ID, prompt/stem, optional stimulus reference.
- Stimulus type and reading-load level.
- Answer choices (each with feedback for practice and misconception tag).
- Correct answer.
- Benchmark code, reporting category, benchmark clarification.
- Cognitive complexity, difficulty estimate.
- Skill tag, remediation tag.
- Misconception tag (linked to Appendix E inventory).
- Assessment usage type(s): practice, mastery, alternate, daily review, republic challenge, simulation.
- Source/citation or creator.
- Approval status, version, last reviewed date.
- Reading-load alternates (a question may have a level-1 paraphrase, a level-2 chunked version, and a level-3 raw version stored as variants).

### 13.4 Secure Assessment Requirements

- All grading and unlock decisions happen server-side.
- Student clients never receive answer keys before submission.
- Practice feedback may explain concepts; secure mastery assessments reveal limited feedback unless teacher settings allow review.
- Reassessments draw from alternate approved questions tagged to same benchmark and skill but different question IDs.
- Item exposure limited by randomization and question pools where feasible.
- Teachers can retire, archive, or revise weak questions.

---

## 14. Diagnostic Remediation Logic

| Missed Pattern | Assigned Remediation | Unlock Condition |
|---|---|---|
| Vocabulary errors | Vocabulary Training: flashcards, examples/non-examples, short check | Pass vocabulary mini-check |
| Concept errors | Mini-Lesson Replay: simplified reteach with examples | Complete reteach and pass concept check |
| Scenario errors | Scenario Lab: guided civic situations and choice explanations | Pass scenario practice |
| Source-analysis errors at reading-load level 2+ | Primary Source Coach: chunked text, glossary, evidence question | Pass source practice at next-lower reading-load level, then repeat at level 2 |
| Chart/table/flowchart errors | Visual Evidence Lab: guided interpretation | Pass visual item practice |
| Repeated misconception (same Appendix E entry) | Misconception Fix: direct correction and example/non-example sorting | Pass misconception check |
| Low complexity missed | Basic reteach and vocabulary support | Pass lower-complexity check |
| Moderate/high complexity missed | Guided reasoning sequence with hints and worked examples | Pass application/analysis check |
| High confidence + wrong (NEW) | Misconception Fix prioritized; metacognitive recalibration prompt | Recalibration completed plus misconception check |
| Low confidence + wrong (NEW) | Concept reteach prioritized over misconception fix | Concept check passed |
| Two failed reassessments | Teacher Conference Flag / Small Group recommendation | Teacher action or override required |

### 14.1 Remediation Experience

Remediation is a short, focused training mission, not a punishment. It is:

- Short enough to complete in one sitting (10-15 minutes).
- Clearly connected to what the student missed.
- Encouraging and mastery-oriented.
- Supported with examples, non-examples, and immediate feedback.
- Followed by an alternate reassessment.

### 14.2 Teacher Intervention Recommendations

| Pattern | Dashboard Recommendation |
|---|---|
| Many students miss same benchmark | Whole-class reteach |
| Small group misses same misconception (Appendix E entry) | Small-group station with misconception-fix lesson |
| One student misses multiple vocabulary items | Vocabulary intervention |
| Student performs well on recall but poorly on scenarios | Scenario application practice |
| Student performs poorly on source items | Source-reading scaffold |
| Student repeatedly fails after remediation | Teacher conference and manual plan |
| Student shows over-confidence pattern (NEW) | Calibration coaching mini-lesson |
| Class showing decay on previously mastered benchmark (NEW) | Whole-class re-priming review |

---

## 15. Spaced Retrieval Engine (NEW)

### 15.1 Purpose

Mastered content is forgotten without rehearsal. The Spaced Retrieval Engine surfaces alternate items from previously mastered benchmarks at expanding intervals to maintain retention through the EOC.

### 15.2 Algorithm: SM-2 (selected; do not substitute)

For each (student, benchmark) pair, the system maintains:

- `repetition_count` (integer, starts at 0)
- `easiness_factor` (float, starts at 2.5, minimum 1.3)
- `interval_days` (integer, starts at 0)
- `due_at` (timestamp)
- `last_reviewed_at` (timestamp)
- `last_quality` (integer 0-5)

On each spaced review event, the student answers an alternate item from the benchmark. The agent grades the response and assigns a `quality` value:

- 5: Correct, high confidence ("Very sure")
- 4: Correct, medium confidence ("Pretty sure")
- 3: Correct, low confidence ("Not sure")
- 2: Incorrect, low confidence ("Not sure")
- 1: Incorrect, medium confidence ("Pretty sure")
- 0: Incorrect, high confidence ("Very sure") — high-priority misconception flag

Update rules:

```
if quality < 3:
    repetition_count = 0
    interval_days = 1
else:
    if repetition_count == 0:
        interval_days = 1
    elif repetition_count == 1:
        interval_days = 6
    else:
        interval_days = round(previous_interval_days * easiness_factor)
    repetition_count += 1

easiness_factor = max(1.3, easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

due_at = now + interval_days
```

### 15.3 Daily Republic Drill

- Surfaced on the student dashboard daily.
- Pulls items where `due_at <= now` for that student, ordered by oldest due first.
- Caps at 15 items per day to prevent overwhelm; remainder rolls to next day.
- Each item is an **alternate** to the original mastery item, drawn from the same benchmark and same skill_tag (or same misconception_tag where appropriate).
- Items presented in interleaved order across benchmarks (do not group by benchmark).
- Captures confidence rating per item.

### 15.4 Off-Ramp Benchmarks

For benchmarks with `EXPOSURE_COMPLETE` status, the spaced retrieval interval is halved (more aggressive review) until two consecutive correct-with-confidence reviews, after which standard SM-2 progression resumes.

### 15.5 Teacher View

Teacher dashboard surfaces:

- Per-class decay rate by benchmark (% of class showing recent quality < 3 on previously mastered).
- Per-student decay list ("benchmarks slipping").
- Class-wide spike alerts (a benchmark suddenly missing across many students suggests a need for whole-class re-priming).

### 15.6 Acceptance Criteria for Spaced Retrieval

- Mastered benchmark must enter the queue within 24 hours.
- Daily drill renders due items only.
- Quality calculation correctly maps confidence + correctness.
- Easiness factor never drops below 1.3.
- Off-ramp benchmarks use halved interval until recovery.
- Alternate items differ from original mastery item.

---

## 16. Reading-Load Ladder and Reading-as-Skill Track (NEW)

### 16.1 Why This Exists

The single biggest predictor of low Florida Civics EOC scores in mixed classrooms is reading load on stimulus passages, not civics knowledge. The platform treats reading skill as its own progression dimension.

### 16.2 Reading-Load Levels

| Level | Description | Example |
|---|---|---|
| 1 | Paraphrase or simple stem with glossary popovers; tier-2 academic verbs replaced with common synonyms | "The writer says people should be free. Which idea does this match?" |
| 2 | Chunked excerpt or moderate stem; tier-2 verbs preserved; key terms have glossary popovers | "According to the excerpt below, which principle did the colonists believe was being violated? [3-sentence chunked excerpt]" |
| 3 | Raw founding document passage or full EOC-style stem with no scaffolding | "Read the following passage from the Declaration of Independence. Which Enlightenment principle most directly supports the author's argument? [unmodified excerpt]" |

### 16.3 Mastery and Reading-Load Interaction

- Mastery Challenge items must be at reading-load level 2 minimum (cannot pass mastery on level-1-only).
- Approximately 20% of Mastery Challenge items should be level 3.
- Daily review and Republic Challenge mix all levels.
- Final Republic Trial is level 2 and 3 only, matching EOC reading expectations.

### 16.4 Source Decoder Track

A parallel mini-progression students level up over the year:

- Level 1: Highlight the question being asked. Find the answer-relevant sentence.
- Level 2: Paraphrase a passage in your own words. Identify claim vs. evidence.
- Level 3: Identify the author's purpose. Distinguish stated from implied.
- Level 4: Compare two sources. Evaluate evidence quality.

Source Decoder activities are:
- Their own missions in the game (not tied to a specific civics benchmark).
- Required prerequisites for level-3 stimulus content.
- Earn their own badge progression.
- Optional but strongly suggested for all students; required for students whose practice performance shows level-2-source struggles.

### 16.5 ELL and Below-Grade Reader Supports

When a student profile flags ELL or below-grade reading:

- Default reading-load level for non-mastery practice is 1 (can opt up).
- Glossary popovers for tier-2 verbs (Appendix F) auto-enabled.
- Sentence-chunking toggle defaults on.
- Read-aloud (Web Speech API) auto-available with one click.
- Phase 4+: Spanish or Haitian Creole gloss available on tier-3 civics terms.

---

## 17. Confidence and Metacognition Layer (NEW)

### 17.1 Why This Exists

Students with poor metacognitive accuracy (overconfidence on weak knowledge) perform worse on the EOC than students with equal knowledge but better calibration. The platform builds calibration explicitly.

### 17.2 Where Confidence Is Captured

| Context | Confidence Required? |
|---|---|
| Mission Pre-Check | No |
| Practice / Training | Optional, teacher-toggle |
| Readiness Check | Optional, teacher-toggle |
| Mastery Challenge | **Required** |
| Alternate Reassessment | **Required** |
| Daily Republic Drill | **Required** (drives SM-2 quality value) |
| Republic Challenge | **Required** |
| Final Republic Trial | **Required** |

### 17.3 Confidence Scale

Three levels presented as buttons before submitting an answer:

- "Not sure" (low confidence)
- "Pretty sure" (medium)
- "Very sure" (high)

Use plain language. Do not use percentages or numerical scales for 7th graders.

### 17.4 Calibration Feedback

After every Mastery Challenge submission, the student receives a calibration summary alongside their score:

- "On items where you said Very sure, you got X out of Y right."
- "On items where you said Not sure, you got X out of Y right."
- A simple 2-line graph showing calibration over time.
- Encouraging language about closing the gap.

### 17.5 Use in Diagnosis

The remediation engine consults confidence + correctness:

| Pattern | Interpretation | Routing |
|---|---|---|
| High confidence + correct | Solid knowledge | Standard spacing |
| High confidence + wrong | Misconception | Misconception Fix prioritized; Appendix E lookup; recalibration prompt |
| Low confidence + wrong | Knowledge gap | Concept reteach |
| Low confidence + correct | Lucky / fragile knowledge | Additional practice at same difficulty before progression |

### 17.6 Teacher Dashboard Surface

- Class average calibration accuracy.
- Students with overconfidence pattern (≥30% high-confidence incorrect responses).
- Students with underconfidence pattern (≥30% low-confidence correct responses).
- Per-benchmark breakdown of where confidence is poorly calibrated.

---

## 18. Adaptive Difficulty (Within-Session) (NEW)

### 18.1 MVP Rule (selected for MVP; full IRT deferred to Phase 5)

Within a single practice or scenario session (not Mastery Challenges, which are fixed):

- 3 correct in a row at current cognitive complexity → bump complexity up one level for next item.
- 3 incorrect in a row at current complexity → bump complexity down one level AND insert a worked example before the next item.
- After a worked example, present a near-transfer item at the same complexity. If correct, resume normal progression. If incorrect, escalate to remediation flow.

### 18.2 Worked Example Format

A worked example presents:
- The question.
- A step-by-step expert reasoning narrative (3-5 steps).
- Highlighting of the key cue in the stimulus.
- The correct answer with explanation.
- A "now try this" near-transfer item.

### 18.3 Out of Scope for MVP

- IRT-based item selection.
- Calibrated difficulty estimates per item.
- Adaptive Mastery Challenges (mastery items remain fixed-form for fairness).

---

## 19. EOC Stamina and Test-Taking Strategy Track (NEW)

### 19.1 Stamina Ladder

The actual EOC is a long, demanding test. Students should be progressively conditioned.

| Time of Year | Longest Single Sitting Expected |
|---|---|
| Aug-Oct | 10 questions |
| Nov-Dec | 15 questions |
| Jan-Feb | 20 questions |
| Mar | 30 questions |
| Apr | 40 questions |
| Late Apr / Early May | Full-length simulation (Final Republic Trial) |

Endurance Trials are scheduled cumulative reviews that match this length. Republic Challenge mode lets teachers configure session length.

### 19.2 Test-Taking Strategy Missions

A short side-track of 5-7 missions (not tied to specific benchmarks) that teach EOC-specific skills:

1. **Eliminate the Distractor:** Given an item with an obviously wrong choice, students practice the elimination motion.
2. **Evidence-Based Answers:** Practice citing the part of the stimulus that supports a choice.
3. **Watch the Words:** Stem keywords like "BEST," "EXCEPT," "MOST LIKELY" — practice spotting and using.
4. **Flag and Return:** Practice the discipline of flagging hard items and returning later.
5. **Time Management:** Practice pacing without rushing or stalling.
6. **Two-Pass Strategy:** Practice doing easy items first, then harder ones.
7. **Misconception Spotter:** Given a wrong answer, identify *why* it's tempting (turns Appendix E inventory into student-facing learning).

These missions earn their own badge track. Strongly suggested but not required for mastery progression.

### 19.3 Final Republic Trial

- Full-length simulation matching EOC blueprint weights.
- Reading-load levels 2 and 3 only.
- Confidence ratings required.
- No mid-test feedback.
- Results inform final readiness score, not gating.
- Teachers can configure: number of attempts allowed, whether students can review after, whether to release results immediately or after the class window.

---

## 20. EOC-Score Calibration Feedback Loop (NEW)

### 20.1 Purpose

The platform's "Republic Strength" readiness score is an internal estimate. Once cohorts begin taking the actual EOC, the platform should learn from real outcomes to improve future predictions.

### 20.2 Schema Requirements (build now, populate later)

Database table `eoc_actual_scores`:

- student_id (FK)
- school_year
- scaled_score (integer, when available and permitted)
- achievement_level (1-5, when available)
- entered_by (teacher_id or admin_id)
- entered_at
- consent_acknowledged (boolean, district policy gate)

Database table `eoc_calibration_runs`:

- run_id
- school_year analyzed
- correlation_readiness_to_scaled (float)
- correlation_by_reporting_category (json)
- correlation_by_stimulus_type (json)
- correlation_by_complexity (json)
- recommended_weight_changes (json)
- run_at

### 20.3 Calibration Methodology

After scores arrive (typically June-July):

1. Pull all (student, readiness_snapshot, actual_score) tuples for the cohort.
2. Compute correlations across reporting categories, stimulus types, cognitive complexity, reading-load levels, and confidence calibration.
3. Identify which platform signals are predictive vs. noise.
4. Recommend weight adjustments for the readiness model.
5. Surface findings in admin dashboard for human review and manual approval before applying.

### 20.4 Privacy Constraints

- Actual EOC scores must be entered with district consent.
- Scores are aggregated for calibration; not displayed in student-facing UI.
- Student-level scores accessible only to admin role.
- Cohort calibration runs surfaced to admin and teacher roles.

### 20.5 Year-One Behavior

In year one, no actual scores exist yet. The readiness model uses default weights. Schema is in place. The dashboard shows "Calibration: Awaiting first cohort outcomes."

---

## 21. Student Game-Based Portal

### 21.1 Game Objects

| Academic Object | Game Object |
|---|---|
| Course | The Republic Campaign |
| Unit | Region / District of the Republic |
| Benchmark | Mission |
| Lesson | Briefing |
| Practice | Training |
| Scenario practice | Scenario Lab |
| Source analysis | Primary Source Quest |
| Assessment | Mastery Challenge / Boss Challenge |
| Remediation | Training Mission |
| Daily spaced review | Daily Republic Drill |
| EOC Review | Republic Challenge |
| EOC Simulation | Final Republic Trial |
| Mastery | Badge / Star / Unlock |
| Reporting category mastery | Republic Pillar Strength |
| Source Decoder track | Source Decoder ranks |
| Test-taking strategy track | Strategist ranks |

### 21.2 Student Ranks

| Rank | Meaning |
|---|---|
| Citizen-in-Training | Starting rank |
| Rights Defender | Mastered rights/citizenship topics |
| Constitution Builder | Mastered founding/structure topics |
| Branches Strategist | Mastered branches/federalism topics |
| Justice Guardian | Mastered courts/law topics |
| Policy Problem Solver | Mastered participation and public policy topics |
| Republic Guardian | Course/EOC readiness complete |

### 21.3 Student Home Screen Requirements

- Current mission.
- **Daily Republic Drill** (NEW, prominent placement) with item count and "play" CTA.
- Next required action.
- Progress bar.
- Locked/unlocked missions.
- Badges and ranks.
- EOC readiness meter (with confidence interval shown as a range, e.g., "Republic Strength: 72-78%").
- Reporting category pillar strength.
- Recent wins.
- Current remediation task, if any.
- Encouraging explanation of why a mission is locked.
- Clear button to continue from last saved step.
- Pause-point suggestion when 5 minutes remain in a typical class period (configurable).

### 21.4 Self-Determination Theory Mechanics (v3 expanded)

Engagement design balances autonomy, competence, and relatedness.

| Need | Mechanic |
|---|---|
| Competence | Mastery, badges, calibration feedback, rank progression |
| Autonomy (NEW) | Order choice within a unit when prerequisites allow; remediation path choice (e.g., "vocabulary path" vs. "scenario path"); cosmetic avatar choices; thematic stimulus set choice |
| Relatedness (NEW) | Class-level Republic build (every mastered benchmark adds a structure to a shared class map); peer-explanation prompts ("write one sentence to explain this to a classmate"); rotating Republic Council roles; team challenges in Republic Challenge mode |

### 21.5 Narrative Continuity (NEW)

The "Build the Republic" theme has actual story content, not just a frame.

- Recurring NPCs: a Founder mentor, a Skeptic who challenges student thinking, a Citizen who needs help.
- Story arc develops across units; each unit advances the republic from founding to functioning.
- Stakes escalate: Unit 1 founds, Unit 7 governs.
- NPC dialogue is short, age-appropriate, optional (skippable for students who prefer to focus on questions).

### 21.6 Engagement Mechanics

| Mechanic | Purpose | Guardrail |
|---|---|---|
| XP | Reward practice, persistence, improvement | Do not reward speed alone |
| Badges | Recognize benchmark / reporting category / Source Decoder / Strategist mastery | Make academic and meaningful |
| Map unlocks | Visualize progress | Unlock based on mastery, not seat time |
| Avatars | Give students ownership | Avoid distracting customization overload |
| Streaks | Encourage regular practice | **Weekly freeze tokens** automatically granted; do not punish absences |
| Team quests | Build collaboration | Keep individual mastery data private |
| Limited-time review events | Add novelty | Align all events to standards |
| Boss challenges | Make assessments feel meaningful | Keep stress low; clear instructions |
| Instant feedback | Strengthen learning during practice | Never reveal answer keys in secure assessments |
| Class-level Republic build (NEW) | Relatedness | Privacy-preserving aggregate |

### 21.7 Leaderboard Policy

No public individual score leaderboards. Use:

- Class progress toward a shared goal.
- Team-based review challenges.
- Personal bests.
- Improvement streaks.
- Badge collections.
- Anonymous classwide progress meters.

---

## 22. Teacher LMS Experience

### 22.1 Required Teacher Pages

- Class dashboard.
- Benchmark dashboard.
- Reporting category dashboard.
- Student profile.
- Intervention dashboard.
- Question bank manager.
- Content approval queue.
- EOC readiness dashboard.
- **Spaced retrieval / decay dashboard (NEW).**
- **Calibration dashboard (NEW).**
- Reports/export page.
- Settings and roster controls.

### 22.2 Teacher Dashboard Requirements

- Class progress by unit and benchmark.
- Mastery percentage by benchmark.
- Mastery percentage by EOC reporting category.
- Distribution of students by status (Not Started, In Progress, Ready, Needs Remediation, Mastered, Exposure Complete, Intervention Required).
- Most-missed questions.
- Most-common misconceptions (linked to Appendix E).
- Students needing teacher action.
- Remediation completion status.
- EOC readiness trend over time.
- Recommended small groups.
- **Decay alerts: benchmarks where many students are slipping (NEW).**
- **Off-ramp triggered students requiring conference (NEW).**

### 22.3 Benchmark Dashboard

For each benchmark:

- Benchmark code and learning target.
- Reporting category.
- Class mastery rate.
- Average score by attempt.
- Questions most frequently missed.
- Distractors most frequently selected with linked misconception (Appendix E).
- Performance by stimulus type.
- Performance by cognitive complexity.
- **Performance by reading-load level (NEW).**
- **Class spaced-retrieval health for this benchmark (NEW).**
- Students in remediation.
- Suggested reteach resources.

### 22.4 Student Profile

For each student:

- Current mission.
- Mastered, locked, exposure-complete benchmarks.
- Assessment attempts and confidence calibration.
- Remediation history.
- EOC readiness by reporting category.
- Strengths and weaknesses by item type, stimulus type, reading-load level.
- Misconception history.
- **Spaced-retrieval status: items due, decay flags (NEW).**
- **Confidence calibration trend (NEW).**
- Notes and interventions.
- Badges earned.
- Teacher override history.
- Accommodations active on student profile (per Appendix G).

### 22.5 Teacher Actions and Audit Trails

| Teacher Action | Required Audit Trail |
|---|---|
| Override mastery gate | Teacher ID, student ID, benchmark, reason, timestamp |
| Reset attempt | Teacher ID, assessment ID, reason, timestamp |
| Edit approved content | Before/after version, editor ID, timestamp, approval status reset if needed |
| Assign remediation manually | Teacher ID, student/group, remediation item, timestamp |
| Approve question | Approver ID, question ID, timestamp, version |
| Bulk approve by tag (NEW) | Approver ID, filter criteria, item IDs, timestamp |
| Archive question | Teacher/Admin ID, question ID, reason, timestamp |
| Share parent summary | Teacher ID, student ID, timestamp, fields included |
| Set student accommodation | Teacher ID, student ID, accommodation, timestamp |
| Trigger class re-priming review (NEW) | Teacher ID, benchmark(s), timestamp |

### 22.6 Substitute-Friendly Mode (NEW)

A toggleable view for substitute teachers:

- Class roster with current activity.
- Read-only access; cannot approve content, modify mastery, or grade.
- Pre-prepared activity recommendations from regular teacher.
- Print mode for paper backup of suggested activities.

---

## 23. Parent Portal

Build in two phases: teacher-generated progress summaries first, then true parent login.

| Phase | Features |
|---|---|
| Phase 1: Progress Summary | Teacher generates/shares progress report with current unit, mastered benchmarks, remediation status, recent scores, EOC readiness summary, suggested at-home review |
| Phase 2: Parent Login | Parent/guardian account linked to student; dashboard shows progress and teacher-approved notes without answer keys or unnecessary internal data |

Parent view shows:
- Current unit/mission.
- Benchmarks mastered.
- Benchmarks needing review.
- Remediation status.
- Recent assessment summary.
- Suggested at-home review topics.
- Positive progress indicators.

Parent view does not show:
- Answer keys.
- Full item bank.
- Item-level distractor analysis.
- Other students.
- Private teacher notes unless explicitly shared.
- Confidence calibration data (could be misinterpreted out of context).
- Sensitive internal flags.

District policy must be confirmed before enabling external parent accounts.

---

## 24. Content Approval Workflow

All student-facing content must be pre-approved. AI-generated or imported content may be used only as draft material until reviewed.

### 24.1 Content Statuses

| Status | Meaning |
|---|---|
| Draft | Created but not visible to students |
| Needs Review | Ready for teacher/curriculum review |
| Approved | Visible/assignable to students |
| Needs Revision | Flagged for correction; not used in new assignments |
| Archived | Hidden from active assignment but retained for records |

### 24.2 Trust Tiers (NEW — replaces approve-everything-individually model)

| Tier | Source | Default Status |
|---|---|---|
| Tier A: Auto-approved | FDOE released items, official Florida resources imported via verified channel | Approved at import (with audit log) |
| Tier B: Reviewed bank | Teacher-authored, teacher-imported from approved supplemental sources | Auto-approved if teacher in trusted reviewer role; otherwise Needs Review |
| Tier C: AI draft | AI-generated questions, lessons, hints, scenarios | Always Draft → Needs Review → Approved (single human approval) |
| Tier D: Bulk approve by tag | Teacher selects filter (benchmark, source, stimulus type) and approves matching items | Approved with single approver ID, audit log captures filter |

### 24.3 Approval Requirements by Content Type

| Content Type | Approval Required? |
|---|---:|
| Lesson text | Yes |
| Vocabulary definitions | Yes |
| Videos/articles/interactives | Yes |
| Quiz questions | Yes |
| Answer explanations | Yes |
| Remediation activities | Yes |
| Student hints | Yes |
| Badges/game copy | Yes |
| Teacher-only notes | Recommended |
| Parent-facing summaries | Recommended |

### 24.4 Question Approval Checklist

Before approval, each question is checked for:

- Correct benchmark alignment.
- Correct reporting category.
- Correct answer accuracy.
- Plausible distractors with linked misconception (Appendix E).
- Appropriate reading level and reading-load tag.
- Appropriate cognitive complexity.
- EOC-style phrasing.
- Bias/sensitivity concerns.
- Stimulus accuracy and copyright compliance.
- No accidental answer giveaway.

---

## 25. Data, Privacy, and District Readiness

### 25.1 Data Storage Rules

| Data Category | Store? | Notes |
|---|---|---|
| Student Clever/Google ID | Yes | Primary account link |
| Student name | Yes | Minimum needed for teacher rosters |
| Class/period/teacher | Yes | Required for dashboards |
| Assessment attempts | Yes | Required for mastery and progression |
| Item responses | Yes | Required for remediation diagnostics |
| Confidence ratings (NEW) | Yes | Required for calibration |
| Spaced retrieval state (NEW) | Yes | Per (student, benchmark) tuple |
| EOC readiness metrics | Yes | Derived from benchmark/reporting category performance |
| Actual EOC scores (NEW) | Conditional | Only with district consent; admin role only |
| Parent/guardian account data | If parent portal enabled | Auth and linking only |
| Health/behavior/sensitive notes | No by default | Only if district explicitly approves |
| External gradebook data | No for MVP | Internal site only |

### 25.2 Privacy and Security Requirements

- Role-based access control for student, teacher, parent, admin roles.
- Least-privilege permissions.
- Audit logs for sensitive actions.
- Encrypt data in transit (TLS 1.2+).
- Encrypt sensitive data at rest.
- Secure session management.
- Answer keys never exposed to students or parents.
- Export and data-retention options for teacher/admin use.
- District review before using with real student accounts.
- Verify Clever app integration permissions and scopes.
- Verify Google OAuth requirements.
- Verify parent account approval and identity verification requirements.
- Verify hosting and data storage requirements.
- **No third-party analytics on student data.**
- **No PII in URL parameters or query strings.**

---

## 26. Technical Architecture

| Layer | Recommended Approach |
|---|---|
| Frontend | Next.js (App Router); Chromebook-first responsive design; Tailwind |
| Backend | Next.js API routes plus server actions; consider tRPC for typed end-to-end |
| Database | PostgreSQL (selected) |
| ORM | Prisma (selected) |
| Auth | Clever OAuth/SSO first; Google OAuth fallback; mock auth for dev |
| Content | Database-backed CMS with approval workflow |
| Assessments | Server-validated attempts; never trust client-side grading |
| Analytics | Materialized or cached mastery summaries for dashboards |
| Reporting | Exportable CSV/PDF progress summaries |
| Background jobs | A queue (BullMQ or Postgres-based) for spaced retrieval scheduling, calibration runs, export jobs |
| Deployment | District-appropriate hosting to be confirmed |

### 26.1 Suggested App Modules

- `auth` — SSO, sessions, role middleware.
- `roster` — classes, students, enrollments.
- `content` — units, benchmarks, lessons, terms, resources.
- `eoc-alignment` — reporting categories, blueprint, tagging validation.
- `assessment` — attempts, responses, server-side grading, secure delivery.
- `mastery` — status calculation, lock/unlock, off-ramp.
- `remediation` — diagnostic remediation assignment, reassessment.
- `spaced-retrieval` — SM-2 scheduler, daily queue generation.
- `adaptive-difficulty` — within-session adaptation, worked-example insertion.
- `metacognition` — confidence capture, calibration calculation.
- `reading-load` — stimulus level handling, accommodation overrides.
- `analytics` — dashboards, trend computation, decay detection.
- `calibration` — EOC outcome import, correlation analysis.
- `student-game` — student-facing UI, narrative content, badges.
- `teacher-lms` — teacher dashboards, intervention tools.
- `parent-portal` — summary generation, parent dashboard.
- `admin-cms` — global content management, approval workflows.
- `audit` — audit log writers and viewers.

---

## 27. Database Schema

The following schema is conceptual. Adapt naming and types to Prisma. Add appropriate indexes and foreign-key constraints.

```
users(id, role, clever_id, google_id, first_name, last_name, email, status, created_at, updated_at)
students(id, user_id, district_student_id, grade_level, active, l1_language, ell_status, reading_level_flag, ese_status)
teachers(id, user_id, school_id, active)
parents(id, user_id, active)
parent_student_links(id, parent_id, student_id, relationship, verified_status, created_at)
classes(id, teacher_id, name, period, school_year, active)
class_enrollments(id, class_id, student_id, status, enrolled_at)

units(id, title, description, sequence_order, game_region_name, reporting_category_mix, active)
reporting_categories(id, name, blueprint_weight_min, blueprint_weight_max, description)
benchmarks(id, code, title, unit_id, reporting_category_id, sequence_order, lesson_summary, approval_status, version)
benchmark_clarifications(id, benchmark_id, text, sequence_order)
benchmark_connections(id, benchmark_id, connected_benchmark_id, relationship_type)

terms(id, benchmark_id, term, definition, tier, related_vocab, approval_status)  -- tier 2 or tier 3
term_translations(id, term_id, language_code, definition_translated, approval_status)
resources(id, benchmark_id, title, url, resource_type, description, approval_status)
lessons(id, benchmark_id, title, body, student_friendly_target, approval_status, version)
lesson_steps(id, lesson_id, step_type, title, content, sequence_order, required)

stimuli(id, title, stimulus_type, content, media_url, source, copyright_notes, reading_load_level, approval_status)
stimulus_variants(id, stimulus_id, reading_load_level, content, approval_status)  -- alternate readings

questions(id, benchmark_id, reporting_category_id, prompt, stimulus_id, item_type, difficulty, cognitive_complexity, reading_load_level, skill_tag, remediation_tag, misconception_id, approval_status, source_tier, active)
question_options(id, question_id, option_text, is_correct, feedback, misconception_id)
misconceptions(id, code, reporting_category_id, label, description, common_distractor_pattern, fix_remediation_id, approval_status)

assessments(id, benchmark_id, title, assessment_type, mastery_threshold, blueprint_json, approval_status)
assessment_questions(id, assessment_id, question_id, sequence_order, points)

assignments(id, class_id, benchmark_id, assessment_id, assigned_by, start_at, due_at, status)
student_progress(id, student_id, benchmark_id, status, mastery_score, mastered_at, current_step_id, attempts_count, off_ramp_triggered_at)

assessment_attempts(id, assessment_id, student_id, attempt_number, score, passed, started_at, submitted_at)
attempt_responses(id, attempt_id, question_id, response_json, selected_option_id, is_correct, points_awarded, confidence, time_seconds)

remediation_items(id, benchmark_id, title, remediation_type, skill_tag, misconception_id, content, approval_status)
student_remediations(id, student_id, benchmark_id, remediation_item_id, status, assigned_at, completed_at)

spaced_review_state(id, student_id, benchmark_id, repetition_count, easiness_factor, interval_days, due_at, last_reviewed_at, last_quality)
spaced_review_events(id, student_id, benchmark_id, question_id, quality, confidence, is_correct, occurred_at)

confidence_calibration_snapshots(id, student_id, scope, snapshot_at, high_confidence_correct, high_confidence_incorrect, medium_confidence_correct, medium_confidence_incorrect, low_confidence_correct, low_confidence_incorrect)

source_decoder_progress(id, student_id, level, completed_at)
strategy_track_progress(id, student_id, mission_code, completed_at)

badges(id, name, description, icon_key, criteria_json, track)
student_badges(id, student_id, badge_id, awarded_at)

eoc_readiness_snapshots(id, student_id, reporting_category_id, readiness_score, readiness_low, readiness_high, created_at)
class_readiness_snapshots(id, class_id, reporting_category_id, readiness_score, created_at)

eoc_actual_scores(id, student_id, school_year, scaled_score, achievement_level, entered_by, entered_at, consent_acknowledged)
eoc_calibration_runs(id, school_year, correlation_readiness_to_scaled, correlation_by_reporting_category, correlation_by_stimulus_type, correlation_by_complexity, correlation_by_reading_load, correlation_by_confidence_calibration, recommended_weight_changes, applied, run_at)

accommodations(id, code, name, description)
student_accommodations(id, student_id, accommodation_id, granted_by, granted_at, active)

teacher_overrides(id, teacher_id, student_id, benchmark_id, action, reason, created_at)
audit_logs(id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
```

---

## 28. Page-by-Page Sitemap

| Area | Page / Route | Purpose |
|---|---|---|
| Public/Auth | /login | Clever first login with Google fallback |
| Student | /student/dashboard | Current mission, progress, badges, next action, readiness meter, daily drill CTA |
| Student | /student/map | Game map of units and benchmark missions |
| Student | /student/mission/[benchmarkCode] | Benchmark lesson, activities, practice, assessment access |
| Student | /student/source-lab/[id] | Source/excerpt/chart/flowchart practice |
| Student | /student/assessment/[assessmentId] | Secure assessment player with confidence rating |
| Student | /student/remediation/[id] | Targeted remediation activity |
| Student | /student/daily-drill | Daily Republic Drill (spaced retrieval) |
| Student | /student/source-decoder | Source Decoder track |
| Student | /student/strategy | Test-taking strategy missions |
| Student | /student/eoc-review | Cumulative EOC-style Republic Challenge mode |
| Student | /student/badges | Badge and rank collection |
| Teacher | /teacher/dashboard | Class overview and intervention alerts |
| Teacher | /teacher/classes/[classId] | Roster and progress table |
| Teacher | /teacher/students/[studentId] | Individual student profile and history |
| Teacher | /teacher/benchmarks/[code] | Benchmark mastery analytics |
| Teacher | /teacher/reporting-categories | EOC reporting category analytics |
| Teacher | /teacher/eoc-readiness | EOC readiness dashboard |
| Teacher | /teacher/decay | Spaced retrieval / decay dashboard |
| Teacher | /teacher/calibration | Confidence calibration dashboard |
| Teacher | /teacher/content | Content approval queue |
| Teacher | /teacher/questions | Question bank manager |
| Teacher | /teacher/reports | Exports and printable reports |
| Parent | /parent/dashboard | Linked student progress summary |
| Admin | /admin/users | Manage roles and access |
| Admin | /admin/curriculum | Manage units, benchmarks, global content |
| Admin | /admin/eoc-alignment | Manage reporting categories, blueprint, tags, alignment rules |
| Admin | /admin/calibration | Import EOC scores, view calibration runs |
| System | /api/health | Health check endpoint |

---

## 29. API and Service Requirements

| Service | Required Endpoints / Functions |
|---|---|
| Auth | loginWithClever, loginWithGoogle, logout, getSession, roleRedirect |
| Roster | syncCleverRoster, listClasses, listStudents, enrollStudent, archiveEnrollment |
| Content | listUnits, listBenchmarks, getBenchmark, updateLesson, approveContent, bulkApproveByTag, archiveContent |
| EOC Alignment | listReportingCategories, mapBenchmarkToReportingCategory, validateQuestionTags, getBlueprintCoverage |
| Assessment | startAttempt, saveResponse, submitAttempt, gradeAttempt, getAttemptReview, captureConfidence |
| Mastery | calculateBenchmarkStatus, unlockNextBenchmark, lockBenchmark, triggerOffRamp, overrideProgress |
| Remediation | assignRemediation, completeRemediation, getRemediationQueue, recommendIntervention |
| Spaced Retrieval | enqueueOnMastery, getDailyDrill, recordReviewEvent, updateSM2State, listDecayingBenchmarks |
| Adaptive Difficulty | nextItem, insertWorkedExample, recordSessionState |
| Metacognition | recordConfidence, computeCalibrationSnapshot, getCalibrationTrend |
| Reading Load | getStimulusForLevel, applyAccommodationOverride |
| Dashboards | getStudentDashboard, getTeacherClassDashboard, getParentDashboard, getEOCReadinessDashboard, getDecayDashboard, getCalibrationDashboard |
| Reports | exportStudentReport, exportClassReport, generateParentSummary, exportEOCReadinessReport |
| Calibration | importActualScores, runCalibration, getCalibrationRun, applyWeightChanges |
| Audit | writeAuditLog, listAuditLogsForEntity |
| Analytics | calculateMisconceptions, calculateStimulusPerformance, calculateComplexityPerformance, calculateReadingLoadPerformance, updateReadinessSnapshots |

---

## 30. EOC Review Mode: Republic Challenge

### 30.1 Student Experience

Republic Challenge is a final campaign mode, not a worksheet packet. Includes:

- Mixed benchmark quizzes.
- Reporting category challenges.
- Daily review missions (linked to spaced retrieval engine).
- Weakness-based practice.
- Stamina builds (Section 19).
- Full simulation mode (Final Republic Trial).
- Boss battles by category.
- Badge rewards for improvement and mastery.
- Progress toward Republic Guardian status.

### 30.2 Review Modes

| Mode | Purpose |
|---|---|
| Quick Review | 5-question short practice based on weak skills |
| Category Challenge | Practice one EOC reporting category |
| Mixed Mission | Blueprint-weighted mixed quiz |
| Mistake Replay | Practice concepts previously missed |
| Source Sprint | Practice excerpt/chart/map/flowchart items |
| Endurance Trial | Stamina ladder (Section 19.1) |
| Final Republic Trial | Full EOC simulation with blueprint-weighted item mix |

### 30.3 Blueprint Weighting

The platform supports blueprint-weighted review generation. A 40-question quiz draws approximate proportions from reporting categories (Section 7.3) rather than randomly sampling all benchmarks equally.

### 30.4 Readiness Score

EOC readiness calculated from multiple signals:

- Benchmark mastery status (mastered, exposure-complete, locked).
- Recent assessment performance.
- Reporting category strength.
- Cognitive complexity performance.
- Stimulus type performance.
- Reading-load level performance (NEW).
- Confidence calibration accuracy (NEW).
- Spaced retrieval health (NEW: % of mastered benchmarks not in decay).
- Remediation completion.
- Cumulative review performance.
- Trend over time.

The readiness meter is described as an internal preparation indicator, not a predicted official score. Display includes a confidence interval (e.g., "72-78%").

In year one, weights are defaults. After EOC outcome calibration (Section 20), weights are recommended for adjustment.

---

## 31. Accessibility, Differentiation, and Equity (Expanded)

The platform must work for diverse learners, including ESE, ELL, struggling readers, and students with limited prior civic exposure.

### 31.1 Accessibility Requirements (WCAG 2.1 AA target)

- Chromebook-first responsive design.
- Keyboard navigation for all interactive elements.
- Screen reader compatible labels (ARIA, semantic HTML).
- Alt text for images and diagrams.
- Captions/transcripts for video/audio.
- Readable typography (16px minimum body, 1.5+ line height).
- High contrast mode and accessible color palette.
- Avoid color-only indicators.
- Support 200% zoom without layout breaking.
- Timer-free or timer-adjustable practice unless teacher deliberately enables timing.
- All forms validate without relying on color alone.

### 31.2 Differentiation Supports (in MVP unless noted)

- Glossary popovers for civics terms (tier 3) and academic verbs (tier 2).
- **Read-aloud option (Web Speech API; in MVP).**
- **Sentence chunking toggle for stimulus passages (in MVP).**
- Simplified reteach versions.
- Chunked primary-source excerpts.
- Example/non-example sorting.
- Visual organizers.
- Guided hints in practice mode.
- Extension tasks for advanced students.
- Teacher-assigned small-group practice.
- **Tier-2 vocabulary support (Appendix F; in MVP).**
- **Sentence-level chunking for long stems (in MVP).**

### 31.3 ELL and L1 Support

Phase 4 (concurrent with full course expansion):
- Spanish glosses for tier-3 civics terms.
- Toggleable via student profile `l1_language` field.

Phase 5:
- Haitian Creole glosses for tier-3 civics terms.

Schema supports L1 from MVP. Content delivery is phased due to translation cost and quality requirements.

### 31.4 Background Knowledge Bridges

For first-generation learners or students new to U.S. civic systems:

- Optional 30-60 second "Context Boost" cards before stimuli that reference unfamiliar historical events (Whiskey Rebellion, Marbury v. Madison, etc.).
- Toggleable per student or per class.
- Approved as supplemental content.

### 31.5 Accommodations as First-Class Profile Attributes

See Appendix G. Accommodations include extended time, read-aloud default-on, sentence chunking default-on, simplified language preference, reduced answer choices (for some IEPs), word bank for short answer, frequent breaks, screen reader, high contrast, large text, L1 glosses.

When set on a student profile, accommodations flow through every assessment without per-assignment toggling.

---

## 32. MVP Scope

The first implementation proves the full learning loop with Unit 1 before scaling.

| MVP Area | Required Features |
|---|---|
| Curriculum | Unit 1: SS.7.CG.1.1-1.6 loaded from normalized benchmark data |
| EOC Alignment | Reporting category mapping, benchmark tags, complexity tags, stimulus type tags, reading-load tags, misconception/remediation tags |
| Student | Dashboard, game map, mission page, lesson player, quiz player, mastery lock/unlock, off-ramp, remediation activity, badges, daily drill |
| Teacher | Class dashboard, student progress, benchmark mastery table, EOC readiness view, decay dashboard, calibration dashboard, question bank viewer/editor, content approval (with bulk-approve), override/reset controls |
| Parent | Progress summary/report; parent login Phase 2 |
| Assessment | Multiple-choice and system-gradable questions, server-side grading, alternate reassessment after remediation, confidence ratings on Mastery Challenges |
| Question Bank | At least 15-20 approved questions per MVP benchmark, including scenario, source/stimulus items, items at all reading-load levels |
| Remediation | At least one remediation activity per major missed skill tag in MVP benchmarks |
| Spaced Retrieval | SM-2 implementation, daily drill UI, mastered-benchmark enqueue, alternate-item draw |
| Adaptive Difficulty | Within-session 3-correct/3-incorrect rule with worked-example insertion |
| Confidence Layer | Capture on Mastery Challenges, basic calibration feedback to student, calibration dashboard for teacher |
| Reading Load | Stimulus variants for at least Unit 1 benchmarks at levels 1, 2, 3 |
| Accessibility | Read-aloud, sentence chunking, tier-2 vocab support, keyboard nav, screen reader compatibility |
| Auth | Clever-first architecture; Google fallback architecture; mock/dev auth |
| Analytics | Mastery, decay, calibration by student, benchmark, reporting category, complexity, stimulus type, reading-load |

### 32.1 MVP Must Prove

- Student can complete a benchmark mission including pre-check and confidence ratings.
- Student can take an EOC-style Mastery Challenge.
- System can lock/unlock based on mastery.
- System can trigger off-ramp after 3 attempts plus remediation.
- System can assign targeted remediation based on missed skill/misconception/confidence pattern.
- Student can complete reassessment.
- Student can complete Daily Republic Drill from spaced retrieval queue.
- Adaptive difficulty inserts worked example after 3 incorrect.
- Teacher can see mastery, decay, and calibration data.
- Teacher can approve content individually and via bulk-approve-by-tag.
- Questions are tagged deeply enough to drive remediation, dashboards, decay analysis, and calibration analysis.
- Read-aloud and sentence chunking work on stimulus passages.

---

## 33. Full Build Roadmap

| Phase | Deliverables | Audit Checkpoint |
|---|---|---|
| Phase 0: Planning and audit | Inventory existing project; finalize CLAUDE.md; verify environment; check assumptions | Audit 0 |
| Phase 1: Schema and seed | Database schema, migrations, seed scripts (benchmarks, reporting categories, misconception inventory, vocabulary, sample questions Unit 1) | Audit 1 |
| Phase 2: Auth, roles, and base routing | SSO abstraction, role middleware, mock auth, basic shell of student/teacher/parent/admin | Audit 2 |
| Phase 3: Assessment engine | Server-side grading, attempt records, confidence capture, secure delivery | Audit 3 |
| Phase 4: Mastery and remediation engines | Status calculation, lock/unlock, off-ramp, remediation assignment | Audit 4 |
| Phase 5: Spaced retrieval engine | SM-2 implementation, daily drill, decay detection | Audit 5 |
| Phase 6: Adaptive difficulty | Within-session adaptation, worked-example insertion | Audit 6 |
| Phase 7: Reading-load ladder | Stimulus variants, accommodation overrides, Source Decoder track | Audit 7 |
| Phase 8: Student game UI | Dashboard, map, mission page, daily drill UI, badges, narrative shell | Audit 8 |
| Phase 9: Teacher LMS | All teacher dashboards, content approval, bulk-approve-by-tag, intervention recommendations | Audit 9 |
| Phase 10: EOC analytics | Reporting category, stimulus type, complexity, reading-load, decay, calibration analytics | Audit 10 |
| Phase 11: Republic Challenge | Cumulative review modes, blueprint-weighted generation, stamina ladder, simulation | Audit 11 |
| Phase 12: Accessibility and equity polish | Read-aloud, sentence chunking, accommodations matrix wiring, WCAG 2.1 AA pass | Audit 12 |
| Phase 13: Calibration loop | EOC actual score import schema, correlation analysis tooling, admin dashboard | Audit 13 |
| Phase 14: Parent progress summary | Phase 1 of parent portal | Audit 14 |
| Phase 15: Full course expansion | Load all SS.7.CG benchmarks; build 30 questions per benchmark; add remediation per benchmark | Audit 15 |
| Phase 16: L1 glosses | Spanish glosses (Phase 4 of v3 plan); Haitian Creole follow | Audit 16 |
| Phase 17: District readiness polish | Audit logs, exports, documentation, privacy review, hosting review, SSO verification | Audit 17 |
| Phase 18: Parent login | Phase 2 of parent portal if district policy allows | Audit 18 |

---

## 34. Acceptance Criteria

| Feature | Acceptance Criteria |
|---|---|
| Student progression | Student cannot access next benchmark without mastery, off-ramp, or teacher override |
| Off-ramp | Triggered correctly after 3 attempts + remediation + 7 days; logs reason; flags teacher; halves spaced interval |
| Assessment grading | Submission graded server-side; appropriate feedback without answer key exposure; confidence captured on required items |
| EOC tagging | Every approved question has benchmark, reporting category, cognitive complexity, stimulus type, reading-load level, misconception, remediation tag |
| Remediation | Failed mastery attempt assigns remediation based on missed skill/misconception/confidence pattern |
| Reassessment | Uses alternate approved questions aligned to same benchmark and skill |
| Spaced retrieval | Mastered benchmark enters queue within 24 hours; SM-2 calculations correct; daily drill renders due items only; alternate items drawn |
| Adaptive difficulty | 3-correct bumps up; 3-incorrect bumps down with worked example; near-transfer item presented after worked example |
| Confidence layer | Required on Mastery Challenge; calibration feedback shown post-submission; calibration dashboard renders for teacher |
| Reading load | Mastery Challenge items at level 2 minimum; level-3 items make up ~20% of bank; accommodations override default level |
| Teacher dashboard | Identifies class benchmark mastery, EOC category weakness, decay, calibration, common misconceptions, students needing intervention |
| EOC readiness | Student and teacher can view readiness by benchmark and reporting category with confidence interval |
| Content approval | Draft/Needs Review content not visible to students; bulk-approve-by-tag works with audit log |
| Parent view | Parent sees linked student progress only; no answer keys or unrelated students |
| Audit logs | Override, reset, approval, calibration runs, sensitive access events all logged |
| Chromebook UX | Core student workflows work at common Chromebook resolutions with keyboard accessibility |
| Accessibility | WCAG 2.1 AA pass on core pages; read-aloud and sentence chunking functional; no color-only signals |
| Equity | Accommodations flow through every assessment; tier-2 vocab popovers function; ELL flag adjusts default reading-load |
| Privacy | No PII in URLs; no third-party analytics on student data; encrypted in transit; least-privilege access |
| Engagement | Game elements reinforce mastery, persistence, improvement; streaks include freeze tokens; no public score leaderboards |

---

## 35. AI Coding Agent Implementation Instructions

### 35.1 Pre-Build Inventory

Before any code changes:

1. Inspect existing repo. Note framework, package manager, current routes, current data files, existing `CLAUDE.md`.
2. Inspect any `benchmarkData.json` or other content artifacts.
3. Update or create `CLAUDE.md` per Section 3.1.
4. Update `.env.example` with all required variables (Section 35.4).
5. Confirm Node.js version, package manager, PostgreSQL access for development.
6. Run Audit 0 (Section 36.1).

### 35.2 Build Order Discipline

Follow Section 33 phase order. Do not begin Phase N until Phase N-1 audit has passed. If you find a Phase N-1 audit failure mid-Phase N, stop and report.

### 35.3 Testing Discipline

Each phase requires tests. Minimum coverage per phase:

- Phase 1: Schema migrations apply cleanly; seed scripts idempotent.
- Phase 2: Role middleware blocks unauthorized access; mock auth grants expected role.
- Phase 3: Server-side grading test with happy path, edge cases (timeouts, partial submissions), and tampering attempts (client sending pre-graded results).
- Phase 4: Mastery state transitions; off-ramp trigger conditions; remediation assignment per missed pattern.
- Phase 5: SM-2 quality calculations; queue generation; alternate-item draw correctness.
- Phase 6: Within-session adaptation rules; worked-example insertion.
- Phase 7: Reading-load variant selection; accommodation override application.
- Phase 8: Student UI happy path E2E.
- Phase 9: Teacher dashboard data correctness.
- Phase 10: Analytics calculations match hand-computed expected values on seed data.
- Phase 11: Blueprint-weighted generation produces correct distributions.
- Phase 12: Accessibility automated tests (axe-core or equivalent) pass.
- Phase 13: Calibration correlation calculations correct on test data.
- Phases 14-18: Feature-specific tests.

### 35.4 Suggested Environment Variables

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| CLEVER_CLIENT_ID | Clever OAuth client ID |
| CLEVER_CLIENT_SECRET | Clever OAuth client secret |
| CLEVER_REDIRECT_URI | Clever OAuth redirect URI |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| SESSION_SECRET | Session encryption/signing secret |
| APP_BASE_URL | Base URL for redirects and links |
| FEATURE_PARENT_PORTAL | Enable/disable parent portal |
| FEATURE_EOC_REVIEW | Enable/disable Republic Challenge |
| FEATURE_LEADERBOARDS | Enable/disable leaderboard-style engagement |
| FEATURE_AI_DRAFTING | Enable/disable AI content drafting |
| FEATURE_L1_GLOSSES | Enable L1 gloss display |
| MOCK_AUTH | Enable dev mock auth (never in production) |
| NODE_ENV | development / staging / production |

### 35.5 Documentation Discipline

At every phase boundary, update:

- `CLAUDE.md` "Current build phase" and "Last action".
- `docs/architecture.md` if architecture decisions changed.
- `docs/adrs/` with a new ADR for any non-trivial decision.
- `docs/runbook.md` with any operational notes.

### 35.6 When Stuck

If blocked, stop and report rather than guessing on material decisions. Material decisions include:

- Schema changes affecting existing data.
- Algorithm choices not specified in the spec.
- Privacy or security implications.
- District-specific configuration that wasn't pre-confirmed.
- Adding new external dependencies.
- Anything that touches accessibility or accommodations.

For non-material decisions (variable naming, file organization within a module, internal helper structure), make a reasonable choice and proceed; surface in `CLAUDE.md` "Open questions" if the choice could reasonably go another way.

---

## 36. Build Audit Checkpoints

Each phase ends with an audit. Run the audit. If any item fails, do not proceed; report the failure with a clear description and proposed fix.

### 36.1 Audit 0: Project Setup

- [ ] `CLAUDE.md` exists at repo root and matches template.
- [ ] `civics_quest_v3_build_spec.md` exists at repo root.
- [ ] `.env.example` lists all required variables.
- [ ] Repo structure matches Section 3.2 directory layout.
- [ ] Node.js, package manager, PostgreSQL versions noted in `docs/runbook.md`.
- [ ] Git repository initialized; `.gitignore` excludes `.env`, `node_modules`, `.next`, build outputs.
- [ ] No production secrets committed.

### 36.2 Audit 1: Schema and Seed

- [ ] All tables in Section 27 exist as Prisma models.
- [ ] Foreign-key constraints in place.
- [ ] Indexes on (student_id, benchmark_id), (assessment_id, student_id), (due_at) for spaced review.
- [ ] Seed: benchmarks Unit 1 loaded with all metadata.
- [ ] Seed: reporting_categories present with weights.
- [ ] Seed: misconceptions table populated from Appendix E.
- [ ] Seed: vocabulary table populated from Appendix F.
- [ ] Seed: at least 15 sample questions per Unit 1 benchmark with full tagging.
- [ ] Seed scripts idempotent (running twice produces same state).
- [ ] Migrations apply cleanly on a fresh database.

### 36.3 Audit 2: Auth and Roles

- [ ] Mock auth grants student, teacher, parent, admin roles.
- [ ] Role middleware blocks cross-role access (student cannot reach `/teacher/*`).
- [ ] Session encryption uses SESSION_SECRET.
- [ ] No production credentials in code or logs.
- [ ] Clever OAuth flow scaffolded with documented configuration steps.
- [ ] Google OAuth flow scaffolded.
- [ ] `/api/health` returns 200 with version info.

### 36.4 Audit 3: Assessment Engine

- [ ] All grading happens server-side. Verified by sending tampered client payload — server recomputes from question bank.
- [ ] Answer keys never appear in API responses to student before submission.
- [ ] Confidence captured on Mastery Challenge submissions.
- [ ] Time-to-answer captured per item.
- [ ] Practice mode reveals choice-level feedback; secure mode does not.
- [ ] Attempts recorded with attempt_number, score, passed, started_at, submitted_at.
- [ ] Tests cover happy path, server tamper resistance, partial submission, timeout.

### 36.5 Audit 4: Mastery and Remediation

- [ ] Mastery threshold check correct (80%).
- [ ] Next benchmark unlocks on mastery.
- [ ] Remediation assigned based on missed skill_tag and misconception_id.
- [ ] Off-ramp triggers after exactly 3 failed attempts + remediation + 7 days.
- [ ] Off-ramp benchmark status set correctly; teacher flagged; spaced interval halved.
- [ ] High-confidence + wrong routes to misconception fix; low-confidence + wrong routes to concept reteach.
- [ ] Teacher override creates audit log entry with reason.
- [ ] Reassessment draws alternate questions (different question_id) from same benchmark + skill.

### 36.6 Audit 5: Spaced Retrieval

- [ ] On mastery, `spaced_review_state` row created within 24 hours.
- [ ] SM-2 quality calculation matches Section 15.2 mapping.
- [ ] Easiness factor never below 1.3.
- [ ] Daily drill returns only items where `due_at <= now`.
- [ ] Drill capped at 15 items/day; remainder rolls.
- [ ] Items presented interleaved across benchmarks.
- [ ] Off-ramp benchmarks use halved interval until 2 consecutive correct-with-confidence reviews.
- [ ] Decay detection correctly identifies benchmarks with recent quality < 3.
- [ ] Test harness simulates 30 days of reviews and verifies SM-2 progression matches reference.

### 36.7 Audit 6: Adaptive Difficulty

- [ ] 3 consecutive correct triggers complexity bump up.
- [ ] 3 consecutive incorrect triggers complexity bump down + worked-example insertion.
- [ ] After worked example, near-transfer item at same complexity is presented.
- [ ] Mastery Challenges remain fixed-form (no within-session adaptation).
- [ ] Session state correctly resets between sessions.

### 36.8 Audit 7: Reading-Load Ladder

- [ ] Each Unit 1 benchmark has stimuli at levels 1, 2, 3.
- [ ] Mastery Challenge items at level 2 minimum.
- [ ] ~20% of Mastery items at level 3.
- [ ] ELL/below-grade-reader profile defaults practice to level 1 (opt-up available).
- [ ] Read-aloud (Web Speech API) functions on stimulus passages.
- [ ] Sentence-chunking toggle functions and persists.
- [ ] Tier-2 vocabulary glossary popovers render on hover/tap.
- [ ] Source Decoder track exists with at least level 1 and 2 missions.

### 36.9 Audit 8: Student Game UI

- [ ] Dashboard renders current mission, daily drill CTA, badges, readiness meter with confidence interval.
- [ ] Map renders unit/region structure with mastery state.
- [ ] Mission page implements full template (Section 10.4): pre-check → briefing → vocab → training → scenario lab → readiness check → mastery challenge.
- [ ] Daily drill page pulls from spaced retrieval queue.
- [ ] Badges render correctly with criteria explanation.
- [ ] Streaks include freeze tokens; no streak loss for short absences.
- [ ] Pause-point suggestion appears at configurable time threshold.
- [ ] Narrative NPCs render and are skippable.
- [ ] No public score leaderboards present.

### 36.10 Audit 9: Teacher LMS

- [ ] Class dashboard surfaces all metrics in Section 22.2.
- [ ] Benchmark dashboard breaks down by reading-load level and shows decay.
- [ ] Student profile shows confidence calibration trend and spaced retrieval status.
- [ ] Decay dashboard renders with class-level alerts.
- [ ] Calibration dashboard renders.
- [ ] Bulk-approve-by-tag works and writes audit log.
- [ ] Substitute-friendly mode toggles correctly (read-only, prepared activities visible).
- [ ] Teacher actions (override, reset, approve, archive, accommodation set) all create audit log entries.

### 36.11 Audit 10: EOC Analytics

- [ ] Mastery analytics correct against hand-computed seed data.
- [ ] Reporting category readiness calculations correct.
- [ ] Stimulus type, complexity, reading-load breakdowns render.
- [ ] Decay metrics computed correctly.
- [ ] Calibration metrics computed correctly.
- [ ] Trend over time renders with at least daily granularity.

### 36.12 Audit 11: Republic Challenge

- [ ] All review modes (Section 30.2) function.
- [ ] Blueprint-weighted generation produces distribution within 5% of target weights.
- [ ] Stamina ladder enforces session length by time of year.
- [ ] Final Republic Trial uses level 2 and 3 stimuli only.
- [ ] Confidence ratings required on all challenge items.
- [ ] Teacher can configure session length, attempts allowed, review window.

### 36.13 Audit 12: Accessibility and Equity

- [ ] WCAG 2.1 AA automated audit (axe-core) shows zero violations on core pages.
- [ ] Manual keyboard-only navigation completes a mission end-to-end.
- [ ] Screen reader (NVDA or VoiceOver) navigation tested on dashboard, mission, assessment.
- [ ] Read-aloud functions on all stimulus passages.
- [ ] Sentence chunking persists across navigation.
- [ ] Tier-2 vocabulary popovers function on touch and hover.
- [ ] Accommodations on student profile flow through to every assessment without per-assignment toggle.
- [ ] High-contrast mode available and functional.
- [ ] No color-only indicators in UI.
- [ ] 200% browser zoom does not break layout.

### 36.14 Audit 13: Calibration Loop

- [ ] `eoc_actual_scores` and `eoc_calibration_runs` tables exist.
- [ ] Score import respects district consent flag.
- [ ] Correlation calculations produce expected values on synthetic test data.
- [ ] Admin dashboard renders calibration runs.
- [ ] Recommended weight changes do not auto-apply (require admin approval).
- [ ] Year-one default state shown when no scores yet exist.

### 36.15 Audit 14: Parent Progress Summary

- [ ] Teacher can generate a progress report for any linked student.
- [ ] Report excludes answer keys, full item bank, distractor analysis, other students.
- [ ] Report can be exported as PDF.
- [ ] Sharing creates an audit log entry.

### 36.16 Audit 15: Full Course Expansion

- [ ] All SS.7.CG benchmarks loaded.
- [ ] 30 approved questions per benchmark minimum (more for high-weight).
- [ ] Question distribution matches Section 13.2 targets.
- [ ] Reading-load distribution matches Section 13.2 targets.
- [ ] Cognitive complexity distribution matches Section 7.4 targets.
- [ ] Each benchmark has at least one remediation activity per major skill_tag.

### 36.17 Audit 16: L1 Glosses

- [ ] Spanish glosses present for all tier-3 vocabulary.
- [ ] Display toggles via student profile `l1_language` field.
- [ ] All Spanish content reviewed and approved before student visibility.
- [ ] Haitian Creole pipeline functional (content delivery in subsequent phase).

### 36.18 Audit 17: District Readiness

- [ ] Audit log query and export functions work.
- [ ] CSV/PDF exports for student, class, EOC readiness reports.
- [ ] Privacy review documentation in `docs/`.
- [ ] Hosting plan documented and reviewed.
- [ ] Clever and Google OAuth scopes verified against district policy.
- [ ] All env variables documented.
- [ ] No third-party analytics on student data.
- [ ] Data retention policy documented and configurable.

### 36.19 Audit 18: Parent Login

- [ ] Parent account creation flow respects district verification policy.
- [ ] Linked-student dashboard shows only permitted fields.
- [ ] Parent cannot access answer keys, item-level analysis, other students, calibration data.
- [ ] Audit log captures parent login events.

---

## 37. Open Questions / District Verification Checklist

- Confirm Palm Beach County approval process for custom instructional applications.
- Confirm whether Clever integration can be used and what data scopes are allowed.
- Confirm whether Google OAuth is allowed as fallback for students and teachers.
- Confirm whether external parent login is permitted and what identity verification is required.
- Confirm hosting/security requirements for storing student progress and assessment data.
- Confirm whether any district-approved privacy agreement or vendor review is required.
- Confirm district pacing guide structure and import it into the curriculum sequence.
- Confirm required accommodations/accessibility policies for student use.
- Confirm current Florida Civics EOC blueprint and any 2026-2027 changes.
- Confirm whether official released items may be used directly, linked, or modeled only.
- Confirm whether AI-assisted item drafting is allowed under district policy.
- Confirm whether student-facing game elements, avatars, and class-level Republic build are acceptable under district/classroom norms.
- Confirm whether actual EOC scores can be imported for calibration analysis (consent and policy).

---

## 38. Build Priority Summary

The most important elements of this build, in priority order:

1. EOC reporting category alignment with deep tagging.
2. Server-side assessment grading with no client trust.
3. Mastery engine with off-ramp.
4. Diagnostic remediation tied to misconception inventory.
5. Spaced retrieval engine (SM-2).
6. Confidence calibration layer.
7. Reading-load ladder.
8. Adaptive within-session difficulty.
9. Teacher dashboards that surface actionable patterns.
10. Equity features in MVP (read-aloud, sentence chunking, tier-2 vocab).
11. EOC stamina and test-taking strategy track.
12. Republic Challenge with blueprint-weighted generation.
13. Accessibility (WCAG 2.1 AA).
14. Privacy and audit logs.
15. EOC outcome calibration loop.
16. Parent portal (phased).
17. Full course expansion.
18. L1 glosses.
19. District readiness polish.

---

## 39. References and Source Links

- `civics_quest_eoc_optimized_prd.md` — v2 (preceding version of this document).
- Florida Department of Education, Civics and Government Resources: https://www.fldoe.org/academics/standards/subject-areas/social-studies/civics-gov-res.stml
- Florida Department of Education, Grades 6-8 Instructional Guide for Civics and Government: https://www.fldoe.org/file/15223/CivicsGovInstructGuide-6-8.pdf
- Florida Department of Education, Test Item Specifications page: https://www.fldoe.org/accountability/assessments/k-12-student-assessment/end-of-course-eoc-assessments/test-item-specifications.stml
- Florida Department of Education, End-of-Course Assessments page: https://www.fldoe.org/accountability/assessments/k-12-student-assessment/end-of-course-eoc-assessments
- Florida Department of Education, Civics Literacy Excellence Initiative: https://www.fldoe.org/academics/standards/subject-areas/social-studies/civics-lei.stml
- Florida FAST, Civics EOC Spring 2024 Released Test Items: https://flfast.org/content/contentresources/en/2024%20Test%20Release%20Support%20Document%20Practice%20Test%20Civics_508.pdf
- Florida Citizen / Lou Frey Institute Middle School Civics Resources: https://floridacitizen.org/middle-school/
- U.S. Department of Education, FERPA: https://studentprivacy.ed.gov/ferpa
- Clever student data privacy information: https://support.clever.com/hc/s/articles/202393058
- Claude Code documentation: https://docs.claude.com/en/docs/claude-code/overview
- SM-2 algorithm reference: published in Wozniak's algorithm work; standard in spaced-repetition systems.

---

## Appendix A: Sample Mission Blueprint

### Mission: Founding Ideals

| Field | Value |
|---|---|
| Unit | Unit 1: Foundations of American Government |
| Game Region | Founders' Harbor |
| Benchmarks | SS.7.CG.1.1-1.6 |
| Reporting Category | Origins and Purposes of Law and Government |
| Student Goal | I can explain how earlier ideas and documents influenced the American system of government. |
| Key Skills | Compare influences, interpret excerpts, trace cause/effect, identify founding principles |
| Key Stimuli | Excerpts, timeline, chart, founding document snippets |
| Reading-Load Coverage | Levels 1, 2, and 3 represented |
| Mastery Challenge | 6-10 EOC-style multiple-choice questions, level 2 minimum, with confidence ratings |
| Remediation Paths | Vocabulary, Enlightenment ideas, British policies, Declaration purpose, source analysis |
| Spaced Retrieval | Enters queue on mastery; alternate items drawn from same skill_tag |

### Mission Flow

1. Mission Pre-Check: 2-3 ungraded questions on what students already know.
2. Animated mission briefing: Why did people create governments?
3. Vocabulary unlock: republic, democracy, natural rights, social contract, rule of law (with tier-2 verbs in parallel).
4. Training activity: match ancient and Enlightenment influences to American principles.
5. Source quest: analyze a short excerpt from a founding document at appropriate reading-load level.
6. Scenario lab: choose which principle applies to a civic situation.
7. Readiness check: 5 questions.
8. Mastery Challenge: EOC-style benchmark assessment with confidence ratings.
9. Remediation or unlock next mission, or off-ramp if applicable.
10. Spaced retrieval entry on mastery.

---

## Appendix B: Sample Question Tagging Record

| Field | Example |
|---|---|
| Question ID | Q-SS7CG16-004 |
| Benchmark | SS.7.CG.1.6 |
| Reporting Category | Origins and Purposes of Law and Government |
| Cognitive Complexity | Moderate |
| Stimulus Type | Excerpt |
| Reading-Load Level | 2 |
| Skill Tag | Source analysis |
| Misconception ID | M-OPLG-09 (Confuses grievance with principle) |
| Remediation Tag | Declaration source coach |
| Item Type | Multiple choice |
| Use | Practice, Mastery Challenge, Republic Challenge |
| Source Tier | B (Reviewed bank) |
| Approval Status | Approved |
| Version | 1 |
| Last Reviewed | 2026-04-15 |

---

## Appendix C: Student-Facing Tone Guide

| Formal Term | Student-Friendly Term |
|---|---|
| Benchmark | Mission |
| Assessment | Challenge |
| Remediation | Training Mission |
| Spaced retrieval | Daily Republic Drill |
| Off-ramp / exposure complete | "Topic moves to your training queue" |
| Incorrect | Not yet |
| Failed | Needs training |
| Mastered | Mission complete |
| EOC readiness | Republic strength |
| Reporting category | Republic pillar |
| Confidence rating | "How sure are you?" |

Recommended feedback tone:

- "Not yet. Review the evidence in the excerpt and try again."
- "You are close. This question is asking about the power of the judicial branch."
- "Mission complete. You showed mastery of this benchmark."
- "Training mission unlocked. This will help you strengthen source-analysis skills."
- "On items where you said Very sure, you got 5 out of 7 right. Pause before saying Very sure next time — make sure your evidence is in the passage."
- "You've worked hard on this mission. We're moving you forward, and this topic will return in your daily training so you can keep building it."

Avoid:

- "You failed."
- "Wrong."
- "You are behind."
- "This is easy."

---

## Appendix D: Teacher-Facing Intervention Examples

| Dashboard Finding | Suggested Teacher Action |
|---|---|
| 45% of class missed source-based items in SS.7.CG.1.6 | Run a 10-minute primary source modeling mini-lesson |
| Student mastered vocabulary but failed scenarios | Assign Scenario Lab remediation |
| Students confuse federal and state powers | Create small group using federalism examples/non-examples |
| High misses on flowchart/process items | Use visual process organizer and reassign visual evidence practice |
| Multiple students select same distractor (Appendix E lookup) | Use misconception fix slide and class discussion |
| Class showing decay on SS.7.CG.2.3 (Bill of Rights) | Schedule 15-minute whole-class re-priming review |
| Student shows over-confidence pattern (≥30% high-conf wrong) | Calibration coaching mini-lesson; pair with metacognitive prompts |
| Off-ramp triggered for 3 students on same benchmark | Likely the benchmark needs reteach; consider whole-class review |
| Reading-load level-3 performance lags level-2 by >20% | Source Decoder track support; Source Sprint review mode |

---

## Appendix E: Misconception Inventory — Starter List of 50 (NEW)

**Note for curriculum reviewer:** This is a starter inventory drafted for distractor authoring and remediation tagging. Each entry has a code, short label, and brief description. Expand and revise based on classroom observation and FDOE clarifications. Each misconception should map to one or more remediation_items.

### Origins and Purposes of Law and Government (M-OPLG)

| Code | Misconception | Description |
|---|---|---|
| M-OPLG-01 | Confuses Articles of Confederation with Constitution | Believes both are the founding document; doesn't recognize Articles as a failed predecessor |
| M-OPLG-02 | Declaration of Independence has legal force today | Treats the Declaration as a constitutional document with binding legal authority |
| M-OPLG-03 | Confuses Magna Carta with English Bill of Rights | Conflates the two English influences on American government |
| M-OPLG-04 | Enlightenment philosophers wrote the Declaration | Believes Locke, Montesquieu, etc. directly authored founding documents |
| M-OPLG-05 | Natural rights are the same as civil rights | Doesn't distinguish rights humans have from rights government grants |
| M-OPLG-06 | U.S. founded as a pure democracy | Doesn't recognize the deliberate choice of representative republic |
| M-OPLG-07 | Social contract is a literal written agreement | Treats the metaphor concretely |
| M-OPLG-08 | "Consent of the governed" requires unanimous agreement | Misreads consent as requiring 100% rather than majority/representative |
| M-OPLG-09 | Confuses grievance with principle in Declaration | Treats specific complaints about King George as the underlying philosophical principles |
| M-OPLG-10 | British policies before 1776 were illegal | Frames British actions as breaking law rather than as unpopular legal exercises of authority |
| M-OPLG-11 | Locke wrote the Constitution | Confuses inspiration with authorship |
| M-OPLG-12 | All Founders agreed on everything | Misses that the founding involved significant disagreement (Federalists vs. Anti-Federalists) |

### Roles, Rights, and Responsibilities of Citizens (M-RRC)

| Code | Misconception | Description |
|---|---|---|
| M-RRC-01 | Bill of Rights protects citizens from other citizens | Doesn't understand it limits government, not private individuals |
| M-RRC-02 | Voting is a natural right | Treats voting as inherent rather than as a civil right with eligibility requirements |
| M-RRC-03 | First Amendment protects from any consequence | Believes free speech protects against private employer or social media platform actions |
| M-RRC-04 | Confuses obligations and responsibilities | Doesn't distinguish required duties (taxes, jury duty) from civic responsibilities (vote, volunteer) |
| M-RRC-05 | Due process applies only to criminals | Misses that due process applies broadly to many government actions |
| M-RRC-06 | Miranda rights are all the rights you have | Confuses one specific protection with the broader set of rights |
| M-RRC-07 | Citizens are required to vote | Believes voting is mandatory in the U.S. (it's not, unlike some other countries) |
| M-RRC-08 | Naturalization requirements apply to all citizens | Doesn't distinguish between birthright citizens and naturalized citizens |
| M-RRC-09 | Free press means government must publish anything | Misunderstands press freedom as access rather than non-interference |
| M-RRC-10 | Double jeopardy prevents all retrials | Misses that appeals and mistrials are exceptions |
| M-RRC-11 | All searches require a warrant | Misses common exceptions (consent, exigent circumstances, plain view, etc.) |
| M-RRC-12 | Constitutional rights begin at age 18 | Believes minors don't have constitutional protections |
| M-RRC-13 | Freedom of religion equals separation of church and state | Conflates two related but distinct concepts |

### Government Policies and Political Processes (M-GPPP)

| Code | Misconception | Description |
|---|---|---|
| M-GPPP-01 | Media bias makes a source automatically false | Confuses bias with falsehood; misses that biased sources can still report accurate facts |
| M-GPPP-02 | Confuses propaganda with persuasion | Doesn't recognize the distinguishing features of propaganda |
| M-GPPP-03 | Interest groups are illegal or corrupt by definition | Doesn't recognize legitimate role of interest groups in democracy |
| M-GPPP-04 | Political parties are branches of government | Confuses parties (extra-constitutional) with constitutional structures |
| M-GPPP-05 | Public policy requires unanimous agreement | Misses that majority and representative processes produce policy |
| M-GPPP-06 | Lobbying equals bribery | Conflates legal advocacy with illegal bribery |
| M-GPPP-07 | Confuses primary and general elections | Doesn't understand the distinct functions of each |
| M-GPPP-08 | Third parties cannot affect elections | Misses spoiler effects and influence on major-party platforms |
| M-GPPP-09 | The President sets all government policy | Underestimates the role of Congress, courts, agencies, states |
| M-GPPP-10 | Civic engagement equals partisan political action | Misses non-partisan forms (volunteering, community service, civic education) |

### Organization and Function of Government (M-OFG)

| Code | Misconception | Description |
|---|---|---|
| M-OFG-01 | Federal supremacy means federal control of all matters | Misses that supremacy applies only within enumerated/constitutional federal powers |
| M-OFG-02 | States must obey all federal laws regardless | Misses constitutional limits on federal power and reserved state powers |
| M-OFG-03 | Confuses representative and direct democracy | Treats them as the same form of government |
| M-OFG-04 | Supreme Court strikes down laws on its own initiative | Misses that the Court rules only on cases brought before it |
| M-OFG-05 | Confuses appellate and trial courts | Treats them as interchangeable |
| M-OFG-06 | The President can declare laws unconstitutional | Confuses executive power with judicial review |
| M-OFG-07 | Congress equals the Senate (or the House) | Misses that Congress is the bicameral whole |
| M-OFG-08 | Amendments require only Congressional vote | Forgets state ratification requirement |
| M-OFG-09 | Confuses civil and criminal law | Treats them as the same type of case |
| M-OFG-10 | Electoral College and popular vote are the same | Misses the indirect election system |
| M-OFG-11 | Confuses delegated, reserved, and concurrent powers | Doesn't distinguish among federalism's power categories |
| M-OFG-12 | Executive branch makes laws | Confuses executive orders with legislation |
| M-OFG-13 | Confuses judicial review and judicial activism | Treats them as the same concept |
| M-OFG-14 | Bill of Rights only limits federal government | Forgets 14th Amendment incorporation against states |
| M-OFG-15 | Confuses checks and balances with separation of powers | Treats the two related concepts as the same |

---

## Appendix F: Vocabulary Tier List (NEW)

**Note for curriculum reviewer:** Tier 2 vocabulary is academic words used across disciplines that students often need help with on test stems. Tier 3 is content-specific civics vocabulary. Both should be glossed in the platform with examples, and tier 2 should appear as an explicit mini-track since it's often the hidden barrier on EOC items.

### Tier 2: Academic Verbs and Stems (essential for reading EOC items)

analyze, evaluate, infer, interpret, classify, illustrate, summarize, support (a claim), justify, predict, compare, contrast, distinguish, sequence, identify, demonstrate, examine, conclude, determine, explain, describe, define, summarize, explain why, outline, recognize, indicate, characterize, assess

### Tier 2: Function and Logic Words

according to, based on, primarily, most likely, best supports, except, both, neither, contradicts, supports, opposite, similar to, results in, leads to, prior to, following, due to, as a consequence, despite, although, however

### Tier 3: Civics Content Vocabulary (selection — full list expands across all benchmarks)

#### Origins and Purposes
republic, democracy, monarchy, oligarchy, autocracy, natural rights, social contract, rule of law, popular sovereignty, consent of the governed, Enlightenment, Magna Carta, English Bill of Rights, Mayflower Compact, Declaration of Independence, Articles of Confederation, Constitution, Preamble, ratification, grievance, principle

#### Citizens, Rights, and Responsibilities
citizen, naturalization, civic responsibility, civic obligation, due process, rule of law, Bill of Rights, freedom of speech, freedom of press, freedom of religion, freedom of assembly, petition, jury duty, taxes, draft, voting rights, civil rights, suffrage, double jeopardy, search and seizure, Miranda rights, trial by jury

#### Policies and Processes
public policy, political party, primary election, general election, electoral college, interest group, lobbying, propaganda, bias, media literacy, civic engagement, civic action, public opinion, polling, political action committee

#### Organization and Function
federalism, separation of powers, checks and balances, executive branch, legislative branch, judicial branch, bicameral, House of Representatives, Senate, veto, override, impeach, jurisdiction, judicial review, appellate court, trial court, Supreme Court, amendment, supremacy clause, delegated powers, reserved powers, concurrent powers, eminent domain, habeas corpus, civil law, criminal law

---

## Appendix G: Accommodations Matrix (NEW)

Accommodations are first-class attributes on a student profile and flow through every assessment. Setting them once applies across the platform.

| Accommodation Code | Name | Description | Default Pages Affected | MVP? |
|---|---|---|---|---|
| ACC-EXT-TIME | Extended time | Adds configurable time multiplier (1.5x, 2x) to timed activities | All assessments | Yes |
| ACC-READ-ALOUD | Read-aloud | Auto-enables read-aloud control on all stimulus passages | Stimuli, lessons | Yes |
| ACC-CHUNK | Sentence chunking | Visual chunking of long passages into shorter units | Stimuli | Yes |
| ACC-SIMPLE-LANG | Simplified language preference | Defaults stimulus to reading-load level 1 where available | Practice, training | Yes |
| ACC-T2-VOCAB | Tier-2 vocabulary popovers always on | Tier-2 academic words always show glossary popover | All pages with stems | Yes |
| ACC-REDUCED-CHOICES | Reduced answer choices | Some IEPs allow 3 instead of 4 answer choices on practice (not Mastery) | Practice only | Phase 9 |
| ACC-WORD-BANK | Word bank for short answer | Provides word bank on any short-answer-from-bank items | Practice | Phase 4 |
| ACC-BREAKS | Frequent breaks | Auto-suggests pause every 10 minutes | All sessions | Yes |
| ACC-SCREEN-READER | Screen reader optimized | Ensures all controls have ARIA labels and tab order | All pages | Yes |
| ACC-HIGH-CONTRAST | High contrast mode | Switches color palette to WCAG AAA contrast | All pages | Yes |
| ACC-LARGE-TEXT | Large text | Bumps base font size; layout reflows | All pages | Yes |
| ACC-L1-SPANISH | Spanish glosses | Tier-3 civics terms display Spanish gloss on hover | All pages with civics terms | Phase 4 |
| ACC-L1-CREOLE | Haitian Creole glosses | Tier-3 civics terms display Haitian Creole gloss on hover | All pages with civics terms | Phase 5 |
| ACC-CONTEXT-BOOST | Background context cards | Optional 30-60s context cards before unfamiliar references | Stimuli with referenced events | Yes |

Accommodations are set by teachers (with district authority where required) on the student profile. Audit log captures who granted what and when. Students see their accommodations as "Tools turned on for you" in their settings, framed positively.

---

## Appendix H: Claude Code Workflow Guide (NEW)

This appendix documents the recommended Claude Code workflow for executing this build.

### H.1 Session Setup

At the start of every session:

1. Read `CLAUDE.md` to confirm current build phase and last action.
2. Run `git status` to confirm clean working tree (or known WIP).
3. Read this build spec section relevant to current phase.
4. Confirm the previous phase audit passed.

### H.2 Model Selection by Task

- **Sonnet 4.6 (default):** CRUD endpoints, React components, dashboard pages, schema migration scaffolding, test scaffolding, mission/lesson player UI, Tailwind styling.
- **Opus 4.7 (for hard problems):** Initial architecture decisions, the assessment/mastery/remediation engine logic, the spaced retrieval scheduler, the EOC blueprint-weighted question selection, debugging when Sonnet has gotten stuck.

Switch with `/model` mid-session as appropriate.

### H.3 Use of /plan Mode

Always use `/plan` before:

- Schema changes that touch existing tables.
- Implementing the assessment engine.
- Implementing the spaced retrieval engine.
- Implementing off-ramp logic.
- Implementing adaptive difficulty.
- Implementing calibration logic.
- Any change touching authentication or authorization.
- Any change touching audit logging.
- Adding a new external dependency.

### H.4 Phase Boundary Discipline

At each phase boundary:

1. Run all tests for the phase.
2. Run the audit checklist for the phase (Section 36).
3. Update `CLAUDE.md` "Current build phase" to reflect completion.
4. Commit with a clear phase-completion message: `Phase N complete: [brief summary]`.
5. Tag the commit: `git tag phase-N-complete`.
6. Update `docs/architecture.md` if any architectural decisions were made.
7. Add an ADR in `docs/adrs/` if a significant decision was made.

### H.5 When Audit Fails

1. Stop. Do not proceed to the next phase.
2. Report the failing audit item(s) with clear context.
3. Propose a fix.
4. Wait for human approval (or proceed with the fix if it's clearly within the spec, then re-run the audit).

### H.6 Documentation Conventions

- `CLAUDE.md` — current state, standing instructions.
- `docs/architecture.md` — high-level architecture.
- `docs/adrs/NNNN-title.md` — architecture decision records, sequentially numbered.
- `docs/runbook.md` — operational notes, environment setup, troubleshooting.
- `README.md` — getting started, contributing, summary.

### H.7 Commit Conventions

- Conventional commits format: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Reference phase number where relevant: `feat(phase-5): implement SM-2 scheduler`.
- Include audit reference where applicable: `chore(phase-3): pass audit 3`.

### H.8 Stopping Points

This is a long build. Reasonable stopping points:

- After any audit passes.
- At the end of a logical unit of work within a phase.
- When approaching context-window limits — finish current logical step, update `CLAUDE.md`, commit.

### H.9 Known Pitfalls

- Do not use client-side mastery calculation. Server-side only.
- Do not store the answer key in the question_options API response when serving secure assessments.
- Do not skip `due_at` indexing on spaced_review_state — the daily drill query must be fast.
- Do not reset SM-2 state when a student takes a Mastery Challenge re-attempt; only the daily review and the calibration logic update SM-2.
- Do not auto-apply calibration weight changes; admin approval required.
- Do not include third-party analytics scripts that would transmit student data.
- Do not use timer-based UI patterns that punish students for absences (use freeze tokens).

---

**End of v3 Build Specification.**

Build with care. Run the audits. The students reading this in their classrooms in fall 2026 deserve a system that holds together.
