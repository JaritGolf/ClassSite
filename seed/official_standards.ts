/**
 * Official Florida SS.7.CG standard statements — verbatim snapshot.
 *
 * Source: CASE Network via the Learning Commons Knowledge Graph
 * (find_standard_statement, jurisdiction "Florida", subject "Social Studies"),
 * retrieved 2026-07-16. HTML entities decoded; wording otherwise untouched.
 *
 * DO NOT EDIT THE STATEMENTS. They are the authoritative benchmark wording the
 * EOC is built against. `tests/unit/seed/benchmark-standards-alignment.test.ts`
 * pins every seeded benchmark def to this snapshot (exact statement identity +
 * topical anchors), so seeded content cannot silently drift from the official
 * standards again (the pre-2026-07 drift shipped strand-1 content under codes
 * whose official meaning differed — see ADR 0017).
 *
 * `anchors` are curated topical keywords (checked case-insensitively against a
 * def's title + lessonSummary + clarifications) — update them only when a def
 * legitimately reorganizes its prose, never to paper over a topic mismatch.
 */

export interface OfficialStandard {
  /** Verbatim official benchmark statement. Do not edit. */
  statement: string
  /** Topical keywords that must appear in the seeded def's combined text. */
  anchors: string[]
}

export const OFFICIAL_SS7CG_STANDARDS: Record<string, OfficialStandard> = {
  // ── Strand 1 — Origins and Purposes of Government ─────────────────────────
  'SS.7.CG.1.1': {
    statement:
      "Analyze the influences of ancient Greece, ancient Rome and the Judeo-Christian tradition on America's constitutional republic.",
    anchors: ['Greece', 'Rome', 'Judeo-Christian'],
  },
  'SS.7.CG.1.2': {
    statement: "Trace the principles underlying America's founding ideas on law and government.",
    anchors: ['principles', 'founding'],
  },
  'SS.7.CG.1.3': {
    statement:
      "Trace the impact that the Magna Carta, Mayflower Compact, English Bill of Rights and Thomas Paine's Common Sense had on colonists' views of government.",
    anchors: ['Magna Carta', 'Mayflower Compact', 'English Bill of Rights', 'Common Sense'],
  },
  'SS.7.CG.1.4': {
    statement:
      "Analyze how Enlightenment ideas, including Montesquieu's view of separation of powers and John Locke's theories related to natural law and Locke's social contract, influenced the Founding.",
    anchors: ['Enlightenment', 'Montesquieu', 'Locke', 'social contract'],
  },
  'SS.7.CG.1.5': {
    statement:
      'Describe how British policies and responses to colonial concerns led to the writing of the Declaration of Independence.',
    anchors: ['British', 'Declaration of Independence'],
  },
  'SS.7.CG.1.6': {
    statement: 'Analyze the ideas and grievances set forth in the Declaration of Independence.',
    anchors: ['grievances', 'Declaration of Independence'],
  },
  'SS.7.CG.1.7': {
    statement:
      'Explain how the weaknesses of the Articles of Confederation led to the writing of the U.S. Constitution.',
    anchors: ['Articles of Confederation', 'Constitution'],
  },
  'SS.7.CG.1.8': {
    statement: 'Explain the purpose of the Preamble to the U.S. Constitution.',
    anchors: ['Preamble'],
  },
  'SS.7.CG.1.9': {
    statement:
      'Describe how the U.S. Constitution limits the powers of government through separation of powers, checks and balances, individual rights, rule of law and due process of law.',
    anchors: ['separation of powers', 'checks and balances', 'due process'],
  },
  'SS.7.CG.1.10': {
    statement:
      'Compare the viewpoints of the Federalists and the Anti-Federalists regarding ratification of the U.S. Constitution and including a bill of rights.',
    anchors: ['Federalist', 'Anti-Federalist', 'ratification'],
  },
  'SS.7.CG.1.11': {
    statement:
      'Define the rule of law and recognize its influence on the development of legal, political and governmental systems in the United States.',
    anchors: ['rule of law'],
  },

  // ── Strand 2 — Roles, Rights, and Responsibilities of Citizens ────────────
  'SS.7.CG.2.1': {
    statement:
      'Define the term "citizen," and explain the constitutional means of becoming a U.S. citizen.',
    anchors: ['citizen', 'naturalization'],
  },
  'SS.7.CG.2.2': {
    statement:
      'Differentiate between obligations and responsibilities of U.S. citizenship, and evaluate their impact on society.',
    anchors: ['obligations', 'responsibilities'],
  },
  'SS.7.CG.2.3': {
    statement:
      'Identify and apply the rights contained in the Bill of Rights and other amendments to the U.S. Constitution.',
    anchors: ['Bill of Rights', 'amendments'],
  },
  'SS.7.CG.2.4': {
    statement:
      'Explain how the U.S. Constitution and the Bill of Rights safeguard individual rights.',
    anchors: ['safeguard', 'Bill of Rights'],
  },
  'SS.7.CG.2.5': {
    statement:
      'Describe the trial process and the role of juries in the administration of justice at the state and federal levels.',
    anchors: ['trial', 'juries'],
  },
  'SS.7.CG.2.6': {
    statement:
      'Examine the election and voting process at the local, state and national levels.',
    anchors: ['election', 'voting'],
  },
  'SS.7.CG.2.7': {
    statement:
      'Identify the constitutional qualifications required to hold state and national office.',
    anchors: ['qualifications', 'office'],
  },
  'SS.7.CG.2.8': {
    statement:
      'Examine the impact of media, individuals, and interest groups on monitoring and influencing government.',
    anchors: ['media', 'interest groups'],
  },
  'SS.7.CG.2.9': {
    statement:
      'Analyze media and political communications and identify examples of bias, symbolism and propaganda.',
    anchors: ['bias', 'symbolism', 'propaganda'],
  },
  'SS.7.CG.2.10': {
    statement:
      'Explain the process for citizens to address a state or local problem by researching public policy alternatives, identifying appropriate government agencies to address the issue and determining a course of action.',
    anchors: ['public policy', 'agencies'],
  },

  // ── Strand 3 — Organization and Function of Government ────────────────────
  'SS.7.CG.3.1': {
    statement:
      "Analyze the advantages of the United States' constitutional republic over other forms of government in safeguarding liberty, freedom and a representative government.",
    anchors: ['constitutional republic', 'advantages'],
  },
  'SS.7.CG.3.2': {
    statement:
      'Explain the advantages of a federal system of government over other systems in balancing local sovereignty with national unity and protecting against authoritarianism.',
    anchors: ['federal system', 'authoritarianism'],
  },
  'SS.7.CG.3.3': {
    statement:
      'Describe the structure and function of the three branches of government established in the U.S. Constitution.',
    anchors: ['three branches'],
  },
  'SS.7.CG.3.4': {
    statement:
      'Explain the relationship between state and national governments as written in Article IV of the U.S. Constitution and the 10th Amendment.',
    anchors: ['Article IV', '10th Amendment'],
  },
  'SS.7.CG.3.5': {
    statement: 'Explain the amendment process outlined in Article V of the U.S. Constitution.',
    anchors: ['Article V', 'amendment'],
  },
  'SS.7.CG.3.6': {
    statement:
      'Analyze how the 13th, 14th, 15th, 19th, 24th and 26th Amendments broadened participation in the political process.',
    anchors: ['13th', '14th', '15th', '19th', '24th', '26th'],
  },
  'SS.7.CG.3.7': {
    statement:
      'Explain the structure, functions and processes of the legislative branch of government.',
    anchors: ['legislative'],
  },
  'SS.7.CG.3.8': {
    statement:
      'Explain the structure, functions and processes of the executive branch of government.',
    anchors: ['executive'],
  },
  'SS.7.CG.3.9': {
    statement:
      'Explain the structure, functions and processes of the judicial branch of government.',
    anchors: ['judicial'],
  },
  'SS.7.CG.3.10': {
    statement: 'Identify sources and types of law.',
    anchors: ['sources', 'types of law'],
  },
  'SS.7.CG.3.11': {
    statement:
      'Analyze the effects of landmark Supreme Court decisions on law, liberty and the interpretation of the U.S. Constitution.',
    anchors: ['landmark', 'Supreme Court'],
  },
  'SS.7.CG.3.12': {
    statement: 'Compare the U.S. and Florida constitutions.',
    anchors: ['Florida'],
  },
  'SS.7.CG.3.13': {
    statement:
      'Explain government obligations to its citizens and the services provided at the local, state and national levels.',
    anchors: ['services'],
  },
  'SS.7.CG.3.14': {
    statement:
      'Explain the purpose and function of the Electoral College in electing the President of the United States.',
    anchors: ['Electoral College'],
  },
  'SS.7.CG.3.15': {
    statement:
      'Analyze the advantages of capitalism and the free market in the United States over government-controlled economic systems (e.g., socialism and communism) in regard to economic freedom and raising the standard of living for citizens.',
    anchors: ['capitalism', 'free market'],
  },
}

export const OFFICIAL_SS7CG_CODES: string[] = Object.keys(OFFICIAL_SS7CG_STANDARDS)
