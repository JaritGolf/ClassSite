/**
 * Seed: Units and Benchmarks — full SS.7.CG course (Phase 15 expansion)
 *
 * Unit 1 (SS.7.CG.1.1–1.6) was seeded in Phase 1. Phase 15 loads ALL units and
 * benchmarks (the full 36-benchmark course) with reporting-category mapping:
 *   - SS.7.CG.1.x          → Origins and Purposes        (Units 1–2)
 *   - SS.7.CG.2.1–2.5       → Roles, Rights, Responsibilities (Unit 3)
 *   - SS.7.CG.2.6–2.10      → Government Policies / Processes  (Unit 4)
 *   - SS.7.CG.3.x          → Organization and Function   (Units 5–7)
 * (Mapping per seed/reporting_categories.ts descriptions and spec §7.3/§11; the
 * exact official blueprint must be re-verified before production.)
 *
 * Question banks fill in per unit (Unit 1 + Unit 2 today; Units 3–7 later).
 * Idempotent: units upserted by id, benchmarks by code.
 */

import { PrismaClient } from '@prisma/client'
import { REPORTING_CATEGORY_NAMES } from './reporting_categories'

type CategoryKey = 'ORIGINS' | 'CITIZENS' | 'POLICIES' | 'ORGANIZATION'

interface ClarificationDef {
  text: string
  sequenceOrder: number
}

interface BenchmarkDef {
  code: string
  title: string
  sequenceOrder: number
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

// ── Unit 1 — Foundations of American Government (SS.7.CG.1.1–1.6) ────────────

const UNIT_1_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.1.1',
    title: 'Enlightenment and European Influences on American Democracy',
    sequenceOrder: 1,
    lessonSummary:
      'Students will trace how Enlightenment ideas — especially natural rights, social contract, ' +
      'popular sovereignty, and consent of the governed — influenced the American founding. ' +
      'Key thinkers: John Locke, Montesquieu, Rousseau. Key documents: Magna Carta, English Bill of Rights, ' +
      'Mayflower Compact.',
    clarifications: [
      {
        text: 'Explain how Enlightenment philosophers (Locke, Montesquieu) contributed ideas used in founding documents.',
        sequenceOrder: 1,
      },
      {
        text: 'Identify key European foundational documents (Magna Carta, English Bill of Rights) and explain their influence on American self-governance.',
        sequenceOrder: 2,
      },
      {
        text: 'Describe the concepts of natural rights, social contract, popular sovereignty, consent of the governed, and rule of law.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.4'],
  },
  {
    code: 'SS.7.CG.1.2',
    title: 'Colonial and British Governmental Traditions',
    sequenceOrder: 2,
    lessonSummary:
      'Students will examine how British governmental traditions and colonial experiences created a ' +
      'foundation for American self-governance. Key concepts: colonial assemblies, Virginia House of Burgesses, ' +
      'New England town meetings, common law, salutary neglect, Mayflower Compact.',
    clarifications: [
      {
        text: 'Describe how colonial governments developed traditions of self-governance through institutions such as the Virginia House of Burgesses and New England town meetings.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain the role of salutary neglect in enabling colonial self-governance to develop prior to the Revolution.',
        sequenceOrder: 2,
      },
      {
        text: 'Identify the influence of English common law on American legal and governmental traditions.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.1', 'SS.7.CG.1.3'],
  },
  {
    code: 'SS.7.CG.1.3',
    title: 'British Policies and Colonial Reactions',
    sequenceOrder: 3,
    lessonSummary:
      'Students will analyze how British economic and political policies following the French and Indian War ' +
      'created colonial grievances and sparked resistance. Key topics: Navigation Acts, Stamp Act, Townshend Acts, ' +
      'taxation without representation, colonial responses (petitions, boycotts, Sons of Liberty).',
    clarifications: [
      {
        text: 'Describe British policies following the French and Indian War and how they increased tensions with the colonists.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain how colonial responses — including petitions, boycotts, and committees of correspondence — represented organized resistance.',
        sequenceOrder: 2,
      },
      {
        text: 'Analyze how the principle of "no taxation without representation" reflected Enlightenment ideas about consent of the governed.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.2', 'SS.7.CG.1.4'],
  },
  {
    code: 'SS.7.CG.1.4',
    title: 'Principles and Ideals of the Declaration of Independence',
    sequenceOrder: 4,
    lessonSummary:
      'Students will explain the philosophical foundations and historical significance of the Declaration of Independence. ' +
      'Key concepts: natural rights, self-evident truths, consent of the governed, right to alter or abolish government, ' +
      'specific grievances vs. universal principles, Thomas Jefferson.',
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
    connectsTo: ['SS.7.CG.1.1', 'SS.7.CG.1.3', 'SS.7.CG.1.5'],
  },
  {
    code: 'SS.7.CG.1.5',
    title: 'Strengths and Weaknesses of the Articles of Confederation',
    sequenceOrder: 5,
    lessonSummary:
      "Students will analyze the first U.S. plan of government. Key weaknesses: Congress couldn't tax, " +
      "couldn't enforce laws, no executive branch, no national courts, each state had one vote, amendments required " +
      'unanimity. Key event: Shays\' Rebellion revealed the government\'s inability to maintain order.',
    clarifications: [
      {
        text: 'Identify the key weaknesses of the Articles of Confederation, including the inability to tax, lack of executive branch, no national courts, and inability to enforce laws.',
        sequenceOrder: 1,
      },
      {
        text: "Explain how events such as Shays' Rebellion demonstrated that the Articles of Confederation were inadequate to govern the new nation.",
        sequenceOrder: 2,
      },
      {
        text: 'Describe why leaders called for a Constitutional Convention rather than simply amending the Articles.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.4', 'SS.7.CG.1.6'],
  },
  {
    code: 'SS.7.CG.1.6',
    title: 'Creating the Constitution: Addressing the Articles\' Weaknesses',
    sequenceOrder: 6,
    lessonSummary:
      'Students will examine how the Constitutional Convention addressed the failures of the Articles of Confederation. ' +
      'Key topics: Great Compromise (bicameral legislature), Three-Fifths Compromise, Connecticut Plan, Virginia Plan, ' +
      'New Jersey Plan, Federalists vs. Anti-Federalists, ratification debate, Bill of Rights.',
    clarifications: [
      {
        text: 'Explain how the Constitution addressed specific weaknesses of the Articles, including granting Congress power to tax, creating an executive branch, and establishing federal courts.',
        sequenceOrder: 1,
      },
      {
        text: 'Describe the key debates and compromises at the Constitutional Convention, including the Great Compromise (equal Senate seats + proportional House) and the Three-Fifths Compromise.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain the Federalist/Anti-Federalist debate over ratification and how the promise of a Bill of Rights helped secure ratification.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.5'],
  },
]

// ── Unit 2 — Creating and Limiting Government (SS.7.CG.1.7–1.11) ─────────────
// Category: Origins and Purposes. Full question bank seeded in Phase 15.

const UNIT_2_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.1.7',
    title: 'Purposes of Government and the Preamble',
    sequenceOrder: 7,
    lessonSummary:
      'Students will explain the purposes of government as expressed in the Preamble to the U.S. Constitution: ' +
      'form a more perfect union, establish justice, insure domestic tranquility, provide for the common defense, ' +
      'promote the general welfare, and secure the blessings of liberty. They connect these purposes to the ' +
      'Enlightenment idea that government exists to protect rights and serve the people.',
    clarifications: [
      {
        text: 'Identify the six purposes of government stated in the Preamble and explain each in everyday terms.',
        sequenceOrder: 1,
      },
      {
        text: 'Connect the Preamble\'s goals to the Enlightenment view that government derives its power from the consent of the governed.',
        sequenceOrder: 2,
      },
      {
        text: 'Apply the purposes of government to real-world examples of what governments do (courts, defense, public services).',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.6', 'SS.7.CG.1.8'],
  },
  {
    code: 'SS.7.CG.1.8',
    title: 'Limited Government and the Rule of Law',
    sequenceOrder: 8,
    lessonSummary:
      'Students will explain how the Constitution limits government power through the rule of law, ' +
      'constitutionalism, and the idea that no person is above the law. Key concepts: limited government, ' +
      'rule of law, constitution as supreme law, due process, government bound by its own rules.',
    clarifications: [
      {
        text: 'Define limited government and the rule of law and explain how a written constitution enforces them.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain how the rule of law means that leaders and citizens alike must follow the same laws.',
        sequenceOrder: 2,
      },
      {
        text: 'Distinguish limited government from unlimited (authoritarian) government using examples.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.7', 'SS.7.CG.1.9'],
  },
  {
    code: 'SS.7.CG.1.9',
    title: 'Constitutional Principles: Separation of Powers, Checks and Balances, and Federalism',
    sequenceOrder: 9,
    lessonSummary:
      'Students will explain the design principles that limit and distribute government power: separation of powers ' +
      '(three branches), checks and balances (each branch limits the others), and federalism (power shared between ' +
      'national and state governments). The focus is on WHY the founders chose these designs to prevent tyranny.',
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
        text: 'Explain federalism as the division of power between national and state governments and why it limits central power.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.8', 'SS.7.CG.1.10'],
  },
  {
    code: 'SS.7.CG.1.10',
    title: 'The Ratification Debate: Federalists and Anti-Federalists',
    sequenceOrder: 10,
    lessonSummary:
      'Students will analyze the debate over ratifying the Constitution. Federalists (Hamilton, Madison, Jay; ' +
      'The Federalist Papers) argued for a stronger national government; Anti-Federalists (e.g., Patrick Henry, ' +
      'Brutus) feared too much central power and demanded protections for individual rights and the states.',
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
        text: 'Explain how Anti-Federalist concerns led to the promise and addition of a Bill of Rights.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.9', 'SS.7.CG.1.11'],
  },
  {
    code: 'SS.7.CG.1.11',
    title: 'The Bill of Rights: Securing Liberty',
    sequenceOrder: 11,
    lessonSummary:
      'Students will explain why the Bill of Rights (the first ten amendments) was added to the Constitution and ' +
      'what core protections it secures: freedoms of the First Amendment, protections for the accused, and the ' +
      'idea that powers not given to the federal government are reserved to the states or the people.',
    clarifications: [
      {
        text: 'Explain why the Bill of Rights was added and how it responded to Anti-Federalist concerns.',
        sequenceOrder: 1,
      },
      {
        text: 'Identify core protections of the Bill of Rights, especially First Amendment freedoms and rights of the accused.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain how the Bill of Rights reflects the principle of limited government by protecting individuals from government overreach.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.10'],
  },
]

// ── Unit 3 — Citizenship, Rights, and Responsibilities (SS.7.CG.2.1–2.5) ─────
// Category: Roles, Rights, and Responsibilities of Citizens.

const UNIT_3_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.2.1',
    title: 'Becoming a Citizen: Paths to U.S. Citizenship',
    sequenceOrder: 12,
    lessonSummary:
      'Students will explain the methods of acquiring U.S. citizenship (birth and naturalization) and the basic ' +
      'requirements and steps of the naturalization process.',
    clarifications: [
      { text: 'Distinguish citizenship by birth from citizenship by naturalization.', sequenceOrder: 1 },
      { text: 'Identify the basic steps and requirements of the naturalization process.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.2'],
  },
  {
    code: 'SS.7.CG.2.2',
    title: 'Obligations and Responsibilities of Citizens',
    sequenceOrder: 13,
    lessonSummary:
      'Students will distinguish obligations (legal duties such as obeying laws, paying taxes, jury duty, ' +
      'registering for selective service) from responsibilities (voluntary civic actions such as voting, ' +
      'volunteering, staying informed).',
    clarifications: [
      { text: 'Distinguish legal obligations from voluntary civic responsibilities with examples.', sequenceOrder: 1 },
      { text: 'Explain why civic participation strengthens a constitutional republic.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.1', 'SS.7.CG.2.3'],
  },
  {
    code: 'SS.7.CG.2.3',
    title: 'The Bill of Rights and Individual Protections',
    sequenceOrder: 14,
    lessonSummary:
      'Students will identify the rights protected by the Bill of Rights and later amendments and apply them to ' +
      'real-life civic scenarios (speech, religion, press, assembly, due process).',
    clarifications: [
      { text: 'Identify protections in the Bill of Rights and key later amendments.', sequenceOrder: 1 },
      { text: 'Apply specific amendments to real-world scenarios.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.2', 'SS.7.CG.2.4'],
  },
  {
    code: 'SS.7.CG.2.4',
    title: 'Limits on Rights and Balancing Interests',
    sequenceOrder: 15,
    lessonSummary:
      'Students will explain that constitutional rights are not unlimited and analyze how government may balance ' +
      'individual rights against public safety and the rights of others.',
    clarifications: [
      { text: 'Explain why rights have limits, using examples (e.g., speech that endangers others).', sequenceOrder: 1 },
      { text: 'Analyze cases where individual rights are balanced against public interests.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.3', 'SS.7.CG.2.5'],
  },
  {
    code: 'SS.7.CG.2.5',
    title: 'Due Process and the Trial Process',
    sequenceOrder: 16,
    lessonSummary:
      'Students will explain due process protections and the basic steps of the trial process, including rights ' +
      'of the accused (counsel, speedy and public trial, jury).',
    clarifications: [
      { text: 'Explain due process and the rights of the accused.', sequenceOrder: 1 },
      { text: 'Describe the basic steps of the trial process.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.4'],
  },
]

// ── Unit 4 — Participation and Public Influence (SS.7.CG.2.6–2.10) ───────────
// Category: Government Policies and Political Processes.

const UNIT_4_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.2.6',
    title: 'Elections, Voting, and Political Participation',
    sequenceOrder: 17,
    lessonSummary:
      'Students will explain how citizens participate in elections, the importance of voting, and the basic ' +
      'electoral process at local, state, and national levels.',
    clarifications: [
      { text: 'Explain the voting process and the importance of voter participation.', sequenceOrder: 1 },
      { text: 'Identify ways citizens influence government beyond voting.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.7'],
  },
  {
    code: 'SS.7.CG.2.7',
    title: 'Political Parties and Their Role',
    sequenceOrder: 18,
    lessonSummary:
      'Students will describe the role of political parties in the U.S. system, including nominating candidates, ' +
      'organizing government, and informing the public.',
    clarifications: [
      { text: 'Describe the functions of political parties.', sequenceOrder: 1 },
      { text: 'Compare how parties influence elections and policy.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.6', 'SS.7.CG.2.8'],
  },
  {
    code: 'SS.7.CG.2.8',
    title: 'Media, Public Opinion, and Civic Information',
    sequenceOrder: 19,
    lessonSummary:
      'Students will analyze how media shapes public opinion and how citizens evaluate the reliability of ' +
      'information sources.',
    clarifications: [
      { text: 'Explain how media influences public opinion.', sequenceOrder: 1 },
      { text: 'Evaluate sources for reliability and bias.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.7', 'SS.7.CG.2.9'],
  },
  {
    code: 'SS.7.CG.2.9',
    title: 'Interest Groups, Bias, and Persuasion',
    sequenceOrder: 20,
    lessonSummary:
      'Students will explain how interest groups and persuasive techniques (including bias and propaganda) attempt ' +
      'to influence public policy and opinion.',
    clarifications: [
      { text: 'Describe how interest groups influence policy.', sequenceOrder: 1 },
      { text: 'Identify bias and propaganda techniques in messages.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.8', 'SS.7.CG.2.10'],
  },
  {
    code: 'SS.7.CG.2.10',
    title: 'Public Policy and Civic Problem-Solving',
    sequenceOrder: 21,
    lessonSummary:
      'Students will analyze how public policy is made to address community problems and how citizens can ' +
      'participate in the policy-making process.',
    clarifications: [
      { text: 'Explain the steps of the public policy process.', sequenceOrder: 1 },
      { text: 'Propose civic solutions to a community problem.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.2.9'],
  },
]

// ── Unit 5 — Constitutional Structure and Federalism (SS.7.CG.3.1–3.5) ───────
// Category: Organization and Function of Government.

const UNIT_5_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.3.1',
    title: 'The United States as a Constitutional Republic',
    sequenceOrder: 22,
    lessonSummary:
      'Students will explain the core features of the U.S. as a constitutional republic in which power comes from ' +
      'the people and is exercised through elected representatives under a constitution.',
    clarifications: [
      { text: 'Define a constitutional republic and representative government.', sequenceOrder: 1 },
      { text: 'Contrast a republic with direct democracy and other systems.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.2'],
  },
  {
    code: 'SS.7.CG.3.2',
    title: 'Federalism: Sharing Power Between Levels of Government',
    sequenceOrder: 23,
    lessonSummary:
      'Students will explain federalism and distinguish the powers of national, state, and concurrent levels of ' +
      'government.',
    clarifications: [
      { text: 'Distinguish national, state, and concurrent powers.', sequenceOrder: 1 },
      { text: 'Explain how federalism distributes and limits power.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.1', 'SS.7.CG.3.3'],
  },
  {
    code: 'SS.7.CG.3.3',
    title: 'The Three Branches and Their Functions',
    sequenceOrder: 24,
    lessonSummary:
      'Students will identify the legislative, executive, and judicial branches and explain their primary ' +
      'functions and powers.',
    clarifications: [
      { text: 'Identify the function of each branch of government.', sequenceOrder: 1 },
      { text: 'Explain how the branches interact through checks and balances.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.2', 'SS.7.CG.3.4'],
  },
  {
    code: 'SS.7.CG.3.4',
    title: 'The Relationship Between State and National Government',
    sequenceOrder: 25,
    lessonSummary:
      'Students will analyze how state and national governments interact, including supremacy of federal law and ' +
      'cooperation and conflict between levels.',
    clarifications: [
      { text: 'Explain the supremacy clause and federal–state relationships.', sequenceOrder: 1 },
      { text: 'Analyze examples of cooperation and conflict between levels of government.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.3', 'SS.7.CG.3.5'],
  },
  {
    code: 'SS.7.CG.3.5',
    title: 'Amending the Constitution',
    sequenceOrder: 26,
    lessonSummary:
      'Students will explain the constitutional amendment process and why it was designed to be difficult but ' +
      'possible.',
    clarifications: [
      { text: 'Describe the steps to propose and ratify an amendment.', sequenceOrder: 1 },
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
    title: 'Expansion of Voting Rights Through Amendments',
    sequenceOrder: 27,
    lessonSummary:
      'Students will trace how amendments (15th, 19th, 24th, 26th) expanded voting rights over time.',
    clarifications: [
      { text: 'Identify amendments that expanded suffrage and whom they enfranchised.', sequenceOrder: 1 },
      { text: 'Explain how voting rights expanded across U.S. history.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.7'],
  },
  {
    code: 'SS.7.CG.3.7',
    title: 'The Legislative Branch and How Laws Are Made',
    sequenceOrder: 28,
    lessonSummary:
      'Students will explain the structure of Congress and the basic steps by which a bill becomes a law.',
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
    lessonSummary:
      'Students will explain the roles and powers of the executive branch, including the President and federal ' +
      'departments and agencies.',
    clarifications: [
      { text: 'Identify the roles and powers of the President.', sequenceOrder: 1 },
      { text: 'Explain how the executive branch carries out and enforces laws.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.7', 'SS.7.CG.3.9'],
  },
  {
    code: 'SS.7.CG.3.9',
    title: 'The Judicial Branch and Judicial Review',
    sequenceOrder: 30,
    lessonSummary:
      'Students will explain the structure of the federal courts and the power of judicial review established in ' +
      'Marbury v. Madison.',
    clarifications: [
      { text: 'Describe the structure and function of the federal court system.', sequenceOrder: 1 },
      { text: 'Explain judicial review and its significance.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.8', 'SS.7.CG.3.10'],
  },
  {
    code: 'SS.7.CG.3.10',
    title: 'Types of Law',
    sequenceOrder: 31,
    lessonSummary:
      'Students will distinguish among types of law (constitutional, statutory, criminal, civil) and their ' +
      'purposes.',
    clarifications: [
      { text: 'Distinguish criminal from civil law.', sequenceOrder: 1 },
      { text: 'Identify sources of law (constitutional, statutory).', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.9', 'SS.7.CG.3.11'],
  },
  {
    code: 'SS.7.CG.3.11',
    title: 'Landmark Supreme Court Cases',
    sequenceOrder: 32,
    lessonSummary:
      'Students will analyze the significance of landmark Supreme Court cases and their impact on rights and ' +
      'government power.',
    clarifications: [
      { text: 'Identify landmark cases and their core holdings.', sequenceOrder: 1 },
      { text: 'Explain the impact of landmark cases on civic life.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.10', 'SS.7.CG.3.12'],
  },
  {
    code: 'SS.7.CG.3.12',
    title: 'Trial and Appellate Courts',
    sequenceOrder: 33,
    lessonSummary:
      'Students will distinguish the roles of trial courts and appellate courts and explain how cases move ' +
      'through the court system.',
    clarifications: [
      { text: 'Distinguish trial courts from appellate courts.', sequenceOrder: 1 },
      { text: 'Explain how a case can be appealed.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.11'],
  },
]

// ── Unit 7 — Government Services, Electoral College, and Economics (3.13–3.15) ─
// Category: Organization and Function of Government.

const UNIT_7_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.3.13',
    title: 'Obligations of Government and Public Services',
    sequenceOrder: 34,
    lessonSummary:
      'Students will explain the services governments provide (defense, education, infrastructure, public safety) ' +
      'and how they are funded.',
    clarifications: [
      { text: 'Identify services provided at different levels of government.', sequenceOrder: 1 },
      { text: 'Explain how government services are funded through taxes.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.14'],
  },
  {
    code: 'SS.7.CG.3.14',
    title: 'The Electoral College',
    sequenceOrder: 35,
    lessonSummary:
      'Students will explain how the Electoral College works in presidential elections and why the founders ' +
      'created it.',
    clarifications: [
      { text: 'Explain how the Electoral College selects the President.', sequenceOrder: 1 },
      { text: 'Describe arguments about the Electoral College.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.13', 'SS.7.CG.3.15'],
  },
  {
    code: 'SS.7.CG.3.15',
    title: 'Economic Systems: Free Market and Mixed Economies',
    sequenceOrder: 36,
    lessonSummary:
      'Students will compare economic systems (free-market capitalism vs. government-controlled/command systems) ' +
      'and the U.S. mixed economy.',
    clarifications: [
      { text: 'Compare free-market and command economic systems.', sequenceOrder: 1 },
      { text: 'Explain features of the U.S. mixed economy.', sequenceOrder: 2 },
    ],
    connectsTo: ['SS.7.CG.3.14'],
  },
]

// ── Unit registry ───────────────────────────────────────────────────────────

const UNITS: UnitDef[] = [
  {
    id: 'unit-1',
    sequenceOrder: 1,
    title: 'Unit 1: Foundations of American Government',
    description:
      'Covers the origins of American democracy including Enlightenment influences, colonial self-governance, ' +
      'British policies, the Declaration of Independence, Articles of Confederation, and the Constitution.',
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
      'Covers the purposes of government in the Preamble, limited government and the rule of law, the constitutional ' +
      'principles of separation of powers / checks and balances / federalism, the ratification debate, and the Bill of Rights.',
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
      'Covers paths to citizenship, civic obligations and responsibilities, the Bill of Rights and individual ' +
      'protections, limits on rights, and due process and the trial process.',
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
      'Covers elections and voting, political parties, media and public opinion, interest groups and bias, and the ' +
      'public policy process.',
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
      'Covers the constitutional republic, federalism, the three branches, state–national relationships, and the ' +
      'amendment process.',
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
      'Covers voting-rights amendments, the legislative, executive, and judicial branches, types of law, landmark ' +
      'Supreme Court cases, and trial vs. appellate courts.',
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
      'Covers the obligations of government and public services, the Electoral College, and economic systems ' +
      'including the U.S. mixed economy.',
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
          approvalStatus: 'APPROVED',
          version: 1,
        },
        update: {
          title: bm.title,
          unitId: unitRow.id,
          reportingCategoryId,
          sequenceOrder: bm.sequenceOrder,
          lessonSummary: bm.lessonSummary,
        },
      })
      benchmarkCount++

      // Clarifications — create once (no stable unique key)
      const existing = await prisma.benchmarkClarification.count({ where: { benchmarkId: benchmark.id } })
      if (existing === 0) {
        for (const clar of bm.clarifications) {
          await prisma.benchmarkClarification.create({
            data: { benchmarkId: benchmark.id, text: clar.text, sequenceOrder: clar.sequenceOrder },
          })
        }
      }
    }
  }

  // ── Benchmark connections (after all benchmarks exist) ──────────────────
  for (const unit of UNITS) {
    for (const bm of unit.benchmarks) {
      const source = await prisma.benchmark.findUnique({ where: { code: bm.code } })
      if (!source) continue
      for (const targetCode of bm.connectsTo) {
        const target = await prisma.benchmark.findUnique({ where: { code: targetCode } })
        if (!target) continue
        await prisma.benchmarkConnection.upsert({
          where: { benchmarkId_connectedBenchmarkId: { benchmarkId: source.id, connectedBenchmarkId: target.id } },
          create: { benchmarkId: source.id, connectedBenchmarkId: target.id, relationshipType: 'SUPPORTS' },
          update: {},
        })
      }
    }
  }

  // ── Seed default accommodations ───────────────────────────────────────
  const accommodations = [
    { code: 'ACC-EXT-TIME', name: 'Extended Time', description: 'Adds configurable time multiplier (1.5x, 2x) to timed activities.' },
    { code: 'ACC-READ-ALOUD', name: 'Read-Aloud', description: 'Auto-enables read-aloud control on all stimulus passages.' },
    { code: 'ACC-CHUNK', name: 'Sentence Chunking', description: 'Visual chunking of long passages into shorter units.' },
    { code: 'ACC-SIMPLE-LANG', name: 'Simplified Language', description: 'Defaults stimulus to reading-load level 1 where available.' },
    { code: 'ACC-T2-VOCAB', name: 'Tier-2 Vocabulary Popovers Always On', description: 'Tier-2 academic words always show glossary popover.' },
    { code: 'ACC-REDUCED-CHOICES', name: 'Reduced Answer Choices', description: '3 instead of 4 answer choices on practice (not Mastery). Phase 9+.' },
    { code: 'ACC-BREAKS', name: 'Frequent Breaks', description: 'Auto-suggests a pause every 10 minutes across all sessions.' },
    { code: 'ACC-SCREEN-READER', name: 'Screen Reader Optimized', description: 'Ensures all controls have ARIA labels and a logical tab order.' },
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
