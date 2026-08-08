/**
 * Seed: Units and Benchmarks — full SS.7.CG course, realigned to the OFFICIAL
 * 2021 Florida SS.7.CG standards (verbatim statements in seed/official_standards.ts,
 * retrieved from the CASE knowledge graph 2026-07-16).
 *
 * HISTORY (ADR 0017): the original seed carried pre-2021 SS.7.C course content
 * relabeled with SS.7.CG codes — e.g. "Enlightenment" sat under 1.1 when the
 * official 1.1 is ancient Greece/Rome/Judeo-Christian influences. Because all
 * shipped content and student data hang off the strand-1 rows, the fix is a
 * row-identity-preserving RENAME PASS (applyBenchmarkCodeRealignment below):
 * each row keeps its id — and therefore its questions, lessons, assessments,
 * attempts, SM-2 state, and student progress — and its `code` moves to the
 * official code whose meaning matches its existing content. Strand-2/3 rows
 * were content-free, so their defs are simply rewritten in place.
 *
 * Reporting-category mapping (per the official strands):
 *   - SS.7.CG.1.x       → Origins and Purposes              (Units 1–2)
 *   - SS.7.CG.2.1–2.5   → Roles, Rights, Responsibilities   (Unit 3)
 *   - SS.7.CG.2.6–2.10  → Government Policies / Processes   (Unit 4)
 *   - SS.7.CG.3.x       → Organization and Function         (Units 5–7)
 *
 * Guardrail: tests/unit/seed/benchmark-standards-alignment.test.ts pins every
 * def to seed/official_standards.ts (code set, statement identity, topical
 * anchors, numeric sequence). Edit defs freely; drift from the official
 * standards fails the suite.
 *
 * Idempotent: rename pass is gated on (code, old title) so it fires exactly
 * once; units upserted by id, benchmarks by code; clarifications rewritten
 * (delete + recreate — nothing FKs them); connections rebuilt from defs.
 */

import { PrismaClient } from '@prisma/client'
import { REPORTING_CATEGORY_NAMES } from './reporting_categories'
import { OFFICIAL_SS7CG_STANDARDS } from './official_standards'

type CategoryKey = 'ORIGINS' | 'CITIZENS' | 'POLICIES' | 'ORGANIZATION'

interface ClarificationDef {
  text: string
  sequenceOrder: number
}

export interface BenchmarkDef {
  code: string
  title: string
  sequenceOrder: number
  /** Verbatim official standard statement (sourced from seed/official_standards.ts). */
  officialStatement: string
  lessonSummary: string
  clarifications: ClarificationDef[]
  connectsTo: string[] // other benchmark codes this one connects to
}

interface UnitDef {
  id: string
  sequenceOrder: number
  title: string
  description: string
  gameRegionName: string
  categoryKey: CategoryKey
  /** Whether the unit is active (visible). Units gain active=true as their banks land. */
  active: boolean
  benchmarks: BenchmarkDef[]
}

/** Pull the verbatim official statement — throws on a typo'd code at module load. */
function official(code: string): string {
  const s = OFFICIAL_SS7CG_STANDARDS[code]
  if (!s) throw new Error(`No official SS.7.CG statement for code "${code}" — check seed/official_standards.ts`)
  return s.statement
}

// ── Code realignment (ADR 0017) ──────────────────────────────────────────────
// Each rename moves an EXISTING row (with all its content and student data) to
// the official code whose meaning matches that row's content. Gated on the old
// title so the pass is a no-op on fresh or already-realigned databases. The
// renames form a permutation within strand 1, so they run in two phases through
// LEGACY:: temp codes to survive the unique constraint on `code`.

interface CodeRename {
  from: string
  to: string
  /** Title the row carried under the OLD (drifted) content — gates the rename. */
  fromTitle: string
}

const CODE_RENAMES: CodeRename[] = [
  { from: 'SS.7.CG.1.1', to: 'SS.7.CG.1.4', fromTitle: 'Enlightenment and European Influences on American Democracy' },
  { from: 'SS.7.CG.1.2', to: 'SS.7.CG.1.3', fromTitle: 'Colonial and British Governmental Traditions' },
  { from: 'SS.7.CG.1.3', to: 'SS.7.CG.1.5', fromTitle: 'British Policies and Colonial Reactions' },
  { from: 'SS.7.CG.1.4', to: 'SS.7.CG.1.6', fromTitle: 'Principles and Ideals of the Declaration of Independence' },
  { from: 'SS.7.CG.1.5', to: 'SS.7.CG.1.7', fromTitle: 'Strengths and Weaknesses of the Articles of Confederation' },
  { from: 'SS.7.CG.1.6', to: 'SS.7.CG.1.1', fromTitle: "Creating the Constitution: Addressing the Articles' Weaknesses" },
  { from: 'SS.7.CG.1.7', to: 'SS.7.CG.1.8', fromTitle: 'Purposes of Government and the Preamble' },
  { from: 'SS.7.CG.1.8', to: 'SS.7.CG.1.11', fromTitle: 'Limited Government and the Rule of Law' },
  { from: 'SS.7.CG.1.11', to: 'SS.7.CG.1.2', fromTitle: 'The Bill of Rights: Securing Liberty' },
  // SS.7.CG.1.9 and SS.7.CG.1.10 keep their codes (content already matched).
]

async function applyBenchmarkCodeRealignment(prisma: PrismaClient): Promise<void> {
  const fired: CodeRename[] = []
  for (const r of CODE_RENAMES) {
    const row = await prisma.benchmark.findUnique({ where: { code: r.from }, select: { title: true } })
    if (row && row.title === r.fromTitle) fired.push(r)
  }
  if (fired.length === 0) return

  await prisma.$transaction(async (tx) => {
    // Phase 1: park fired rows (and their calibration-snapshot scopes) on temp codes.
    for (const r of fired) {
      await tx.benchmark.update({ where: { code: r.from }, data: { code: `LEGACY::${r.from}` } })
      await tx.confidenceCalibrationSnapshot.updateMany({
        where: { scope: `benchmark:${r.from}` },
        data: { scope: `benchmark:LEGACY::${r.from}` },
      })
    }
    // Phase 2: land on the official codes.
    for (const r of fired) {
      await tx.benchmark.update({ where: { code: `LEGACY::${r.from}` }, data: { code: r.to } })
      await tx.confidenceCalibrationSnapshot.updateMany({
        where: { scope: `benchmark:LEGACY::${r.from}` },
        data: { scope: `benchmark:${r.to}` },
      })
    }
  })
  console.log(`  ✓ Benchmark codes realigned to official SS.7.CG meanings (${fired.length} renames, row ids preserved)`)
}

// ── Unit 1 — Roots of the Republic (SS.7.CG.1.1–1.6) ─────────────────────────

const UNIT_1_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.1.1',
    title: 'Ancient Roots: Greece, Rome, and the Judeo-Christian Tradition',
    sequenceOrder: 1,
    officialStatement: official('SS.7.CG.1.1'),
    // INTERIM CONTENT BLOCK (ADR 0017): this row previously carried Constitutional
    // Convention content; it was repurposed to the official 1.1 meaning and its
    // question bank/lesson/terms were authored fresh as an interim block. A full
    // content build for this benchmark is tracked in the CLAUDE.md backlog.
    lessonSummary:
      'Students will analyze how ancient Greece, ancient Rome, and the Judeo-Christian tradition shaped ' +
      "America's constitutional republic. Key influences: Athenian direct democracy and citizen participation; " +
      'the Roman republic with elected representatives, civic virtue, and written law (the Twelve Tables); and ' +
      'the Judeo-Christian tradition of a moral law above rulers and the worth of every individual.',
    clarifications: [
      {
        text: 'Describe how ancient Greece (Athens) contributed the ideas of democracy and participation by citizens in government.',
        sequenceOrder: 1,
      },
      {
        text: 'Describe how ancient Rome contributed the ideas of a republic, elected representatives, civic virtue, and written law such as the Twelve Tables.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain how the Judeo-Christian tradition contributed the ideas of a higher moral law that binds rulers and the equal worth of individuals.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.2'],
  },
  {
    code: 'SS.7.CG.1.2',
    title: 'Founding Principles of American Law and Government',
    sequenceOrder: 2,
    officialStatement: official('SS.7.CG.1.2'),
    // INTERIM CONTENT BLOCK (ADR 0017): this row previously carried a content-free
    // Bill of Rights overview; it was repurposed to the official 1.2 meaning and
    // its question bank/lesson/terms were authored fresh as an interim block. A
    // full content build for this benchmark is tracked in the CLAUDE.md backlog.
    lessonSummary:
      "Students will trace the principles underlying America's founding ideas on law and government from their " +
      'sources into the founding documents: natural rights, the social contract, popular sovereignty, consent of ' +
      'the governed, limited government, republicanism, and the rule of law.',
    clarifications: [
      {
        text: 'Identify the founding principles — natural rights, social contract, popular sovereignty, consent of the governed, limited government, republicanism, and rule of law.',
        sequenceOrder: 1,
      },
      {
        text: 'Trace each principle to its sources, including ancient influences, English legal tradition, and Enlightenment thought.',
        sequenceOrder: 2,
      },
      {
        text: 'Recognize where the founding principles appear in the Declaration of Independence and the U.S. Constitution.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.1', 'SS.7.CG.1.4'],
  },
  {
    code: 'SS.7.CG.1.3',
    title: 'Documents That Shaped Colonial Views of Government',
    sequenceOrder: 3,
    officialStatement: official('SS.7.CG.1.3'),
    lessonSummary:
      'Students will trace how the Magna Carta, the Mayflower Compact, the English Bill of Rights, and Thomas ' +
      "Paine's Common Sense shaped colonists' views of government. British traditions such as common law and " +
      'colonial institutions (the Virginia House of Burgesses, New England town meetings) provided the lived ' +
      'experience of self-government that these documents informed.',
    clarifications: [
      {
        text: 'Explain the impact of the Magna Carta (limits on the monarch, due process) and the English Bill of Rights (rights of subjects, limits on royal power) on colonial views of government.',
        sequenceOrder: 1,
      },
      {
        text: "Explain the impact of the Mayflower Compact (self-government by consent) and Thomas Paine's Common Sense (the case for independence and republican government) on colonists' views.",
        sequenceOrder: 2,
      },
      {
        text: 'Describe how colonial institutions such as the Virginia House of Burgesses and New England town meetings put self-government into practice.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.2', 'SS.7.CG.1.4'],
  },
  {
    code: 'SS.7.CG.1.4',
    title: 'Enlightenment Ideas and the Founding',
    sequenceOrder: 4,
    officialStatement: official('SS.7.CG.1.4'),
    lessonSummary:
      'Students will analyze how Enlightenment ideas influenced the Founding — especially John Locke\'s theories ' +
      'of natural law, natural rights, and the social contract, and Montesquieu\'s view of separation of powers. ' +
      'Related ideas: popular sovereignty and consent of the governed.',
    clarifications: [
      {
        text: "Explain John Locke's theories of natural law, natural rights (life, liberty, property), and the social contract, and how they influenced the Founding.",
        sequenceOrder: 1,
      },
      {
        text: "Explain Montesquieu's view of separation of powers and how it influenced the design of American government.",
        sequenceOrder: 2,
      },
      {
        text: 'Describe how Enlightenment ideas such as popular sovereignty and consent of the governed appear in the founding documents.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.2', 'SS.7.CG.1.6'],
  },
  {
    code: 'SS.7.CG.1.5',
    title: 'British Policies and the Road to the Declaration of Independence',
    sequenceOrder: 5,
    officialStatement: official('SS.7.CG.1.5'),
    lessonSummary:
      'Students will describe how British economic and political policies following the French and Indian War — ' +
      'and Britain\'s responses to colonial concerns — led to the writing of the Declaration of Independence. ' +
      'Key topics: Navigation Acts, Stamp Act, Townshend Acts, taxation without representation, colonial ' +
      'responses (petitions, boycotts, committees of correspondence, Sons of Liberty).',
    clarifications: [
      {
        text: 'Describe British policies following the French and Indian War and how they increased tensions with the colonists.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain how colonial responses — including petitions, boycotts, and committees of correspondence — and British reactions to them escalated toward independence.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain how the failure of Britain to address colonial concerns led directly to the writing of the Declaration of Independence.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.6'],
  },
  {
    code: 'SS.7.CG.1.6',
    title: 'Ideas and Grievances of the Declaration of Independence',
    sequenceOrder: 6,
    officialStatement: official('SS.7.CG.1.6'),
    lessonSummary:
      'Students will analyze the ideas and grievances set forth in the Declaration of Independence. ' +
      'Key concepts: natural rights, self-evident truths, consent of the governed, the right to alter or abolish ' +
      'government, and the specific grievances against King George III versus the universal principles.',
    clarifications: [
      {
        text: 'Identify the philosophical foundations of the Declaration — natural rights, social contract, and popular sovereignty — and trace them to Enlightenment thinkers.',
        sequenceOrder: 1,
      },
      {
        text: 'Distinguish between the universal principles stated in the Declaration and the specific grievances listed against King George III.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain why the Declaration of Independence was historically significant as both a political break and a statement of democratic ideals.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.4', 'SS.7.CG.1.5'],
  },
]

// ── Unit 2 — Creating and Limiting Government (SS.7.CG.1.7–1.11) ─────────────

const UNIT_2_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.1.7',
    title: 'From the Articles of Confederation to the Constitution',
    sequenceOrder: 7,
    officialStatement: official('SS.7.CG.1.7'),
    lessonSummary:
      'Students will explain how the weaknesses of the Articles of Confederation led to the writing of the U.S. ' +
      "Constitution. Key weaknesses: Congress couldn't tax or enforce laws, no executive branch, no national " +
      "courts, one vote per state, unanimity for amendments. Shays' Rebellion exposed the weaknesses; the " +
      'Constitutional Convention addressed them through the new Constitution and its compromises.',
    clarifications: [
      {
        text: 'Identify the key weaknesses of the Articles of Confederation, including the inability to tax, lack of an executive branch, no national courts, and inability to enforce laws.',
        sequenceOrder: 1,
      },
      {
        text: "Explain how events such as Shays' Rebellion demonstrated that the Articles were inadequate and led leaders to call the Constitutional Convention.",
        sequenceOrder: 2,
      },
      {
        text: 'Explain how the U.S. Constitution addressed the weaknesses of the Articles, including through the convention\'s key compromises (the Great Compromise and the Three-Fifths Compromise).',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.6', 'SS.7.CG.1.8'],
  },
  {
    code: 'SS.7.CG.1.8',
    title: 'The Preamble: Purposes of Government',
    sequenceOrder: 8,
    officialStatement: official('SS.7.CG.1.8'),
    lessonSummary:
      'Students will explain the purpose of the Preamble to the U.S. Constitution: form a more perfect union, ' +
      'establish justice, insure domestic tranquility, provide for the common defense, promote the general ' +
      'welfare, and secure the blessings of liberty. They connect these purposes to the idea that government ' +
      'exists to protect rights and serve the people.',
    clarifications: [
      {
        text: 'Identify the six purposes of government stated in the Preamble and explain each in everyday terms.',
        sequenceOrder: 1,
      },
      {
        text: 'Connect the Preamble\'s goals to the founding view that government derives its power from the consent of the governed.',
        sequenceOrder: 2,
      },
      {
        text: 'Apply the purposes of government to real-world examples of what governments do (courts, defense, public services).',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.7', 'SS.7.CG.1.9'],
  },
  {
    code: 'SS.7.CG.1.9',
    title: 'How the Constitution Limits Government Power',
    sequenceOrder: 9,
    officialStatement: official('SS.7.CG.1.9'),
    lessonSummary:
      'Students will describe how the U.S. Constitution limits the powers of government through separation of ' +
      'powers, checks and balances, individual rights, the rule of law, and due process of law — and WHY the ' +
      'founders chose these designs to prevent tyranny.',
    clarifications: [
      {
        text: 'Explain separation of powers and identify the legislative, executive, and judicial branches and their basic roles.',
        sequenceOrder: 1,
      },
      {
        text: 'Describe how checks and balances let each branch limit the power of the others, with examples (veto, override, judicial review).',
        sequenceOrder: 2,
      },
      {
        text: 'Explain how protections for individual rights, the rule of law, and due process of law limit what government may do.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.8', 'SS.7.CG.1.10'],
  },
  {
    code: 'SS.7.CG.1.10',
    title: 'The Ratification Debate: Federalists and Anti-Federalists',
    sequenceOrder: 10,
    officialStatement: official('SS.7.CG.1.10'),
    lessonSummary:
      'Students will compare the viewpoints of the Federalists and the Anti-Federalists regarding ratification of ' +
      'the U.S. Constitution and the inclusion of a bill of rights. Federalists (Hamilton, Madison, Jay; The ' +
      'Federalist Papers) argued for the stronger national government; Anti-Federalists (Patrick Henry, Brutus) ' +
      'feared central power and demanded protections for individual rights and the states.',
    clarifications: [
      {
        text: 'Compare the main arguments of Federalists and Anti-Federalists over ratification of the Constitution.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain the role of The Federalist Papers in persuading citizens to support ratification.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain how Anti-Federalist concerns led to the promise and addition of a bill of rights.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.9', 'SS.7.CG.1.11'],
  },
  {
    code: 'SS.7.CG.1.11',
    title: 'The Rule of Law',
    sequenceOrder: 11,
    officialStatement: official('SS.7.CG.1.11'),
    lessonSummary:
      'Students will define the rule of law — no person, including those who govern, is above the law — and ' +
      'recognize its influence on the development of legal, political, and governmental systems in the United ' +
      'States. Key concepts: limited government, constitutionalism, the constitution as supreme law, due process, ' +
      'government bound by its own rules.',
    clarifications: [
      {
        text: 'Define the rule of law and explain how a written constitution enforces it by binding leaders and citizens alike to the same laws.',
        sequenceOrder: 1,
      },
      {
        text: 'Recognize the influence of the rule of law on American legal, political, and governmental systems (courts, due process, limits on officials).',
        sequenceOrder: 2,
      },
      {
        text: 'Distinguish government under the rule of law from unlimited (authoritarian) government using examples.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.9', 'SS.7.CG.1.10'],
  },
]

// ── Unit 3 — Citizenship, Rights, and Responsibilities (SS.7.CG.2.1–2.5) ─────
// Category: Roles, Rights, and Responsibilities of Citizens.

const UNIT_3_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.2.1',
    title: 'Citizenship: What It Means and How It Is Acquired',
    sequenceOrder: 12,
    officialStatement: official('SS.7.CG.2.1'),
    lessonSummary:
      'Students will define the term "citizen" and explain the constitutional means of becoming a U.S. citizen: ' +
      'citizenship by birth (including the 14th Amendment) and citizenship by naturalization, with its basic ' +
      'requirements and steps.',
    clarifications: [
      { text: 'Define "citizen" and explain the 14th Amendment\'s definition of citizenship.', sequenceOrder: 1 },
      { text: 'Distinguish citizenship by birth from citizenship by naturalization, and identify the basic steps and requirements of the naturalization process.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.2'],
  },
  {
    code: 'SS.7.CG.2.2',
    title: 'Obligations and Responsibilities of Citizens',
    sequenceOrder: 13,
    officialStatement: official('SS.7.CG.2.2'),
    lessonSummary:
      'Students will differentiate between obligations (legal duties such as obeying laws, paying taxes, jury duty, ' +
      'registering for selective service) and responsibilities (voluntary civic actions such as voting, ' +
      'volunteering, staying informed) of U.S. citizenship, and evaluate their impact on society.',
    clarifications: [
      { text: 'Differentiate legal obligations from voluntary civic responsibilities with examples.', sequenceOrder: 1 },
      { text: 'Evaluate how fulfilling obligations and responsibilities strengthens society and the constitutional republic.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.1', 'SS.7.CG.2.3'],
  },
  {
    code: 'SS.7.CG.2.3',
    title: 'The Bill of Rights and Other Amendments in Action',
    sequenceOrder: 14,
    officialStatement: official('SS.7.CG.2.3'),
    lessonSummary:
      'Students will identify the rights contained in the Bill of Rights and other amendments to the U.S. ' +
      'Constitution and apply them to real-life civic scenarios (speech, religion, press, assembly, due process).',
    clarifications: [
      { text: 'Identify protections in the Bill of Rights and key later amendments.', sequenceOrder: 1 },
      { text: 'Apply specific amendments to real-world scenarios.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.2', 'SS.7.CG.2.4'],
  },
  {
    code: 'SS.7.CG.2.4',
    title: 'How the Constitution Safeguards Individual Rights',
    sequenceOrder: 15,
    officialStatement: official('SS.7.CG.2.4'),
    lessonSummary:
      'Students will explain how the U.S. Constitution and the Bill of Rights safeguard individual rights — ' +
      'through enumerated protections, limits on government power, due process, and the courts as guardians of ' +
      'rights.',
    clarifications: [
      { text: 'Explain the mechanisms by which the Constitution and the Bill of Rights safeguard individual rights (enumerated protections, limited powers, due process, judicial protection).', sequenceOrder: 1 },
      { text: 'Recognize that rights are protected but not unlimited — government may balance individual rights against public safety and the rights of others.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.3', 'SS.7.CG.2.5'],
  },
  {
    code: 'SS.7.CG.2.5',
    title: 'The Trial Process and the Role of Juries',
    sequenceOrder: 16,
    officialStatement: official('SS.7.CG.2.5'),
    lessonSummary:
      'Students will describe the trial process and the role of juries in the administration of justice at the ' +
      'state and federal levels, including due process protections and the rights of the accused (counsel, ' +
      'speedy and public trial, trial by jury).',
    clarifications: [
      { text: 'Describe the basic steps of the trial process and the due process rights of the accused.', sequenceOrder: 1 },
      { text: 'Explain the role of juries in the administration of justice at both the state and federal levels.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.4'],
  },
]

// ── Unit 4 — Participation and Public Influence (SS.7.CG.2.6–2.10) ───────────
// Category: Government Policies and Political Processes.

const UNIT_4_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.2.6',
    title: 'Elections and Voting at Every Level',
    sequenceOrder: 17,
    officialStatement: official('SS.7.CG.2.6'),
    lessonSummary:
      'Students will examine the election and voting process at the local, state, and national levels, including ' +
      'voter registration, primaries and general elections, and the role political parties play in nominating ' +
      'candidates and organizing campaigns.',
    clarifications: [
      { text: 'Examine the voting process (registration, primaries, general elections) at the local, state, and national levels.', sequenceOrder: 1 },
      { text: 'Describe the role of political parties in elections and identify ways citizens participate beyond voting.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.7'],
  },
  {
    code: 'SS.7.CG.2.7',
    title: 'Qualifications to Hold Public Office',
    sequenceOrder: 18,
    officialStatement: official('SS.7.CG.2.7'),
    lessonSummary:
      'Students will identify the constitutional qualifications required to hold state and national office: ' +
      'President (35, natural-born citizen, 14 years residency), U.S. Senator (30, 9 years a citizen, state ' +
      'resident), U.S. Representative (25, 7 years a citizen, state resident), and the qualifications for ' +
      'Florida state offices such as governor and legislator.',
    clarifications: [
      { text: 'Identify the constitutional qualifications for President, U.S. Senator, and U.S. Representative.', sequenceOrder: 1 },
      { text: 'Identify the qualifications required to hold state office in Florida (governor, state legislator).', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.6', 'SS.7.CG.2.8'],
  },
  {
    code: 'SS.7.CG.2.8',
    title: 'Monitoring and Influencing Government: Media, Individuals, and Interest Groups',
    sequenceOrder: 19,
    officialStatement: official('SS.7.CG.2.8'),
    lessonSummary:
      'Students will examine the impact of media, individuals, and interest groups on monitoring and influencing ' +
      'government — the watchdog role of a free press, how individual citizens hold officials accountable, and ' +
      'how interest groups organize to shape public policy.',
    clarifications: [
      { text: 'Examine how media monitor government (watchdog role) and influence public opinion.', sequenceOrder: 1 },
      { text: 'Examine how individuals and interest groups monitor and influence government, and evaluate sources for reliability.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.7', 'SS.7.CG.2.9'],
  },
  {
    code: 'SS.7.CG.2.9',
    title: 'Bias, Symbolism, and Propaganda in Political Communication',
    sequenceOrder: 20,
    officialStatement: official('SS.7.CG.2.9'),
    lessonSummary:
      'Students will analyze media and political communications — ads, speeches, cartoons, social media — and ' +
      'identify examples of bias, symbolism, and propaganda techniques used to persuade audiences.',
    clarifications: [
      { text: 'Identify examples of bias and propaganda techniques in media and political communications.', sequenceOrder: 1 },
      { text: 'Interpret symbolism in political communications (e.g., political cartoons, campaign imagery).', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.8', 'SS.7.CG.2.10'],
  },
  {
    code: 'SS.7.CG.2.10',
    title: 'Solving Public Problems: Policy Alternatives and Civic Action',
    sequenceOrder: 21,
    officialStatement: official('SS.7.CG.2.10'),
    lessonSummary:
      'Students will explain the process for citizens to address a state or local problem: researching public ' +
      'policy alternatives, identifying the appropriate government agencies to address the issue, and ' +
      'determining a course of action.',
    clarifications: [
      { text: 'Explain how citizens research public policy alternatives for a state or local problem.', sequenceOrder: 1 },
      { text: 'Identify appropriate government agencies for an issue and determine a course of civic action.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.9'],
  },
]

// ── Unit 5 — Constitutional Structure and Federalism (SS.7.CG.3.1–3.5) ───────
// Category: Organization and Function of Government.

const UNIT_5_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.3.1',
    title: 'Advantages of the Constitutional Republic',
    sequenceOrder: 22,
    officialStatement: official('SS.7.CG.3.1'),
    lessonSummary:
      "Students will analyze the advantages of the United States' constitutional republic over other forms of " +
      'government in safeguarding liberty, freedom, and a representative government — power comes from the ' +
      'people and is exercised through elected representatives under a constitution.',
    clarifications: [
      { text: 'Define a constitutional republic and representative government.', sequenceOrder: 1 },
      { text: 'Analyze the advantages of a constitutional republic over other forms of government (monarchy, oligarchy, direct democracy, autocracy) in safeguarding liberty and freedom.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.2'],
  },
  {
    code: 'SS.7.CG.3.2',
    title: 'Advantages of Federalism',
    sequenceOrder: 23,
    officialStatement: official('SS.7.CG.3.2'),
    lessonSummary:
      'Students will explain the advantages of a federal system of government over other systems in balancing ' +
      'local sovereignty with national unity and protecting against authoritarianism. Includes distinguishing ' +
      'national, state, and concurrent powers as the mechanics of that balance.',
    clarifications: [
      { text: 'Explain how a federal system balances local sovereignty with national unity, and distinguish national, state, and concurrent powers.', sequenceOrder: 1 },
      { text: 'Explain the advantages of federalism over unitary and confederal systems, including protection against authoritarianism.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.1', 'SS.7.CG.3.3'],
  },
  {
    code: 'SS.7.CG.3.3',
    title: 'The Three Branches: Structure and Function',
    sequenceOrder: 24,
    officialStatement: official('SS.7.CG.3.3'),
    lessonSummary:
      'Students will describe the structure and function of the three branches of government established in the ' +
      'U.S. Constitution — legislative, executive, and judicial — and their primary powers.',
    clarifications: [
      { text: 'Describe the structure and function of each of the three branches of government.', sequenceOrder: 1 },
      { text: 'Explain how the branches interact through checks and balances.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.2', 'SS.7.CG.3.4'],
  },
  {
    code: 'SS.7.CG.3.4',
    title: 'State and National Governments: Article IV and the 10th Amendment',
    sequenceOrder: 25,
    officialStatement: official('SS.7.CG.3.4'),
    lessonSummary:
      'Students will explain the relationship between state and national governments as written in Article IV of ' +
      'the U.S. Constitution (full faith and credit, privileges and immunities, guarantee of republican ' +
      'government) and the 10th Amendment (powers reserved to the states or the people).',
    clarifications: [
      { text: 'Explain what Article IV of the U.S. Constitution says about the relationship among states and between states and the national government.', sequenceOrder: 1 },
      { text: 'Explain the 10th Amendment and the reservation of powers to the states or the people, with examples of cooperation and conflict between levels of government.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.3', 'SS.7.CG.3.5'],
  },
  {
    code: 'SS.7.CG.3.5',
    title: 'Amending the Constitution: Article V',
    sequenceOrder: 26,
    officialStatement: official('SS.7.CG.3.5'),
    lessonSummary:
      'Students will explain the amendment process outlined in Article V of the U.S. Constitution — proposal by ' +
      'Congress or convention, ratification by the states — and why it was designed to be difficult but possible.',
    clarifications: [
      { text: 'Describe the Article V steps to propose and ratify an amendment.', sequenceOrder: 1 },
      { text: 'Explain why the amendment process balances stability and change.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.4'],
  },
]

// ── Unit 6 — Rights Expansion, Branches, Courts, and Law (SS.7.CG.3.6–3.12) ──
// Category: Organization and Function of Government.

const UNIT_6_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.3.6',
    title: 'Amendments That Broadened Political Participation',
    sequenceOrder: 27,
    officialStatement: official('SS.7.CG.3.6'),
    lessonSummary:
      'Students will analyze how the 13th, 14th, 15th, 19th, 24th, and 26th Amendments broadened participation ' +
      'in the political process — abolishing slavery, defining citizenship and equal protection, and extending ' +
      'the vote regardless of race, sex, wealth (poll taxes), or age (18+).',
    clarifications: [
      { text: 'Identify what the 13th, 14th, 15th, 19th, 24th, and 26th Amendments each did.', sequenceOrder: 1 },
      { text: 'Analyze how these amendments broadened participation in the political process over time.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.7'],
  },
  {
    code: 'SS.7.CG.3.7',
    title: 'The Legislative Branch and How Laws Are Made',
    sequenceOrder: 28,
    officialStatement: official('SS.7.CG.3.7'),
    lessonSummary:
      'Students will explain the structure, functions, and processes of the legislative branch — the two houses ' +
      'of Congress, their powers, and the basic steps by which a bill becomes a law.',
    clarifications: [
      { text: 'Describe the structure and powers of Congress.', sequenceOrder: 1 },
      { text: 'Sequence the steps of how a bill becomes a law.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.6', 'SS.7.CG.3.8'],
  },
  {
    code: 'SS.7.CG.3.8',
    title: 'The Executive Branch and Its Powers',
    sequenceOrder: 29,
    officialStatement: official('SS.7.CG.3.8'),
    lessonSummary:
      'Students will explain the structure, functions, and processes of the executive branch, including the ' +
      'President, the Cabinet, and federal departments and agencies that carry out and enforce laws.',
    clarifications: [
      { text: 'Identify the roles and powers of the President.', sequenceOrder: 1 },
      { text: 'Explain how the executive branch carries out and enforces laws.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.7', 'SS.7.CG.3.9'],
  },
  {
    code: 'SS.7.CG.3.9',
    title: 'The Judicial Branch: Courts and Judicial Review',
    sequenceOrder: 30,
    officialStatement: official('SS.7.CG.3.9'),
    lessonSummary:
      'Students will explain the structure, functions, and processes of the judicial branch — trial and appellate ' +
      'courts in the federal system, how cases move through the courts, and the power of judicial review ' +
      'established in Marbury v. Madison.',
    clarifications: [
      { text: 'Describe the structure and function of the federal court system, including trial and appellate courts and how a case can be appealed.', sequenceOrder: 1 },
      { text: 'Explain judicial review and its significance.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.8', 'SS.7.CG.3.10'],
  },
  {
    code: 'SS.7.CG.3.10',
    title: 'Sources and Types of Law',
    sequenceOrder: 31,
    officialStatement: official('SS.7.CG.3.10'),
    lessonSummary:
      'Students will identify the sources of law (constitutional, statutory, case/common law) and distinguish ' +
      'among the types of law (criminal, civil, juvenile, military) and their purposes.',
    clarifications: [
      { text: 'Identify sources of law (constitutional, statutory, case/common law).', sequenceOrder: 1 },
      { text: 'Distinguish types of law (criminal, civil) and their purposes.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.9', 'SS.7.CG.3.11'],
  },
  {
    code: 'SS.7.CG.3.11',
    title: 'Landmark Supreme Court Decisions',
    sequenceOrder: 32,
    officialStatement: official('SS.7.CG.3.11'),
    lessonSummary:
      'Students will analyze the effects of landmark Supreme Court decisions on law, liberty, and the ' +
      'interpretation of the U.S. Constitution.',
    clarifications: [
      { text: 'Identify landmark cases and their core holdings.', sequenceOrder: 1 },
      { text: 'Analyze the effects of landmark decisions on law, liberty, and constitutional interpretation.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.10', 'SS.7.CG.3.12'],
  },
  {
    code: 'SS.7.CG.3.12',
    title: 'Comparing the U.S. and Florida Constitutions',
    sequenceOrder: 33,
    officialStatement: official('SS.7.CG.3.12'),
    lessonSummary:
      'Students will compare the U.S. and Florida constitutions — their structures (preambles, articles, ' +
      'amendments), declarations of rights, separation of powers, and how each is amended.',
    clarifications: [
      { text: 'Compare the structure of the U.S. Constitution and the Florida Constitution (preamble, articles, rights protections).', sequenceOrder: 1 },
      { text: 'Compare how the U.S. and Florida constitutions distribute power and how each can be amended.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.11'],
  },
]

// ── Unit 7 — Government Services, Electoral College, and Economics (3.13–3.15) ─
// Category: Organization and Function of Government.

const UNIT_7_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.3.13',
    title: 'Government Obligations and Public Services',
    sequenceOrder: 34,
    officialStatement: official('SS.7.CG.3.13'),
    lessonSummary:
      'Students will explain government obligations to its citizens and the services provided at the local, ' +
      'state, and national levels (defense, education, infrastructure, public safety) and how they are funded.',
    clarifications: [
      { text: 'Explain government obligations to citizens and identify services provided at the local, state, and national levels.', sequenceOrder: 1 },
      { text: 'Explain how government services are funded through taxes.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.14'],
  },
  {
    code: 'SS.7.CG.3.14',
    title: 'The Electoral College',
    sequenceOrder: 35,
    officialStatement: official('SS.7.CG.3.14'),
    lessonSummary:
      'Students will explain the purpose and function of the Electoral College in electing the President of the ' +
      'United States and why the founders created it.',
    clarifications: [
      { text: 'Explain the purpose and function of the Electoral College in electing the President.', sequenceOrder: 1 },
      { text: 'Describe arguments about the Electoral College.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.13', 'SS.7.CG.3.15'],
  },
  {
    code: 'SS.7.CG.3.15',
    title: 'Capitalism and the Free Market',
    sequenceOrder: 36,
    officialStatement: official('SS.7.CG.3.15'),
    lessonSummary:
      'Students will analyze the advantages of capitalism and the free market in the United States over ' +
      'government-controlled economic systems (socialism, communism) in regard to economic freedom and raising ' +
      'the standard of living for citizens.',
    clarifications: [
      { text: 'Analyze the advantages of capitalism and the free market for economic freedom and standard of living.', sequenceOrder: 1 },
      { text: 'Compare free-market capitalism with government-controlled economic systems (socialism, communism).', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.14'],
  },
]

// ── Unit registry ───────────────────────────────────────────────────────────

export const UNITS: UnitDef[] = [
  {
    id: 'unit-1',
    sequenceOrder: 1,
    title: 'Unit 1: Roots of the Republic',
    description:
      'Covers the origins of American government: ancient Greece, Rome, and the Judeo-Christian tradition, the ' +
      'founding principles, key documents from the Magna Carta to Common Sense, Enlightenment ideas, British ' +
      'policies, and the Declaration of Independence.',
    gameRegionName: "Founders' Harbor",
    categoryKey: 'ORIGINS',
    active: true,
    benchmarks: UNIT_1_BENCHMARKS,
  },
  {
    id: 'unit-2',
    sequenceOrder: 2,
    title: 'Unit 2: Creating and Limiting Government',
    description:
      'Covers the path from the Articles of Confederation to the U.S. Constitution, the Preamble, how the ' +
      'Constitution limits government power, the ratification debate between Federalists and Anti-Federalists, ' +
      'and the rule of law.',
    gameRegionName: 'Constitution Forge',
    categoryKey: 'ORIGINS',
    active: true, // Phase 15: Unit 2 question bank seeded
    benchmarks: UNIT_2_BENCHMARKS,
  },
  {
    id: 'unit-3',
    sequenceOrder: 3,
    title: 'Unit 3: Citizenship, Rights, and Responsibilities',
    description:
      'Covers what citizenship means and how it is acquired, civic obligations and responsibilities, the Bill of ' +
      'Rights and other amendments in action, how the Constitution safeguards rights, and the trial process and ' +
      'the role of juries.',
    gameRegionName: 'Rights District',
    categoryKey: 'CITIZENS',
    active: false, // benchmarks loaded; question bank in a later session
    benchmarks: UNIT_3_BENCHMARKS,
  },
  {
    id: 'unit-4',
    sequenceOrder: 4,
    title: 'Unit 4: Participation and Public Influence',
    description:
      'Covers elections and voting, constitutional qualifications for public office, how media, individuals, and ' +
      'interest groups monitor and influence government, bias, symbolism, and propaganda in political ' +
      'communication, and civic problem-solving through public policy.',
    gameRegionName: 'Civic Square',
    categoryKey: 'POLICIES',
    active: false,
    benchmarks: UNIT_4_BENCHMARKS,
  },
  {
    id: 'unit-5',
    sequenceOrder: 5,
    title: 'Unit 5: Constitutional Structure and Federalism',
    description:
      'Covers the advantages of the constitutional republic and of federalism, the three branches, the ' +
      'state–national relationship under Article IV and the 10th Amendment, and the Article V amendment process.',
    gameRegionName: 'Federalism Frontier',
    categoryKey: 'ORGANIZATION',
    active: false,
    benchmarks: UNIT_5_BENCHMARKS,
  },
  {
    id: 'unit-6',
    sequenceOrder: 6,
    title: 'Unit 6: Rights Expansion, Branches, Courts, and Law',
    description:
      'Covers the amendments that broadened political participation (13th–26th), the legislative, executive, and ' +
      'judicial branches, sources and types of law, landmark Supreme Court decisions, and comparing the U.S. and ' +
      'Florida constitutions.',
    gameRegionName: 'Justice Citadel',
    categoryKey: 'ORGANIZATION',
    active: false,
    benchmarks: UNIT_6_BENCHMARKS,
  },
  {
    id: 'unit-7',
    sequenceOrder: 7,
    title: 'Unit 7: Government Services, Electoral College, and Economics',
    description:
      'Covers government obligations and public services, the Electoral College, and the advantages of ' +
      'capitalism and the free market.',
    gameRegionName: 'Republic Summit',
    categoryKey: 'ORGANIZATION',
    active: false,
    benchmarks: UNIT_7_BENCHMARKS,
  },
]

const CATEGORY_NAME_BY_KEY: Record<CategoryKey, string> = {
  ORIGINS: REPORTING_CATEGORY_NAMES.ORIGINS,
  CITIZENS: REPORTING_CATEGORY_NAMES.CITIZENS,
  POLICIES: REPORTING_CATEGORY_NAMES.POLICIES,
  ORGANIZATION: REPORTING_CATEGORY_NAMES.ORGANIZATION,
}

export async function seedBenchmarks(prisma: PrismaClient): Promise<void> {
  // ── Realign legacy code labels first (row ids preserved — ADR 0017) ───────
  await applyBenchmarkCodeRealignment(prisma)

  // ── Resolve the four reporting categories ───────────────────────────────
  const categories = await prisma.reportingCategory.findMany({ select: { id: true, name: true } })
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]))
  function categoryIdFor(key: CategoryKey): string {
    const id = categoryIdByName.get(CATEGORY_NAME_BY_KEY[key])
    if (!id) throw new Error(`Reporting category "${CATEGORY_NAME_BY_KEY[key]}" not found — run seedReportingCategories first.`)
    return id
  }

  let benchmarkCount = 0

  // ── Upsert units + their benchmarks ─────────────────────────────────────
  for (const unit of UNITS) {
    const unitRow = await prisma.unit.upsert({
      where: { id: unit.id },
      create: {
        id: unit.id,
        title: unit.title,
        description: unit.description,
        sequenceOrder: unit.sequenceOrder,
        gameRegionName: unit.gameRegionName,
        active: unit.active,
      },
      update: {
        title: unit.title,
        description: unit.description,
        gameRegionName: unit.gameRegionName,
        active: unit.active,
      },
    })

    const reportingCategoryId = categoryIdFor(unit.categoryKey)

    for (const bm of unit.benchmarks) {
      const benchmark = await prisma.benchmark.upsert({
        where: { code: bm.code },
        create: {
          code: bm.code,
          title: bm.title,
          unitId: unitRow.id,
          reportingCategoryId,
          sequenceOrder: bm.sequenceOrder,
          lessonSummary: bm.lessonSummary,
          officialStatement: bm.officialStatement,
          approvalStatus: 'APPROVED',
          version: 1,
        },
        update: {
          title: bm.title,
          unitId: unitRow.id,
          reportingCategoryId,
          sequenceOrder: bm.sequenceOrder,
          lessonSummary: bm.lessonSummary,
          officialStatement: bm.officialStatement,
        },
      })
      benchmarkCount++

      // Clarifications — rewrite from defs (nothing FKs clarifications, so a
      // delete + recreate keeps them in lockstep with the defs; the old
      // create-once guard let changed clarifications silently never propagate).
      await prisma.benchmarkClarification.deleteMany({ where: { benchmarkId: benchmark.id } })
      for (const clar of bm.clarifications) {
        await prisma.benchmarkClarification.create({
          data: { benchmarkId: benchmark.id, text: clar.text, sequenceOrder: clar.sequenceOrder },
        })
      }
    }
  }

  // ── Benchmark connections — rebuild from defs (after all benchmarks exist).
  // Connections are seed-owned and nothing FKs them; a full rebuild clears the
  // stale edges the old upsert-only pass left behind after the realignment.
  await prisma.benchmarkConnection.deleteMany({})
  for (const unit of UNITS) {
    for (const bm of unit.benchmarks) {
      const source = await prisma.benchmark.findUnique({ where: { code: bm.code } })
      if (!source) continue
      for (const targetCode of bm.connectsTo) {
        const target = await prisma.benchmark.findUnique({ where: { code: targetCode } })
        if (!target) continue
        await prisma.benchmarkConnection.create({
          data: { benchmarkId: source.id, connectedBenchmarkId: target.id, relationshipType: 'SUPPORTS' },
        })
      }
    }
  }

  // ── Seed default accommodations ───────────────────────────────────────
  //
  // ⚠ A description here is a PROMISE TO A TEACHER READING AN IEP. If the code
  // does not do what the text says, a teacher grants the support, believes it
  // took effect, and the student does not get it. Three entries below were in
  // exactly that state until 2026-08-07 (ACC-EXT-TIME, ACC-REDUCED-CHOICES,
  // ACC-SCREEN-READER); each is now either implemented or described accurately.
  // Do not add an aspirational description. Describe what ships today.
  const accommodations = [
    {
      code: 'ACC-EXT-TIME',
      name: 'Extended Time',
      // Not implemented, and deliberately so: there is nothing to extend. No
      // assessment, drill, or lesson in this platform has a time limit — no
      // countdown, no expiry, no timed field in the schema. Every student
      // already has unlimited time, which meets or exceeds what this
      // accommodation asks for. Recorded so the grant appears on the student's
      // profile for IEP documentation.
      description:
        'No action needed — this platform is untimed for every student. Nothing here has a time limit or countdown, so extended time is already met. Recorded for IEP documentation.',
    },
    { code: 'ACC-READ-ALOUD', name: 'Read-Aloud', description: 'Read-aloud is available to every student on all passages; this grant records the IEP requirement.' },
    { code: 'ACC-CHUNK', name: 'Sentence Chunking', description: 'Sentence chunking is available to every student on all passages; this grant records the IEP requirement.' },
    { code: 'ACC-SIMPLE-LANG', name: 'Simplified Language', description: 'Defaults stimulus to reading-load level 1 where available.' },
    { code: 'ACC-T2-VOCAB', name: 'Tier-2 Vocabulary Popovers Always On', description: 'Tier-2 academic words always show glossary popover.' },
    {
      code: 'ACC-REDUCED-CHOICES',
      name: 'Reduced Answer Choices',
      description:
        'Serves 3 answer choices instead of 4 on Practice, Pre-Check, Word Builder, and Unit Review. Never on the Mastery Challenge, Readiness Check, or Republic Challenge — changing the odds of a guess there would change what mastery means.',
    },
    { code: 'ACC-BREAKS', name: 'Frequent Breaks', description: 'Auto-suggests a pause every 10 minutes across all sessions.' },
    {
      code: 'ACC-SCREEN-READER',
      name: 'Screen Reader Optimized',
      // Not a per-student toggle and should never have been one: ARIA labelling
      // and tab order are properties of the whole application, applied to every
      // page for every student. There is no code that could key off this grant
      // without implying the app is less accessible when it is absent.
      description:
        'No action needed — ARIA labelling and keyboard tab order apply to every page for every student, not per account. Recorded for IEP documentation. Note that manual screen-reader testing is still outstanding (see the district packet, §9.3).',
    },
    { code: 'ACC-HIGH-CONTRAST', name: 'High Contrast Mode', description: 'Switches the color palette to a high-contrast scheme.' },
    { code: 'ACC-LARGE-TEXT', name: 'Large Text', description: 'Bumps the base font size; layout reflows.' },
    { code: 'ACC-CONTEXT-BOOST', name: 'Background Context Cards', description: 'Optional 30-60s context cards before unfamiliar references. (Cards wired in a later phase.)' },
    { code: 'ELL', name: 'English Language Learner', description: 'Defaults stimulus content to reading-load level 1 for practice. Tier-2 glossary and sentence-chunking enabled by default.' },
    { code: 'BELOW-GRADE-READER', name: 'Below-Grade Reader', description: 'Defaults stimulus content to reading-load level 1. Read-aloud and sentence-chunking enabled by default.' },
    // Phase 16: L1 gloss accommodations (Appendix G). Resolve to a gloss language
    // in src/lib/l1-glosses; honored alongside the student's l1_language field.
    { code: 'ACC-L1-SPANISH', name: 'Spanish Glosses', description: 'Tier-3 civics terms display an approved Spanish gloss on hover/tap.' },
    { code: 'ACC-L1-CREOLE', name: 'Haitian Creole Glosses', description: 'Tier-3 civics terms display an approved Haitian Creole gloss on hover/tap.' },
  ]
  for (const acc of accommodations) {
    await prisma.accommodation.upsert({
      where: { code: acc.code },
      create: acc,
      update: { name: acc.name, description: acc.description },
    })
  }

  console.log(`  ✓ Units seeded (${UNITS.length} total)`)
  console.log(`  ✓ Benchmarks seeded (${benchmarkCount} across the full SS.7.CG course)`)
  console.log(`  ✓ Accommodations seeded (${accommodations.length})`)
}
