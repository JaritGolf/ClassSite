/**
 * Seed: Unit 2 Question Bank — Creating and Limiting Government (SS.7.CG.1.7–1.11)
 *
 * Phase 15, AI-drafted (Trust Tier C). Seeded as sourceTier=C / approvalStatus=
 * NEEDS_REVIEW — the owner reviews and bulk-approves before these count toward the
 * §36.16 "30 approved questions per benchmark" gate.
 *
 * Per-benchmark targets (each = 30 questions):
 *   §13.2 category mix : vocabulary 4 · basic 4 · scenario 8 · source 4 · chart 3 ·
 *                        misconception 3 · eoc-mixed 4
 *   Reading-load (§13.2): level-1 ×9 · level-2 ×15 · level-3 ×6
 *   Complexity (§7.4)   : LOW ×6 · MODERATE ×17 · HIGH ×7
 *
 * Source/chart items embed their excerpt or data inline in the prompt (no separate
 * Stimulus row required — reading-load is tracked on the question itself).
 *
 * COMPLETE_BENCHMARKS lists benchmarks fully authored to 30; the audit-15 drivers
 * iterate over it so the suite stays green as the unit fills in.
 */

import type { PrismaClient } from '@prisma/client'
import { seedQuestionDefs, type QuestionSeedDef } from './_seeder'

// ── SS.7.CG.1.8 — The Preamble: Purposes of Government (ADR 0017: was coded 1.7) ──
// Skill tags: preamble-purposes · purposes-of-government
// Remediation tags: remed-CG17-preamble · remed-CG17-purposes

const SS7CG17: QuestionSeedDef[] = [
  // 1 — vocab · L1 · LOW
  {
    externalKey: 'q-SS7CG17-001', benchmarkCode: 'SS.7.CG.1.8', category: 'vocabulary',
    prompt: 'In the Preamble, what does the word "Preamble" mean?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'An introduction that states the goals of the document', isCorrect: true, feedback: 'Correct! The Preamble is the introduction to the Constitution and explains its purposes.' },
      { text: 'A list of all the laws Congress can pass', isCorrect: false, feedback: 'The Preamble states goals, not specific laws. Laws come later in the Constitution.' },
      { text: 'The section that lists the rights of citizens', isCorrect: false, feedback: 'Rights are listed in the Bill of Rights, not the Preamble.' },
      { text: 'A signature page for the states', isCorrect: false, feedback: 'The Preamble is an opening statement of purpose, not a signature page.' },
    ],
  },
  // 2 — vocab · L1 · LOW
  {
    externalKey: 'q-SS7CG17-002', benchmarkCode: 'SS.7.CG.1.8', category: 'vocabulary',
    prompt: 'What does "domestic tranquility" mean in the Preamble?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'Peace and order within the country', isCorrect: true, feedback: 'Correct! "Insure domestic tranquility" means keeping peace at home.' },
      { text: 'Trade with other countries', isCorrect: false, feedback: 'Trade is part of the economy; "domestic tranquility" means peace at home.' },
      { text: 'Protecting the nation from foreign attack', isCorrect: false, feedback: 'That is "provide for the common defense," a different purpose.' },
      { text: 'Building roads and bridges', isCorrect: false, feedback: 'Infrastructure relates to general welfare, not domestic tranquility.' },
    ],
  },
  // 3 — vocab · L2 · MOD
  {
    externalKey: 'q-SS7CG17-003', benchmarkCode: 'SS.7.CG.1.8', category: 'vocabulary',
    prompt: 'The Preamble says government should "promote the general welfare." In this phrase, "general welfare" most nearly means the —',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'well-being of the people as a whole', isCorrect: true, feedback: 'Correct! "General welfare" means the overall well-being of the public.' },
      { text: 'government payments to individuals only', isCorrect: false, feedback: 'In the Preamble, "welfare" means general well-being, not a specific benefit program.' },
      { text: 'military strength of the nation', isCorrect: false, feedback: 'Military strength relates to common defense, a separate purpose.' },
      { text: 'wealth of business owners', isCorrect: false, feedback: '"General welfare" covers everyone\'s well-being, not one group\'s wealth.' },
    ],
  },
  // 4 — vocab · L1 · MOD
  {
    externalKey: 'q-SS7CG17-004', benchmarkCode: 'SS.7.CG.1.8', category: 'vocabulary',
    prompt: 'To "establish justice" means to set up a system that —',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'treats people fairly under the law', isCorrect: true, feedback: 'Correct! Establishing justice means fair laws and fair courts.' },
      { text: 'makes the president the final judge', isCorrect: false, feedback: 'Justice is handled by courts, not by one person ruling alone.' },
      { text: 'removes all courts', isCorrect: false, feedback: 'Establishing justice requires courts, not removing them.' },
      { text: 'lets each person make their own laws', isCorrect: false, feedback: 'Justice requires shared, fair laws, not individual rule.' },
    ],
  },
  // 5 — basic · L1 · LOW
  {
    externalKey: 'q-SS7CG17-005', benchmarkCode: 'SS.7.CG.1.8', category: 'basic_concept',
    prompt: 'Which phrase from the Preamble shows that the power of government comes from the people?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: '"We the People"', isCorrect: true, feedback: 'Correct! "We the People" shows popular sovereignty — power comes from the people.' },
      { text: '"common defense"', isCorrect: false, feedback: 'That phrase describes protection, not the source of power.' },
      { text: '"more perfect Union"', isCorrect: false, feedback: 'That phrase describes uniting the states, not the source of power.' },
      { text: '"blessings of Liberty"', isCorrect: false, feedback: 'That phrase describes a goal (freedom), not the source of power.' },
    ],
  },
  // 6 — basic · L1 · LOW
  {
    externalKey: 'q-SS7CG17-006', benchmarkCode: 'SS.7.CG.1.8', category: 'basic_concept',
    prompt: 'How many main purposes of government does the Preamble list?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'Six', isCorrect: true, feedback: 'Correct! The Preamble lists six purposes of government.' },
      { text: 'Three', isCorrect: false, feedback: 'There are three branches of government, but the Preamble lists six purposes.' },
      { text: 'Ten', isCorrect: false, feedback: 'There are ten amendments in the Bill of Rights, but six purposes in the Preamble.' },
      { text: 'One', isCorrect: false, feedback: 'The Preamble lists six purposes, not one.' },
    ],
  },
  // 7 — basic · L2 · MOD
  {
    externalKey: 'q-SS7CG17-007', benchmarkCode: 'SS.7.CG.1.8', category: 'basic_concept',
    prompt: 'A city builds a new fire department and hires firefighters. Which purpose of government does this BEST serve?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'Promote the general welfare', isCorrect: true, feedback: 'Correct! Public services like fire protection promote the general welfare.' },
      { text: 'Provide for the common defense', isCorrect: false, feedback: 'Common defense refers to protecting the nation from foreign threats, not local fire safety.' },
      { text: 'Establish justice', isCorrect: false, feedback: 'Establishing justice is about fair courts and laws, not fire services.' },
      { text: 'Secure the blessings of liberty', isCorrect: false, feedback: 'That purpose is about protecting freedom, which fits less well than general welfare here.' },
    ],
  },
  // 8 — basic · L2 · MOD
  {
    externalKey: 'q-SS7CG17-008', benchmarkCode: 'SS.7.CG.1.8', category: 'basic_concept',
    prompt: 'Why did the Founders begin the Constitution with a statement of purposes?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'To explain why the government was being created and what it should achieve', isCorrect: true, feedback: 'Correct! The Preamble states the goals the new government was meant to achieve.' },
      { text: 'To list every law the country would ever need', isCorrect: false, feedback: 'The Preamble states goals, not a complete list of laws.' },
      { text: 'To name the first president', isCorrect: false, feedback: 'The Preamble does not name any officials.' },
      { text: 'To declare war on Great Britain', isCorrect: false, feedback: 'That was the Declaration of Independence, not the Preamble.' },
    ],
  },
  // 9 — scenario · L2 · MOD
  {
    externalKey: 'q-SS7CG17-009', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'A town passes a law requiring restaurants to pass health inspections before opening. Which purpose of government does this best illustrate?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Promote the general welfare', isCorrect: true, feedback: 'Correct! Protecting public health promotes the general welfare.' },
      { text: 'Provide for the common defense', isCorrect: false, feedback: 'Common defense protects against foreign threats, not food safety.' },
      { text: 'Secure the blessings of liberty', isCorrect: false, feedback: 'This is about public health, which fits general welfare more than liberty.' },
      { text: 'Form a more perfect union', isCorrect: false, feedback: 'That purpose is about uniting the states, not health inspections.' },
    ],
  },
  // 10 — scenario · L2 · MOD
  {
    externalKey: 'q-SS7CG17-010', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'After a natural disaster, the National Guard restores order and stops looting in a city. Which purpose of government is being carried out?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Insure domestic tranquility', isCorrect: true, feedback: 'Correct! Keeping peace and order at home is insuring domestic tranquility.' },
      { text: 'Provide for the common defense', isCorrect: false, feedback: 'Common defense is about foreign threats; this is keeping peace at home.' },
      { text: 'Establish justice', isCorrect: false, feedback: 'Justice is about fair courts; restoring order is domestic tranquility.' },
      { text: 'Secure the blessings of liberty', isCorrect: false, feedback: 'This is about order at home, which best fits domestic tranquility.' },
    ],
  },
  // 11 — scenario · L2 · MOD
  {
    externalKey: 'q-SS7CG17-011', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'Congress votes to fund the U.S. military to protect the country from foreign attack. Which purpose of government does this serve?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Provide for the common defense', isCorrect: true, feedback: 'Correct! Funding the military to protect the nation is providing for the common defense.' },
      { text: 'Insure domestic tranquility', isCorrect: false, feedback: 'Domestic tranquility is peace at home; this is defense against foreign threats.' },
      { text: 'Promote the general welfare', isCorrect: false, feedback: 'General welfare is broad public well-being; this is specifically defense.' },
      { text: 'Establish justice', isCorrect: false, feedback: 'Justice is about courts and fairness, not military defense.' },
    ],
  },
  // 12 — scenario · L3 · HIGH
  {
    externalKey: 'q-SS7CG17-012', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'A state government creates a public defender program so that people who cannot afford a lawyer still receive legal representation in criminal trials. Which TWO Preamble purposes are most directly advanced, and why?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Establish justice and secure the blessings of liberty, because fair trials protect both fairness and individual freedom', isCorrect: true, feedback: 'Correct! Fair representation establishes justice and protects liberty by guarding against wrongful punishment.' },
      { text: 'Provide for the common defense and insure domestic tranquility, because lawyers stop foreign threats', isCorrect: false, feedback: 'Legal representation is not about defense or foreign threats.' },
      { text: 'Form a more perfect union and provide for the common defense', isCorrect: false, feedback: 'Public defenders relate to justice and liberty, not union or defense.' },
      { text: 'Promote the general welfare only, because all government programs are welfare', isCorrect: false, feedback: 'Not all programs are "general welfare"; this one most directly serves justice and liberty.' },
    ],
  },
  // 13 — scenario · L3 · HIGH
  {
    externalKey: 'q-SS7CG17-013', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'Two neighboring states disagree about the use of a shared river. The national government steps in to settle the dispute peacefully so the states do not come into conflict. Which Preamble purpose is BEST illustrated, and how does it connect to the weakness of the Articles of Confederation?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Form a more perfect union — the Constitution gave the national government power to settle interstate disputes the Articles could not', isCorrect: true, feedback: 'Correct! Settling state disputes builds a "more perfect union," fixing a weakness of the Articles.' },
      { text: 'Provide for the common defense — rivers are a military matter', isCorrect: false, feedback: 'A river dispute between states is not foreign defense.' },
      { text: 'Establish justice — only courts can ever resolve disputes', isCorrect: false, feedback: 'While justice is related, the key idea is uniting states under a stronger national government.' },
      { text: 'Secure the blessings of liberty — states have no rights', isCorrect: false, feedback: 'States do have powers; the best fit is forming a more perfect union.' },
    ],
  },
  // 14 — scenario · L3 · HIGH
  {
    externalKey: 'q-SS7CG17-014', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'A student argues: "Because the Preamble says government should promote the general welfare, the government can do absolutely anything it wants to help people." Why is this reasoning flawed?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'The Preamble states goals but does not grant unlimited power; government power is still limited by the rest of the Constitution', isCorrect: true, feedback: 'Correct! The Preamble lists purposes; it does not override the Constitution\'s limits on government.', misconceptionCode: 'M-OPLG-06' },
      { text: 'The Preamble is not part of the Constitution at all', isCorrect: false, feedback: 'The Preamble is part of the Constitution; it simply does not grant unlimited power.' },
      { text: 'The general welfare clause was later deleted', isCorrect: false, feedback: 'The general welfare purpose remains in the Preamble.' },
      { text: 'Government can never help people', isCorrect: false, feedback: 'Government can promote welfare — but within constitutional limits.' },
    ],
  },
  // 15 — scenario · L2 · MOD
  {
    externalKey: 'q-SS7CG17-015', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'A community center offers free after-school tutoring funded by the city. A citizen asks which purpose of government this serves. The best answer is —',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'promote the general welfare', isCorrect: true, feedback: 'Correct! Public education services promote the general welfare.' },
      { text: 'provide for the common defense', isCorrect: false, feedback: 'Defense is about foreign threats, not tutoring.' },
      { text: 'insure domestic tranquility', isCorrect: false, feedback: 'Domestic tranquility is about peace and order, not education programs.' },
      { text: 'establish justice', isCorrect: false, feedback: 'Justice is about courts and fairness, not tutoring.' },
    ],
  },
  // 16 — scenario · L3 · HIGH
  {
    externalKey: 'q-SS7CG17-016', benchmarkCode: 'SS.7.CG.1.8', category: 'scenario',
    prompt: 'A new nation is writing its first constitution. Its leaders want citizens to understand the document\'s goals before reading its detailed rules. Based on how the U.S. Constitution is organized, what should they include first, and why?',
    itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'A preamble stating the purposes of the government, so readers understand the goals the rules are meant to achieve', isCorrect: true, feedback: 'Correct! A preamble frames the goals before the detailed articles, just as the U.S. Constitution does.' },
      { text: 'A list of criminal punishments, so people fear the law', isCorrect: false, feedback: 'A constitution opens with purpose, not a list of punishments.' },
      { text: 'The names of all current leaders, so people know who is in charge', isCorrect: false, feedback: 'Constitutions state structures and purposes, not just current officials.' },
      { text: 'A declaration of war, so the nation looks strong', isCorrect: false, feedback: 'A preamble states peaceful purposes, not a war declaration.' },
    ],
  },
  // 17 — source · L2 · MOD
  {
    externalKey: 'q-SS7CG17-017', benchmarkCode: 'SS.7.CG.1.8', category: 'source_analysis',
    prompt: 'Read this excerpt from the Preamble: "We the People of the United States, in Order to form a more perfect Union, establish Justice..." The phrase "We the People" shows that the government\'s authority comes from —',
    itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'the citizens (popular sovereignty)', isCorrect: true, feedback: 'Correct! "We the People" expresses popular sovereignty — authority from the people.' },
      { text: 'a king or monarch', isCorrect: false, feedback: 'The phrase shows power comes from the people, not a king.' },
      { text: 'the military', isCorrect: false, feedback: 'Authority comes from the people, not the military.' },
      { text: 'foreign governments', isCorrect: false, feedback: 'The people of the United States are the source, not foreign powers.' },
    ],
  },
  // 18 — source · L3 · HIGH
  {
    externalKey: 'q-SS7CG17-018', benchmarkCode: 'SS.7.CG.1.8', category: 'source_analysis',
    prompt: 'Excerpt: "...provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity..." The word "Posterity" tells the reader that the Founders intended the Constitution\'s benefits to —',
    itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'extend to future generations, not just the people alive in 1787', isCorrect: true, feedback: 'Correct! "Posterity" means future generations — the document was meant to last.' },
      { text: 'apply only to the Founders themselves', isCorrect: false, feedback: '"Posterity" specifically means descendants/future generations.' },
      { text: 'end after the first election', isCorrect: false, feedback: 'The reference to posterity signals a lasting document.' },
      { text: 'apply only to soldiers', isCorrect: false, feedback: '"Posterity" means future generations of all people, not only soldiers.' },
    ],
  },
  // 19 — source · L2 · MOD
  {
    externalKey: 'q-SS7CG17-019', benchmarkCode: 'SS.7.CG.1.8', category: 'source_analysis',
    prompt: 'Excerpt: "...in Order to form a more perfect Union..." Compared with the Articles of Confederation, the phrase "more perfect Union" suggests the Founders wanted a national government that was —',
    itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'stronger and more unified than under the Articles', isCorrect: true, feedback: 'Correct! "More perfect" implies improving on the weak union under the Articles.' },
      { text: 'weaker than the Articles', isCorrect: false, feedback: '"More perfect" means improved and stronger, not weaker.', misconceptionCode: 'M-OPLG-01' },
      { text: 'controlled by Great Britain', isCorrect: false, feedback: 'The Union was independent, not British-controlled.' },
      { text: 'limited to a single state', isCorrect: false, feedback: '"Union" refers to all the states joined together.' },
    ],
  },
  // 20 — source · L3 · HIGH
  {
    externalKey: 'q-SS7CG17-020', benchmarkCode: 'SS.7.CG.1.8', category: 'source_analysis',
    prompt: 'A historian writes: "The Preamble is not a source of government power; it is a statement of intent." Using the text of the Preamble, which idea BEST supports the historian\'s claim?',
    itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'The Preamble lists goals ("establish Justice," "promote the general Welfare") but assigns no specific powers to any branch', isCorrect: true, feedback: 'Correct! The Preamble states purposes; the articles that follow grant the actual powers.' },
      { text: 'The Preamble names the first members of Congress', isCorrect: false, feedback: 'The Preamble names no officials.' },
      { text: 'The Preamble describes how to elect a president', isCorrect: false, feedback: 'Election procedures appear in the articles, not the Preamble.' },
      { text: 'The Preamble lists the powers of the Supreme Court', isCorrect: false, feedback: 'The Preamble grants no powers; it states goals.' },
    ],
  },
  // 21 — chart · L2 · MOD
  {
    externalKey: 'q-SS7CG17-021', benchmarkCode: 'SS.7.CG.1.8', category: 'chart_visual',
    prompt: 'A table pairs Preamble phrases with examples:\n| Preamble Purpose | Example |\n| "establish Justice" | courts and fair trials |\n| "common defence" | armed forces |\n| "general Welfare" | ??? |\nWhich example best completes the table?',
    itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'public schools and health programs', isCorrect: true, feedback: 'Correct! Schools and health programs promote the general welfare.' },
      { text: 'aircraft carriers and missiles', isCorrect: false, feedback: 'Those are common-defense examples, already shown in the table.' },
      { text: 'judges and juries', isCorrect: false, feedback: 'Those fit "establish Justice," already shown.' },
      { text: 'declaring war on other nations', isCorrect: false, feedback: 'That relates to defense/foreign policy, not general welfare.' },
    ],
  },
  // 22 — chart · L2 · MOD
  {
    externalKey: 'q-SS7CG17-022', benchmarkCode: 'SS.7.CG.1.8', category: 'chart_visual',
    prompt: 'A diagram shows an arrow labeled "We the People" pointing toward a box labeled "Government," with the words "power flows from →". What core principle does this diagram represent?',
    itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'Popular sovereignty', isCorrect: true, feedback: 'Correct! Power flowing from the people to government is popular sovereignty.' },
      { text: 'Monarchy', isCorrect: false, feedback: 'In a monarchy power flows from a ruler, not the people.' },
      { text: 'Common defense', isCorrect: false, feedback: 'The diagram is about the source of power, not defense.' },
      { text: 'Foreign policy', isCorrect: false, feedback: 'The diagram shows power coming from the people, not foreign relations.' },
    ],
  },
  // 23 — chart · L1 · LOW
  {
    externalKey: 'q-SS7CG17-023', benchmarkCode: 'SS.7.CG.1.8', category: 'chart_visual',
    prompt: 'A list shows the six purposes of the Preamble. Which one is about keeping peace and order INSIDE the country?',
    itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'Insure domestic tranquility', isCorrect: true, feedback: 'Correct! Domestic tranquility means peace and order at home.' },
      { text: 'Provide for the common defense', isCorrect: false, feedback: 'Common defense is about protection from foreign threats.' },
      { text: 'Form a more perfect union', isCorrect: false, feedback: 'That is about uniting the states.' },
      { text: 'Secure the blessings of liberty', isCorrect: false, feedback: 'That is about protecting freedom.' },
    ],
  },
  // 24 — misconception · L1 · LOW
  {
    externalKey: 'q-SS7CG17-024', benchmarkCode: 'SS.7.CG.1.8', category: 'misconception_check',
    prompt: 'True or False (choose the BEST answer): "The Preamble is the part of the Constitution that lists all the rights of citizens."',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'False — the Preamble states purposes; rights are listed in the Bill of Rights', isCorrect: true, feedback: 'Correct! The Preamble states goals; rights are in the Bill of Rights.' },
      { text: 'True — the Preamble is the Bill of Rights', isCorrect: false, feedback: 'The Preamble is the introduction; the Bill of Rights is the first ten amendments.' },
      { text: 'True — the Preamble lists the rights to free speech and religion', isCorrect: false, feedback: 'Those rights are in the First Amendment, not the Preamble.' },
      { text: 'False — the Constitution has no preamble', isCorrect: false, feedback: 'The Constitution does have a Preamble; it simply does not list rights.' },
    ],
  },
  // 25 — misconception · L1 · MOD
  {
    externalKey: 'q-SS7CG17-025', benchmarkCode: 'SS.7.CG.1.8', category: 'misconception_check',
    prompt: 'A student says, "Because the Preamble says \'We the People,\' every law must be approved by every single citizen." What is the BEST correction?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'The people govern through elected representatives, not by everyone approving every law', isCorrect: true, feedback: 'Correct! "We the People" means a representative republic, not unanimous direct approval.', misconceptionCode: 'M-OPLG-08' },
      { text: 'The phrase means only landowners may vote forever', isCorrect: false, feedback: 'The phrase expresses popular sovereignty, exercised through representatives.' },
      { text: 'It means the president alone approves all laws', isCorrect: false, feedback: 'Laws are made by elected representatives in Congress, not the president alone.' },
      { text: 'It means citizens cannot vote at all', isCorrect: false, feedback: '"We the People" means power comes from the people, who do vote.' },
    ],
  },
  // 26 — misconception · L2 · MOD
  {
    externalKey: 'q-SS7CG17-026', benchmarkCode: 'SS.7.CG.1.8', category: 'misconception_check',
    prompt: 'Which statement about the Preamble is CORRECT?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'preamble-purposes', remediationTag: 'remed-CG17-preamble',
    options: [
      { text: 'It explains the purposes of the government but does not grant specific powers', isCorrect: true, feedback: 'Correct! The Preamble states purposes; powers are granted in the articles.' },
      { text: 'It is a binding law that judges use to punish criminals', isCorrect: false, feedback: 'The Preamble is a statement of purpose, not a criminal statute.' },
      { text: 'It is identical to the Declaration of Independence', isCorrect: false, feedback: 'The Declaration and the Preamble are different documents with different roles.' },
      { text: 'It can only be changed by a king', isCorrect: false, feedback: 'The U.S. has no king; the Constitution is changed by amendment.' },
    ],
  },
  // 27 — eoc · L2 · MOD
  {
    externalKey: 'q-SS7CG17-027', benchmarkCode: 'SS.7.CG.1.8', category: 'eoc_mixed',
    prompt: 'Which of the following BEST describes the main idea of the Preamble?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'It states the goals and purposes the national government was created to achieve', isCorrect: true, feedback: 'Correct! The Preamble introduces the Constitution by stating its purposes.' },
      { text: 'It declares independence from Great Britain', isCorrect: false, feedback: 'That is the Declaration of Independence.' },
      { text: 'It lists the weaknesses of the Articles of Confederation', isCorrect: false, feedback: 'The Preamble states goals; it does not list the Articles\' weaknesses.' },
      { text: 'It describes the steps to become a citizen', isCorrect: false, feedback: 'Citizenship steps are not in the Preamble.' },
    ],
  },
  // 28 — eoc · L2 · MOD
  {
    externalKey: 'q-SS7CG17-028', benchmarkCode: 'SS.7.CG.1.8', category: 'eoc_mixed',
    prompt: 'A government builds highways, funds public hospitals, and supports schools. These actions are examples of government working to —',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'promote the general welfare', isCorrect: true, feedback: 'Correct! Public services for well-being promote the general welfare.' },
      { text: 'provide for the common defense', isCorrect: false, feedback: 'These are domestic services, not military defense.' },
      { text: 'establish justice', isCorrect: false, feedback: 'Justice is about fair courts and laws, not building highways.' },
      { text: 'declare war', isCorrect: false, feedback: 'These are public services, unrelated to declaring war.' },
    ],
  },
  // 29 — eoc · L1 · MOD
  {
    externalKey: 'q-SS7CG17-029', benchmarkCode: 'SS.7.CG.1.8', category: 'eoc_mixed',
    prompt: 'The Preamble begins with "We the People." This phrase is an example of which principle?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Popular sovereignty', isCorrect: true, feedback: 'Correct! Power coming from the people is popular sovereignty.' },
      { text: 'Separation of powers', isCorrect: false, feedback: 'Separation of powers divides government into branches; this phrase is about the source of power.' },
      { text: 'Common defense', isCorrect: false, feedback: 'Common defense is a purpose, not the principle shown by "We the People."' },
      { text: 'Federalism', isCorrect: false, feedback: 'Federalism divides power between national and state levels; this phrase is about popular sovereignty.' },
    ],
  },
  // 30 — eoc · L2 · HIGH
  {
    externalKey: 'q-SS7CG17-030', benchmarkCode: 'SS.7.CG.1.8', category: 'eoc_mixed',
    prompt: 'A citizen claims a new federal program is unconstitutional. A supporter responds, "The Preamble says government should promote the general welfare, so the program must be allowed." Which is the BEST evaluation of the supporter\'s argument?',
    itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 2,
    skillTag: 'purposes-of-government', remediationTag: 'remed-CG17-purposes',
    options: [
      { text: 'Weak — the Preamble states a goal but does not by itself make a program constitutional; the program must still fit the powers granted in the Constitution', isCorrect: true, feedback: 'Correct! The Preamble states purposes; constitutionality depends on the powers in the articles.', misconceptionCode: 'M-OPLG-06' },
      { text: 'Strong — the Preamble grants Congress unlimited power to help people', isCorrect: false, feedback: 'The Preamble grants no powers and does not give unlimited authority.' },
      { text: 'Strong — anything labeled "welfare" is automatically legal', isCorrect: false, feedback: 'A label does not settle constitutionality.' },
      { text: 'Weak — the Preamble has nothing to do with the purposes of government', isCorrect: false, feedback: 'The Preamble does state purposes; the flaw is treating a goal as a grant of power.' },
    ],
  },
]

// ── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Per-benchmark question arrays, keyed by benchmark code.
 * ADR 0017: this bank (Preamble content, externalKeys q-SS7CG17-*) moved from
 * code 1.7 to the official Preamble code 1.8; externalKeys stay frozen.
 */
export const UNIT2_QUESTIONS_BY_BENCHMARK: Record<string, QuestionSeedDef[]> = {
  'SS.7.CG.1.8': SS7CG17,
}

/** Benchmarks authored to the full 30 — audit-15 drivers iterate over this set. */
export const UNIT2_COMPLETE_BENCHMARKS: string[] = ['SS.7.CG.1.8']

const ALL_UNIT2_QUESTIONS: QuestionSeedDef[] = Object.values(UNIT2_QUESTIONS_BY_BENCHMARK).flat()

export async function seedUnit2Questions(prisma: PrismaClient): Promise<void> {
  const count = await seedQuestionDefs(prisma, ALL_UNIT2_QUESTIONS, {
    sourceTier: 'C',
    approvalStatus: 'NEEDS_REVIEW',
  })
  console.log(`  ✓ Unit 2 questions seeded (${count} questions, Tier C / NEEDS_REVIEW)`)
}
