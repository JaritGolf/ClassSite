/**
 * Seed: Sample Questions — Unit 1 (SS.7.CG.1.x benchmarks)
 *
 * 15 questions per benchmark × 6 benchmarks = 90 questions.
 * Every question is fully tagged per spec Rule 3 and Section 13.
 *
 * Required tags: benchmark_id, reporting_category_id, cognitive_complexity,
 *   stimulus_type (via linked Stimulus or absent = NONE), reading_load_level,
 *   skill_tag, remediation_tag, misconception_id, source_tier, approval_status.
 *
 * Distribution per 15-question benchmark set:
 *   Complexity : 3 LOW · 9 MODERATE · 3 HIGH
 *   Reading    : 5 Level-1 · 7 Level-2 · 3 Level-3
 *
 * All seed questions: sourceTier = B, approvalStatus = APPROVED.
 * Scenario questions use itemType SCENARIO_MC; others MULTIPLE_CHOICE.
 * Idempotent: upsert by externalKey.
 *
 * STANDARDS REALIGNMENT (ADR 0017, 2026-07-16): benchmarkCodes were remapped to
 * the official SS.7.CG meanings (old 1.1→1.4, 1.2→1.3, 1.3→1.5, 1.4→1.6,
 * 1.5→1.7; the old 1.6 Constitutional Convention set split item-level between
 * 1.7 and 1.10). externalKeys are FROZEN — `q-SS7CG16-*` keys now live on
 * 1.7/1.10; renaming keys would orphan DB rows and attempt history, so the
 * cosmetic mismatch is intentional.
 */

import { PrismaClient } from '@prisma/client'
import { REPORTING_CATEGORY_NAMES } from './reporting_categories'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionDef {
  text: string
  isCorrect: boolean
  feedback: string
  misconceptionCode?: string
}

interface QuestionDef {
  externalKey: string   // format: q-SS7CG1{N}-{NNN}
  benchmarkCode: string
  prompt: string
  itemType: 'MULTIPLE_CHOICE' | 'SCENARIO_MC'
  cognitiveComplexity: 'LOW' | 'MODERATE' | 'HIGH'
  readingLoadLevel: 1 | 2 | 3
  skillTag: string
  remediationTag: string
  misconceptionCode?: string
  options: OptionDef[]  // exactly 4; exactly 1 isCorrect
}

// ── SS.7.CG.1.4 — Enlightenment Ideas and the Founding (ADR 0017: was coded 1.1) ──
// Skill tag: enlightenment-influence  |  Remediation: remed-CG11-enlightenment

const SS7CG11: QuestionDef[] = [
  // ── LOW / Level 1 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG11-001',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'According to philosopher John Locke, which three natural rights are all people born with?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-05',
    options: [
      {
        text: 'Life, liberty, and property',
        isCorrect: true,
        feedback:
          'Correct! Locke argued that life, liberty, and property are natural rights that all people possess and that no government can legitimately take away.',
      },
      {
        text: 'Life, liberty, and the pursuit of happiness',
        isCorrect: false,
        feedback:
          'This phrase is from the Declaration of Independence. Jefferson adapted Locke\'s idea but changed "property" to "the pursuit of happiness."',
        misconceptionCode: 'M-OPLG-05',
      },
      {
        text: 'Life, freedom of speech, and property',
        isCorrect: false,
        feedback:
          'Freedom of speech is a civil right protected by law, not one of Locke\'s three original natural rights.',
        misconceptionCode: 'M-OPLG-05',
      },
      {
        text: 'Safety, liberty, and property',
        isCorrect: false,
        feedback:
          'Safety is not one of Locke\'s three natural rights. Locke specifically identified life, liberty, and property.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-002',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'Which document, signed in 1215, first limited the power of the English king and established that even rulers must follow the law?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-03',
    options: [
      {
        text: 'The Magna Carta',
        isCorrect: true,
        feedback:
          'Correct! The Magna Carta (1215) was the first English document to limit the king\'s power and establish that rulers must follow the law — an idea that influenced American democracy.',
      },
      {
        text: 'The English Bill of Rights',
        isCorrect: false,
        feedback:
          'The English Bill of Rights was written much later, in 1689. Both are important influences, but the Magna Carta came first in 1215.',
        misconceptionCode: 'M-OPLG-03',
      },
      {
        text: 'The Mayflower Compact',
        isCorrect: false,
        feedback:
          'The Mayflower Compact was signed in 1620 by Pilgrims in the New World — not in England and not in 1215.',
      },
      {
        text: 'The Declaration of Independence',
        isCorrect: false,
        feedback:
          'The Declaration of Independence was written in 1776 by American colonists, more than 500 years after the Magna Carta.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-003',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'Which Enlightenment philosopher argued that government power should be divided into separate branches to prevent any one group from having too much authority?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-11',
    options: [
      {
        text: 'Montesquieu',
        isCorrect: true,
        feedback:
          'Correct! Montesquieu\'s concept of separation of powers directly influenced the three-branch structure of the U.S. government.',
      },
      {
        text: 'John Locke',
        isCorrect: false,
        feedback:
          'Locke focused on natural rights and social contract theory. It was Montesquieu who specifically argued for dividing government into separate branches.',
        misconceptionCode: 'M-OPLG-11',
      },
      {
        text: 'Jean-Jacques Rousseau',
        isCorrect: false,
        feedback:
          'Rousseau emphasized popular sovereignty and the general will — not the division of government into separate branches.',
      },
      {
        text: 'Thomas Jefferson',
        isCorrect: false,
        feedback:
          'Jefferson was an American founder inspired by these Enlightenment thinkers, not an Enlightenment philosopher himself.',
        misconceptionCode: 'M-OPLG-04',
      },
    ],
  },
  // ── MODERATE / Level 1 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG11-004',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'Which statement best describes the social contract theory proposed by Enlightenment thinkers?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-07',
    options: [
      {
        text: 'People agree to give government certain powers in exchange for protection of their rights.',
        isCorrect: true,
        feedback:
          'Correct! The social contract is a philosophical agreement: people give up some freedoms and in return government protects their natural rights.',
      },
      {
        text: 'People sign a written agreement with the king promising to obey all laws.',
        isCorrect: false,
        feedback:
          'The social contract is not a literal written document signed by citizens — it is a philosophical concept about the relationship between people and their government.',
        misconceptionCode: 'M-OPLG-07',
      },
      {
        text: 'People give up all their natural rights to the government in exchange for security.',
        isCorrect: false,
        feedback:
          'Social contract theory does not require giving up all rights — only enough freedom to allow government to protect the remaining rights.',
        misconceptionCode: 'M-OPLG-07',
      },
      {
        text: 'The government creates rules that people must follow without any choice.',
        isCorrect: false,
        feedback:
          'This describes absolute rule, not social contract theory. Social contract theory requires the consent of the people.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-005',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'A colonial town holds a vote to decide whether to build a new road. Every adult member of the town participates in the decision. Which Enlightenment concept does this best illustrate?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    options: [
      {
        text: 'Popular sovereignty',
        isCorrect: true,
        feedback:
          'Correct! Popular sovereignty is the idea that political authority belongs to the people. The town vote shows the people exercising this authority directly.',
      },
      {
        text: 'Rule of law',
        isCorrect: false,
        feedback:
          'Rule of law means everyone must follow the law. It doesn\'t specifically describe people making collective decisions through voting.',
      },
      {
        text: 'Social contract',
        isCorrect: false,
        feedback:
          'The social contract explains how government gets its authority from the people — but the vote here most directly illustrates popular sovereignty.',
      },
      {
        text: 'Natural rights',
        isCorrect: false,
        feedback:
          'Natural rights are rights people are born with. They don\'t specifically describe the process of community voting on local issues.',
      },
    ],
  },
  // ── MODERATE / Level 2 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG11-006',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'How did the Magna Carta influence the development of American government?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-03',
    options: [
      {
        text: 'It established the idea that rulers must follow the law and that citizens have certain rights that cannot be arbitrarily taken away.',
        isCorrect: true,
        feedback:
          'Correct! The Magna Carta\'s core principle — that even the king is subject to the law — became a foundation for American ideas about limited government and rule of law.',
      },
      {
        text: 'It created the first system of representative democracy in the world.',
        isCorrect: false,
        feedback:
          'The Magna Carta limited the king\'s power but primarily protected the rights of English barons — it did not establish a representative democracy.',
      },
      {
        text: 'It gave Parliament the power to remove a king from office.',
        isCorrect: false,
        feedback:
          'Parliament gained this power through the English Bill of Rights (1689), not the Magna Carta (1215).',
        misconceptionCode: 'M-OPLG-03',
      },
      {
        text: 'It directly listed the rights that colonists later claimed in the Declaration of Independence.',
        isCorrect: false,
        feedback:
          'The Magna Carta influenced American thinking about limited government but did not directly list the same rights as the Declaration.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-007',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'Which of the following best explains the principle of "consent of the governed"?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-08',
    options: [
      {
        text: 'Government gets its authority from the agreement and approval of the people it governs.',
        isCorrect: true,
        feedback:
          'Correct! Consent of the governed means that legitimate government authority comes from the people — through elections, representatives, and participation.',
      },
      {
        text: 'Government can only pass laws when every single citizen agrees with them.',
        isCorrect: false,
        feedback:
          'Consent of the governed does not require unanimous agreement — it means the general agreement of the people through their representatives, not a unanimous vote.',
        misconceptionCode: 'M-OPLG-08',
      },
      {
        text: 'Citizens must obey all laws simply because they chose to live in the country.',
        isCorrect: false,
        feedback:
          'Consent of the governed means active agreement through representation, not passive acceptance by residence.',
      },
      {
        text: 'Only property owners have the right to grant or withdraw consent from their government.',
        isCorrect: false,
        feedback:
          'While historically voting was often limited, the philosophical principle of consent of the governed applies to all people under government authority.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-008',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'What was the historical significance of the English Bill of Rights (1689) for the American founding?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-03',
    options: [
      {
        text: 'It demonstrated that government power could be legally limited and that citizens could have specific protections written into law.',
        isCorrect: true,
        feedback:
          'Correct! The English Bill of Rights showed American founders that a government could be formally constrained by law to protect citizens\' rights — a model they followed.',
      },
      {
        text: 'It was the first document in history to limit the power of an English monarch.',
        isCorrect: false,
        feedback:
          'The Magna Carta (1215) was the first document to limit the English monarch\'s power — the English Bill of Rights came more than 400 years later.',
        misconceptionCode: 'M-OPLG-03',
      },
      {
        text: 'It gave American colonists the right to govern themselves independently of Britain.',
        isCorrect: false,
        feedback:
          'The English Bill of Rights applied to England — it did not grant American colonists the right to self-governance.',
      },
      {
        text: 'American founders copied it directly into the U.S. Constitution.',
        isCorrect: false,
        feedback:
          'American founders adapted and built upon English ideas — they did not simply copy the English Bill of Rights.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-009',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'The Mayflower Compact (1620) is considered an early example of self-governance in America. Which statement best describes its significance?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    options: [
      {
        text: 'It showed that a community could create its own governing rules based on the consent of its members.',
        isCorrect: true,
        feedback:
          'Correct! The Pilgrims wrote and agreed to the Compact themselves — demonstrating that colonists could establish legitimate government through mutual agreement.',
      },
      {
        text: 'It established the first representative legislature in the American colonies.',
        isCorrect: false,
        feedback:
          'The first representative legislature was the Virginia House of Burgesses (1619). The Mayflower Compact was a governing agreement, not a legislature.',
      },
      {
        text: 'It declared the Pilgrims independent from England.',
        isCorrect: false,
        feedback:
          'The Mayflower Compact did not declare independence — the Pilgrims remained under English authority.',
      },
      {
        text: 'It was required by the English king before any colonists could settle in America.',
        isCorrect: false,
        feedback:
          'The Compact was created by the Pilgrims themselves because their original charter didn\'t cover their actual landing location — the king did not require it.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-010',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'What does the rule of law mean in the context of American democratic principles?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    options: [
      {
        text: 'All people and institutions, including the government itself, must follow the law.',
        isCorrect: true,
        feedback:
          'Correct! The rule of law means no one — not even the most powerful government official — is above the law.',
      },
      {
        text: 'The most powerful ruler makes the laws and is therefore above them.',
        isCorrect: false,
        feedback:
          'This describes absolute monarchy. The rule of law is specifically the principle that no one is above the law — not even the ruler.',
      },
      {
        text: 'Laws only apply to ordinary citizens, not to government officials.',
        isCorrect: false,
        feedback:
          'The rule of law explicitly applies to government officials too. That is its most important application — limiting the power of those who govern.',
      },
      {
        text: 'Laws must be passed by a unanimous vote of all citizens.',
        isCorrect: false,
        feedback:
          'The rule of law describes who must follow the law — it says nothing about how laws must be passed.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-011',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'A king claims he can seize any citizen\'s land without reason or compensation because he is the ruler. According to Enlightenment social contract theory, why would thinkers like Locke oppose this action?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-07',
    options: [
      {
        text: 'The king\'s action violates the agreement by which people granted him authority — taking property without justification exceeds his legitimate power.',
        isCorrect: true,
        feedback:
          'Correct! Social contract theory holds that government authority has limits. Seizing property arbitrarily violates the agreement between rulers and the governed.',
      },
      {
        text: 'The king is breaking international law by seizing property from citizens.',
        isCorrect: false,
        feedback:
          'Social contract theory is about the agreement between ruler and ruled — not about international law.',
      },
      {
        text: 'The people never gave the king any authority over land or property in any situation.',
        isCorrect: false,
        feedback:
          'Social contract theory does allow government some authority over property — but within limits. The problem here is that the king is acting arbitrarily, not that he has no property authority at all.',
      },
      {
        text: 'Only the Magna Carta grants kings authority over property, so this action is technically legal.',
        isCorrect: false,
        feedback:
          'Social contract theory is a philosophical concept about limits on government authority — it is not based on whether the Magna Carta permits a specific action.',
        misconceptionCode: 'M-OPLG-07',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-012',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'Which pairing correctly matches the Enlightenment philosopher with their most important contribution to American democratic ideas?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-11',
    options: [
      {
        text: 'Locke → natural rights and social contract; Montesquieu → separation of powers',
        isCorrect: true,
        feedback:
          'Correct! Locke\'s natural rights theory and social contract concept directly shaped the Declaration of Independence, while Montesquieu\'s separation of powers shaped the Constitution\'s three-branch structure.',
      },
      {
        text: 'Locke → separation of powers; Montesquieu → natural rights',
        isCorrect: false,
        feedback:
          'These are reversed. Locke is associated with natural rights and social contract; Montesquieu is associated with separation of powers.',
        misconceptionCode: 'M-OPLG-11',
      },
      {
        text: 'Rousseau → natural rights; Locke → separation of powers',
        isCorrect: false,
        feedback:
          'Rousseau focused on popular sovereignty and the general will — not natural rights. And Locke is associated with natural rights, not separation of powers.',
      },
      {
        text: 'Montesquieu → consent of the governed; Locke → separation of powers',
        isCorrect: false,
        feedback:
          'These are reversed. Locke is the thinker most associated with consent of the governed, while Montesquieu is associated with separation of powers.',
      },
    ],
  },
  // ── HIGH / Level 2 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG11-013',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'Analyze the following claim: "Without Enlightenment philosophy, the American Revolution would not have had an intellectual justification." Which evidence best supports this claim?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-04',
    options: [
      {
        text: 'The Declaration of Independence used Locke\'s concepts of natural rights and consent of the governed to justify breaking from Britain.',
        isCorrect: true,
        feedback:
          'Correct! The Declaration is the direct evidence: it explicitly uses Enlightenment ideas to argue that Britain had violated natural rights and the social contract.',
      },
      {
        text: 'Most colonists had read Locke\'s books directly and agreed with his arguments.',
        isCorrect: false,
        feedback:
          'While some founders read Locke, most ordinary colonists were motivated by practical grievances. The claim is about intellectual justification, not about reading habits.',
      },
      {
        text: 'Enlightenment philosophers supported the Revolution by sending money to the colonial cause.',
        isCorrect: false,
        feedback:
          'Enlightenment philosophers (Locke died in 1704) did not financially support the Revolution. Their contribution was intellectual — providing ideas that justified colonial action.',
        misconceptionCode: 'M-OPLG-04',
      },
      {
        text: 'The British government used Enlightenment ideas to defend its own colonial policies.',
        isCorrect: false,
        feedback:
          'Britain generally defended its authority through parliamentary sovereignty, not Enlightenment philosophy.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG11-014',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'A historian argues that the English Bill of Rights (1689) was more directly influential on the American Constitution than the Magna Carta. Which reasoning best supports this argument?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-03',
    options: [
      {
        text: 'The English Bill of Rights included specific protections — such as freedom from excessive bail and the right to petition — that more closely mirror rights in the U.S. Bill of Rights.',
        isCorrect: true,
        feedback:
          'Correct! The English Bill of Rights contained specific, enumerated rights that parallel protections in the American Bill of Rights more closely than the Magna Carta\'s more general limits on royal power.',
      },
      {
        text: 'The English Bill of Rights was written more recently, making it more relevant to the founders.',
        isCorrect: false,
        feedback:
          'Proximity in time alone does not determine influence. What matters is the content and ideas — not just the date.',
      },
      {
        text: 'The Magna Carta only applied to English barons and had no lasting significance after 1215.',
        isCorrect: false,
        feedback:
          'The Magna Carta had lasting significance — its principle that rulers must follow the law remained influential for centuries.',
        misconceptionCode: 'M-OPLG-03',
      },
      {
        text: 'Parliament used the English Bill of Rights to justify taxing the American colonies.',
        isCorrect: false,
        feedback:
          'Parliament justified colonial taxation through parliamentary sovereignty — the English Bill of Rights was not the primary justification for colonial taxation.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG11-015',
    benchmarkCode: 'SS.7.CG.1.4',
    prompt:
      'In 1776, American colonists justified revolution by arguing the king had violated the social contract. Which statement most accurately evaluates the strength of this argument?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'enlightenment-influence',
    remediationTag: 'remed-CG11-enlightenment',
    misconceptionCode: 'M-OPLG-07',
    options: [
      {
        text: 'The argument was effective because Enlightenment ideas about consent and natural rights provided a widely accepted intellectual framework for evaluating legitimate government.',
        isCorrect: true,
        feedback:
          'Correct! Enlightenment ideas were the common intellectual language of the era. By framing the Revolution in terms of violated natural rights and broken social contract, colonists made a compelling case to educated audiences worldwide.',
      },
      {
        text: 'The argument failed because most people in 1776 did not believe in Enlightenment philosophy.',
        isCorrect: false,
        feedback:
          'Enlightenment ideas were widely discussed among the founding generation and sympathetic observers in Europe. The argument was taken seriously at the time.',
      },
      {
        text: 'The argument was weak because the social contract is just a metaphor and has no real political force.',
        isCorrect: false,
        feedback:
          'While the social contract is a philosophical concept rather than a legal document, it was a powerful political tool that provided moral justification for the Revolution.',
        misconceptionCode: 'M-OPLG-07',
      },
      {
        text: 'The argument only worked because the king had literally broken a written contract with the colonies.',
        isCorrect: false,
        feedback:
          'The social contract is not a literal written document. Colonists argued the king had violated philosophical principles of legitimate government, not a specific signed agreement.',
        misconceptionCode: 'M-OPLG-07',
      },
    ],
  },
]

// ── SS.7.CG.1.3 — Documents That Shaped Colonial Views (ADR 0017: was coded 1.2) ──
// Skill tag: colonial-self-governance  |  Remediation: remed-CG12-colonial-gov

const SS7CG12: QuestionDef[] = [
  // ── LOW / Level 1 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG12-001',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'The Virginia House of Burgesses (1619) was the first elected legislative assembly in the American colonies. What was its primary significance?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'It was the first example of representative government in the American colonies.',
        isCorrect: true,
        feedback:
          'Correct! The Virginia House of Burgesses established the precedent that colonists could elect representatives to make laws — a foundation for American self-governance.',
      },
      {
        text: 'It declared Virginia\'s independence from England.',
        isCorrect: false,
        feedback:
          'The House of Burgesses did not declare independence — it was a representative assembly operating within the English colonial system.',
      },
      {
        text: 'It replaced the English Parliament as the governing body for all colonies.',
        isCorrect: false,
        feedback:
          'The House of Burgesses governed only Virginia and existed alongside, not instead of, English parliamentary authority.',
      },
      {
        text: 'It was created by the Pilgrims to govern the Plymouth Colony.',
        isCorrect: false,
        feedback:
          'The House of Burgesses was established in Virginia — the Pilgrims created the Mayflower Compact in Massachusetts.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-002',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'New England town meetings allowed colonists to vote directly on local issues. What form of government do these meetings represent?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'An early form of direct democracy at the local level',
        isCorrect: true,
        feedback:
          'Correct! Town meetings gave colonists direct participation in government decisions — an early form of direct democracy that strengthened traditions of self-governance.',
      },
      {
        text: 'A government controlled by officials appointed by the king',
        isCorrect: false,
        feedback:
          'Town meetings were the opposite of royal-appointed control — they were run by local colonists making decisions for themselves.',
      },
      {
        text: 'A judicial process for settling disputes between colonists',
        isCorrect: false,
        feedback:
          'Town meetings were governing assemblies for community decisions, not courts for resolving legal disputes.',
      },
      {
        text: 'A secret planning group for organizing resistance to British rule',
        isCorrect: false,
        feedback:
          'Town meetings were open, public gatherings for community governance — not secret resistance organizations.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-003',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      '"Salutary neglect" describes a period when Britain largely allowed the colonies to govern themselves without strict interference. What was the primary result of this policy?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Colonial assemblies gained experience and confidence in self-governance.',
        isCorrect: true,
        feedback:
          'Correct! Decades of salutary neglect allowed colonial governments to develop real governing skills and expectations of autonomy that made later British control much harder to reimpose.',
      },
      {
        text: 'Colonists became completely independent from Britain economically.',
        isCorrect: false,
        feedback:
          'Salutary neglect was a governance policy — colonists still traded within the British mercantile system and were not economically independent.',
      },
      {
        text: 'Britain lost all legal authority over the American colonies.',
        isCorrect: false,
        feedback:
          'Salutary neglect was a practical policy of loose enforcement, not a transfer of legal authority — Britain retained legal sovereignty over the colonies.',
      },
      {
        text: 'Colonists distrusted their local assemblies and preferred British rule.',
        isCorrect: false,
        feedback:
          'Salutary neglect had the opposite effect — it made colonists more comfortable with self-governance and more resistant to direct British control.',
      },
    ],
  },
  // ── MODERATE / Level 1 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG12-004',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'By the 1760s, most colonies had elected assemblies that controlled local taxation and spending. Why was this experience important when colonists later argued against "taxation without representation"?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Colonists were accustomed to controlling their own taxes through elected representatives, so British taxation without colonial representation violated their established expectations of self-governance.',
        isCorrect: true,
        feedback:
          'Correct! Over 150 years of self-governance created a strong expectation that colonists should control their own taxation — making British tax policies feel like a fundamental violation of their rights.',
      },
      {
        text: 'Colonial assemblies had written formal treaties with Britain permanently granting them control over taxation.',
        isCorrect: false,
        feedback:
          'No formal treaties permanently granted taxation authority — colonial assemblies operated at British sufferance, not through written agreements.',
      },
      {
        text: 'Colonial assemblies made the colonies financially independent from Britain, so British taxes were economically unnecessary.',
        isCorrect: false,
        feedback:
          'The colonies were not financially independent from Britain. The primary argument against taxation was about representation, not economic self-sufficiency.',
      },
      {
        text: 'Colonists had voted in British parliamentary elections and felt their representatives had betrayed them.',
        isCorrect: false,
        feedback:
          'American colonists had no votes in British parliamentary elections — the lack of representation in Parliament was the core grievance.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-005',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'A colonial governor, appointed by the king, tries to impose a new tax on the colony without approval from the colonial assembly. The assembly refuses to authorize the tax. Which tradition is the assembly exercising?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Self-governance through representative control of taxation',
        isCorrect: true,
        feedback:
          'Correct! Colonial assemblies had long held the power of the purse — the right to approve or deny taxation. The assembly is exercising this established tradition of self-governance.',
      },
      {
        text: 'Direct democracy, where all citizens vote on each tax proposal',
        isCorrect: false,
        feedback:
          'The colonial assembly represents citizens through elected members — it is representative democracy, not direct democracy.',
      },
      {
        text: 'Rejection of English common law in favor of colonial law',
        isCorrect: false,
        feedback:
          'Refusing a specific tax does not mean rejecting common law — the assembly was using established legislative procedures that were rooted in English tradition.',
      },
      {
        text: 'Armed rebellion against British authority',
        isCorrect: false,
        feedback:
          'Refusing a tax through a legislative body is not rebellion — it is using established governmental procedures that colonial assemblies had practiced for generations.',
      },
    ],
  },
  // ── MODERATE / Level 2 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG12-006',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'How did the Mayflower Compact (1620) contribute to the tradition of colonial self-governance?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'It demonstrated that colonists could create their own governing documents based on the consent of the community, without direction from the English government.',
        isCorrect: true,
        feedback:
          'Correct! The Pilgrims wrote the Compact themselves as a self-governing agreement, establishing the principle that colonists could legitimately create and follow rules of their own making.',
      },
      {
        text: 'It gave colonists legal independence from England under international law.',
        isCorrect: false,
        feedback:
          'The Compact did not grant independence — the Pilgrims remained under English authority. It established a self-governing structure within the colonial context.',
      },
      {
        text: 'It required the English Parliament to consult with colonists before passing any laws affecting them.',
        isCorrect: false,
        feedback:
          'The Compact was created by the Pilgrims for their own governance — it placed no obligations on Parliament.',
      },
      {
        text: 'It established the Virginia House of Burgesses model in New England.',
        isCorrect: false,
        feedback:
          'The House of Burgesses was a separate institution established in Virginia — the Mayflower Compact developed independently as a community agreement among the Plymouth colonists.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-007',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'How did the tradition of English common law — laws based on court decisions and long-standing custom rather than written codes — influence American legal and governmental traditions?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'It established the principle that all people have certain rights and that courts must follow consistent legal standards — ideas that shaped American justice and limited government.',
        isCorrect: true,
        feedback:
          'Correct! Common law gave American colonists a tradition of rights-based legal reasoning and consistent judicial standards that they carried into their own legal system.',
      },
      {
        text: 'It required that all American laws be exact copies of English laws.',
        isCorrect: false,
        feedback:
          'Common law was influential but American colonists adapted and developed it for their own needs — they didn\'t simply copy English laws.',
      },
      {
        text: 'It gave Parliament the right to make laws for the colonies without any input from colonial assemblies.',
        isCorrect: false,
        feedback:
          'Colonists actually used common law tradition to argue the opposite — that as English subjects they had rights, including representation in their governing body.',
      },
      {
        text: 'It replaced the need for any written laws or constitutions in the colonies.',
        isCorrect: false,
        feedback:
          'Common law supplemented written laws — it did not replace them. America actually developed a strong tradition of written constitutions alongside common law.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-008',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'Why did the end of salutary neglect after the French and Indian War (1763) create conflict between Britain and the colonies?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Colonists had developed their own governing traditions over more than a century and fiercely resisted Britain\'s attempt to reassert stricter control.',
        isCorrect: true,
        feedback:
          'Correct! Generations of self-governance had created real governing institutions and expectations of autonomy. When Britain tried to reverse salutary neglect, colonists saw it as a violation of their established rights.',
      },
      {
        text: 'Britain decided to give the colonies full independence after the war.',
        isCorrect: false,
        feedback:
          'Britain made the opposite decision — it ended salutary neglect and began enforcing stricter controls to help pay the war debt.',
      },
      {
        text: 'The colonies became financially dependent on British support during the war.',
        isCorrect: false,
        feedback:
          'It was Britain that became financially dependent on colonial revenue to pay war debts — not the other way around.',
      },
      {
        text: 'Colonists had forgotten how to follow British laws after years of neglect.',
        isCorrect: false,
        feedback:
          'Colonists had not forgotten British law — they actively argued they had rights under it. The conflict was political and constitutional, not a matter of ignorance.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-009',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'What was the most significant long-term consequence of the Virginia House of Burgesses for American democracy?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'It established a precedent for representative government, showing that colonists could effectively govern themselves through elected representatives.',
        isCorrect: true,
        feedback:
          'Correct! The House of Burgesses proved over decades that colonists could run a representative assembly — a model that influenced the development of American democracy.',
      },
      {
        text: 'It led directly to the writing of the Declaration of Independence a year after it was established.',
        isCorrect: false,
        feedback:
          'The Declaration was written more than 150 years after the House of Burgesses was established — there is no immediate causal connection.',
      },
      {
        text: 'It convinced the king to give the colonies full control over their own governments.',
        isCorrect: false,
        feedback:
          'The king never gave the colonies full control — the House of Burgesses operated within the colonial system under British authority.',
      },
      {
        text: 'It created the first written constitution in American history.',
        isCorrect: false,
        feedback:
          'The House of Burgesses was a representative assembly — it didn\'t create a written constitution. State constitutions came much later.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-010',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'A student is comparing the Virginia House of Burgesses and New England town meetings. Which statement correctly identifies a key similarity between these two institutions?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Both demonstrated colonists\' ability to govern themselves through organized democratic participation.',
        isCorrect: true,
        feedback:
          'Correct! Though different in structure, both institutions showed colonists practicing self-governance — the House through elected representatives and town meetings through direct participation.',
      },
      {
        text: 'Both were created by the English Parliament to help administer the colonies.',
        isCorrect: false,
        feedback:
          'Neither institution was created by Parliament — the House of Burgesses grew from the Virginia Company charter, and town meetings from Puritan community traditions.',
      },
      {
        text: 'Both required pre-approval from the king before passing any laws.',
        isCorrect: false,
        feedback:
          'The governor could veto colonial laws, but neither institution required prior approval from the king for every action.',
      },
      {
        text: 'Both primarily served as courts for resolving legal disputes among colonists.',
        isCorrect: false,
        feedback:
          'Both were primarily governing/legislative bodies — the House passed laws and town meetings made community decisions. Neither was primarily a court.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-011',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'Historians argue that the colonial period prepared Americans well for self-governance. Which evidence best supports this argument?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Colonists had more than 150 years of experience running representative assemblies, local courts, and community governments before declaring independence.',
        isCorrect: true,
        feedback:
          'Correct! This practical experience was the preparation — by 1776, colonists had generations of real governing experience that made self-rule feel natural and achievable.',
      },
      {
        text: 'Most colonists had formal training in law and political theory from European universities.',
        isCorrect: false,
        feedback:
          'Most colonists did not have formal university training. Their preparation came from practical experience in self-governing institutions, not formal education.',
      },
      {
        text: 'The British government deliberately trained colonial leaders to eventually govern independently.',
        isCorrect: false,
        feedback:
          'Britain\'s colonial policy was not designed to prepare colonists for independence. Salutary neglect happened for practical British reasons, not as a training program.',
      },
      {
        text: 'Colonists preferred British rule but reluctantly accepted self-governance when independence came.',
        isCorrect: false,
        feedback:
          'This contradicts the evidence — colonists actively developed and valued their self-governing institutions. The resistance to British reassertion of control shows they genuinely preferred self-governance.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-012',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'Colonial leaders argued they had "the rights of Englishmen" under common law. How did this argument support their resistance to new British policies after 1763?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Common law tradition held that citizens could not be taxed without following established legal procedures — including representation — which the new British policies violated.',
        isCorrect: true,
        feedback:
          'Correct! Colonists argued from within English legal tradition — claiming that as English subjects they had rights that Parliament was violating, not that they were rejecting English law.',
      },
      {
        text: 'Common law gave colonial assemblies legal authority to nullify any British parliamentary act.',
        isCorrect: false,
        feedback:
          'Common law did not grant colonial assemblies the power to nullify parliamentary acts. This was the colonists\' argument but was not accepted as valid in British constitutional law.',
      },
      {
        text: 'English common law specifically stated that overseas colonies had the right to independence.',
        isCorrect: false,
        feedback:
          'Common law made no such statement. It established rights and procedures but not a right to colonial independence.',
      },
      {
        text: 'The king had specifically agreed in each colony\'s charter to apply common law protections equally to colonists.',
        isCorrect: false,
        feedback:
          'While colonial charters referenced the rights of Englishmen, the argument rested on the general tradition of common law, not specific royal agreements in each charter.',
      },
    ],
  },
  // ── HIGH / Level 2 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG12-013',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'After years of salutary neglect, Britain tried to reassert stricter control over the colonies in the 1760s, but colonists resisted. A historian writes: "The British made the mistake of letting a habit become a right." What does this statement mean?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Colonists came to see their practical experience of self-governance as a legitimate right that Britain could not simply reverse without sparking resistance.',
        isCorrect: true,
        feedback:
          'Correct! Over generations, the habit of self-governance became an expectation and then a claimed right. When Britain tried to reassert control, colonists felt their rights — not just their habits — were being violated.',
      },
      {
        text: 'Britain had officially granted colonists the legal right to self-governance, making any reversal illegal under British law.',
        isCorrect: false,
        feedback:
          'Britain never officially granted the colonies a legal right to self-governance. The historian\'s point is precisely that a habit (practical policy) came to feel like a right, even without formal documentation.',
      },
      {
        text: 'Colonists were angry that Britain was breaking a written promise of self-governance.',
        isCorrect: false,
        feedback:
          'There was no written promise — the historian\'s point is that informal habit, not a written promise, created expectations that were just as powerful.',
      },
      {
        text: 'Britain created a legal precedent by allowing self-governance that it was now legally required to continue.',
        isCorrect: false,
        feedback:
          'Legal precedent doesn\'t work this way for colonial policy — Britain could change its policies. The colonists\' resistance was political and moral, not a legal requirement on Britain.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG12-014',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'By the 1770s, the American colonial understanding of representative government had diverged significantly from the British Parliament\'s understanding of its own authority. Which of the following best explains this divergence?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'Colonists had developed a view of representation tied to direct local consent, while Parliament insisted it had supreme authority over all British subjects everywhere through "virtual representation."',
        isCorrect: true,
        feedback:
          'Correct! This fundamental disagreement about what representation meant was the core constitutional conflict. Colonists demanded actual elected representatives; Parliament claimed all British subjects were "virtually represented" in Parliament.',
      },
      {
        text: 'Colonists had rejected all British constitutional traditions and invented an entirely new system of government.',
        isCorrect: false,
        feedback:
          'Colonists drew heavily on British constitutional traditions — they argued from within them, claiming Parliament was violating the rights of Englishmen.',
      },
      {
        text: 'Parliament had formally declared that American colonists did not have the same rights as English citizens.',
        isCorrect: false,
        feedback:
          'Parliament\'s position, expressed in the Declaratory Act (1766), was that it had authority over the colonies — but this was not a formal stripping of colonial rights as English subjects.',
      },
      {
        text: 'The British king had ordered all colonial assemblies dissolved, eliminating any tradition of self-governance.',
        isCorrect: false,
        feedback:
          'While some assemblies were dissolved at specific times, this was not a blanket policy. The tradition of self-governance had developed over more than a century and could not be simply erased.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG12-015',
    benchmarkCode: 'SS.7.CG.1.3',
    prompt:
      'A political scientist argues: "Salutary neglect created a situation from which Britain could not recover without either war or granting colonial independence." Evaluate this argument.',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'colonial-self-governance',
    remediationTag: 'remed-CG12-colonial-gov',
    options: [
      {
        text: 'The argument is well-supported: more than 150 years of self-governance created political expectations and institutions that could not be removed without provoking a conflict that ultimately became the Revolution.',
        isCorrect: true,
        feedback:
          'Correct! The historical outcome supports the argument — Britain\'s attempt to reassert control after salutary neglect led directly to the American Revolution, exactly what the argument predicts.',
      },
      {
        text: 'The argument is too strong — many colonists were willing to accept British control if Parliament had simply apologized for the taxation policies.',
        isCorrect: false,
        feedback:
          'The historical record suggests colonial attachment to self-governance was deep and structural, not just anger that could be resolved with an apology.',
      },
      {
        text: 'The argument is wrong because Britain successfully reasserted control over the colonies by 1770.',
        isCorrect: false,
        feedback:
          'Britain did not successfully reassert control — the American Revolution began in 1775, proving Britain could not reverse salutary neglect without war.',
      },
      {
        text: 'The argument only applies to New England because salutary neglect didn\'t affect Southern colonies.',
        isCorrect: false,
        feedback:
          'Salutary neglect was a general British colonial policy affecting all thirteen colonies, not just New England. Southern colonies also developed strong self-governing traditions.',
      },
    ],
  },
]

// ── SS.7.CG.1.5 — British Policies and the Road to the Declaration (ADR 0017: was coded 1.3) ──
// Skill tag: british-policies  |  Remediation: remed-CG13-british-policies

const SS7CG13: QuestionDef[] = [
  // ── LOW / Level 1 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG13-001',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt: 'What did the Stamp Act (1765) require colonists to do?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Pay a tax on printed materials such as newspapers, legal documents, and playing cards',
        isCorrect: true,
        feedback:
          'Correct! The Stamp Act required a tax stamp on nearly all printed materials. It was the first direct tax Parliament levied on the colonies and triggered widespread colonial outrage.',
      },
      {
        text: 'Pay a tax on imported tea from Britain',
        isCorrect: false,
        feedback:
          'The tea tax was part of the Townshend Acts (1767), not the Stamp Act (1765). Both were resisted by colonists, but they are separate laws.',
      },
      {
        text: 'Allow British soldiers to stay in colonial homes without payment',
        isCorrect: false,
        feedback:
          'That was the Quartering Act. The Stamp Act specifically taxed printed materials.',
      },
      {
        text: 'Pay a fee to import any goods from non-British countries',
        isCorrect: false,
        feedback:
          'That describes the Navigation Acts, which regulated trade routes — not the Stamp Act, which taxed printed materials.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-002',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'What did colonists mean when they protested "no taxation without representation"?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Parliament should not tax the colonies because colonists had no elected representatives in Parliament.',
        isCorrect: true,
        feedback:
          'Correct! Being taxed by a body in which they had no voice violated the fundamental English principle that taxation required the consent of the taxed through their representatives.',
      },
      {
        text: 'Parliament could tax the colonies, but the king could not.',
        isCorrect: false,
        feedback:
          'Colonists objected to Parliament\'s authority to tax without representation — they didn\'t primarily distinguish between king and Parliament in this way.',
      },
      {
        text: 'The colonies wanted the right to tax Britain as well as be taxed.',
        isCorrect: false,
        feedback:
          'Colonists were not asking to tax Britain — they were demanding representation in the body that taxed them, or the right to tax themselves through their own assemblies.',
      },
      {
        text: 'All taxation was illegal under English law.',
        isCorrect: false,
        feedback:
          'Taxation itself was accepted. The colonists\' argument was specifically about the lack of colonial representation in Parliament — taxation without that representation was the grievance.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-003',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'The Sons of Liberty was a colonial organization that opposed British taxation. What methods did they primarily use?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Protests, boycotts, and intimidating tax collectors',
        isCorrect: true,
        feedback:
          'Correct! The Sons of Liberty organized public protests, encouraged colonists to boycott British goods, and used intimidation to prevent tax collection — making the Stamp Act nearly impossible to enforce.',
      },
      {
        text: 'Filing lawsuits in British courts against Parliament\'s tax laws',
        isCorrect: false,
        feedback:
          'The Sons of Liberty used direct action — protests, boycotts, and intimidation — not legal challenges in British courts.',
      },
      {
        text: 'Writing formal petitions to King George III and patiently waiting for his response',
        isCorrect: false,
        feedback:
          'Formal petitions were the approach of more moderate colonial leaders. The Sons of Liberty used more direct resistance methods.',
      },
      {
        text: 'Organizing a colonial army to fight British tax collectors',
        isCorrect: false,
        feedback:
          'The Sons of Liberty primarily organized protests and boycotts in the 1760s — armed resistance came much later with the Revolution in 1775.',
      },
    ],
  },
  // ── MODERATE / Level 1 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG13-004',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'After the Townshend Acts (1767) imposed taxes on imported goods, many colonists stopped buying British products. Which Enlightenment principle best justifies this boycott?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Consent of the governed — colonists withdrew economic cooperation from a government that taxed them without their consent.',
        isCorrect: true,
        feedback:
          'Correct! Boycotts were a practical application of the consent principle — if colonists couldn\'t consent through representation, they could withdraw economic support.',
      },
      {
        text: 'Separation of powers — colonists were enforcing the idea that Parliament should not have both legislative and taxing power.',
        isCorrect: false,
        feedback:
          'Separation of powers refers to dividing government into branches — colonial boycotts were about consent and representation, not the structure of government.',
      },
      {
        text: 'Rule of law — colonists were forcing Britain to follow its own laws about representation.',
        isCorrect: false,
        feedback:
          'Rule of law is about everyone following established law. A boycott is an economic action most directly tied to the principle of consent, not rule of law.',
      },
      {
        text: 'Natural rights — colonists were protecting their natural right to property from illegal seizure.',
        isCorrect: false,
        feedback:
          'While property rights were relevant, the boycott was specifically a response to taxation without representation — consent of the governed is the most directly applicable principle.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-005',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'The Navigation Acts required that colonial trade go through Britain and be carried on British ships. What was their primary purpose?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'To keep the economic benefits of colonial trade within the British Empire',
        isCorrect: true,
        feedback:
          'Correct! The Navigation Acts were mercantilist policies designed to ensure Britain profited from colonial trade — goods had to flow through British hands and British ships.',
      },
      {
        text: 'To protect colonists from foreign competition in their markets',
        isCorrect: false,
        feedback:
          'The Navigation Acts benefited Britain primarily. Many colonists resented the restrictions they imposed on colonial trade freedom.',
      },
      {
        text: 'To give colonists access to free trade with all countries',
        isCorrect: false,
        feedback:
          'The Navigation Acts restricted colonial trade, requiring it to flow through Britain — the opposite of free trade.',
      },
      {
        text: 'To prevent colonists from building their own merchant fleet',
        isCorrect: false,
        feedback:
          'While Navigation Acts restricted who could carry colonial goods, their primary purpose was to ensure British economic benefit from colonial trade.',
      },
    ],
  },
  // ── MODERATE / Level 2 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG13-006',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'The Townshend Acts (1767) taxed imported goods including glass, paint, paper, and tea. How did colonists primarily respond?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    misconceptionCode: 'M-OPLG-10',
    options: [
      {
        text: 'They organized boycotts of British goods and formed committees of correspondence to coordinate resistance across the colonies.',
        isCorrect: true,
        feedback:
          'Correct! Colonial resistance was organized and cross-colonial — boycotts reduced British imports and committees of correspondence helped colonies act together.',
      },
      {
        text: 'They accepted the taxes because Parliament had the legal authority to regulate colonial trade.',
        isCorrect: false,
        feedback:
          'Colonists did not accept the Townshend Acts — they organized strong resistance, which significantly escalated colonial-British tensions.',
        misconceptionCode: 'M-OPLG-10',
      },
      {
        text: 'They immediately declared war on Britain to defend their rights.',
        isCorrect: false,
        feedback:
          'Armed conflict did not begin until 1775. Colonists used non-violent economic resistance for nearly a decade before the Revolution.',
      },
      {
        text: 'They petitioned King George III to dissolve Parliament and rule the colonies directly.',
        isCorrect: false,
        feedback:
          'Colonists petitioned for repeal of the acts — they did not ask the king to dissolve Parliament.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-007',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'How did the French and Indian War (1754–1763) directly lead to increased tensions between Britain and the colonies?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Britain accumulated massive war debts and sought new tax revenue from the colonies, but colonists resisted taxation without representation.',
        isCorrect: true,
        feedback:
          'Correct! The war left Britain deeply in debt. When Parliament turned to the colonies to help pay through new taxes, colonists argued they should not be taxed without representation in Parliament.',
      },
      {
        text: 'The war made Britain too weak to enforce its laws, so colonists began ignoring British authority.',
        isCorrect: false,
        feedback:
          'Britain actually tried to increase control after the war. The issue was colonial resistance to this increased control, not British weakness.',
      },
      {
        text: 'France convinced the colonies to rebel against Britain as revenge for losing the war.',
        isCorrect: false,
        feedback:
          'French involvement in the Revolution came later (1778), as an ally after the war had already started — not as an instigator of colonial resistance in the 1760s.',
      },
      {
        text: 'The war proved colonial soldiers were militarily superior to the British, making them confident enough to revolt.',
        isCorrect: false,
        feedback:
          'Military confidence played some role, but the primary cause of tensions in the 1760s was British taxation to pay war debts, not military assessments from the war.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-008',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'Which correctly sequences colonial responses to British policies, from least to most direct form of resistance?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Petitions to Parliament → organized boycotts of British goods → armed conflict at Lexington and Concord',
        isCorrect: true,
        feedback:
          'Correct! Colonial resistance escalated gradually over more than a decade: legal petitions first, then economic pressure through boycotts, and finally armed conflict.',
      },
      {
        text: 'Armed conflict → petitions → boycotts',
        isCorrect: false,
        feedback:
          'Colonists used peaceful methods long before armed conflict — they didn\'t begin with violence.',
      },
      {
        text: 'Boycotts → petitions → armed conflict',
        isCorrect: false,
        feedback:
          'Petitions generally came before organized boycotts as the initial response — peaceful legal appeals came first.',
      },
      {
        text: 'Petitions → armed conflict → boycotts',
        isCorrect: false,
        feedback:
          'Armed conflict came last in the sequence, not in the middle. Boycotts were used extensively before the Revolution began.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-009',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'How did the principle of "no taxation without representation" reflect Enlightenment ideas about government?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    misconceptionCode: 'M-OPLG-08',
    options: [
      {
        text: 'It applied Locke\'s concept of consent of the governed — people should not be subject to laws, including tax laws, made without their agreement through representatives.',
        isCorrect: true,
        feedback:
          'Correct! The taxation argument was directly Lockean — government requires the consent of the governed, and taxation without representation denied colonists that consent.',
      },
      {
        text: 'It reflected Montesquieu\'s separation of powers by arguing that Parliament had no taxing power separate from the king.',
        isCorrect: false,
        feedback:
          'Montesquieu\'s separation of powers concerned dividing government into branches — not who holds taxing authority. The taxation argument was about consent and representation.',
      },
      {
        text: 'It showed colonists arguing they had surrendered their right to protest taxation when they accepted British protection.',
        isCorrect: false,
        feedback:
          'Social contract theory actually supported the colonists — they argued the king violated the social contract by taxing without representation, not that they had surrendered protest rights.',
      },
      {
        text: 'It required every individual colonist to personally consent to any tax before it could be valid.',
        isCorrect: false,
        feedback:
          'Consent of the governed requires representation, not unanimous individual consent. The argument was about having elected representatives in Parliament, not individual vetoes.',
        misconceptionCode: 'M-OPLG-08',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-010',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'In 1773, colonists dressed as Mohawks dumped 342 chests of British tea into Boston Harbor. How does this event best fit into the broader pattern of colonial resistance?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'It was an escalation of resistance tactics, demonstrating that colonists were willing to take direct economic action to protest taxation without representation.',
        isCorrect: true,
        feedback:
          'Correct! The Boston Tea Party moved beyond organized boycotts to direct destruction of taxed goods — a significant escalation that prompted the Intolerable Acts.',
      },
      {
        text: 'It marked the beginning of armed conflict between the colonies and Britain.',
        isCorrect: false,
        feedback:
          'The Boston Tea Party destroyed property — it was not an armed military conflict. Armed conflict began at Lexington and Concord in April 1775.',
      },
      {
        text: 'It showed colonists accepting British tea while rejecting the tax — a legal compromise.',
        isCorrect: false,
        feedback:
          'Colonists rejected both the tea and the tax by destroying it entirely — this was not a compromise.',
      },
      {
        text: 'It was a violent attack on British soldiers stationed in Boston.',
        isCorrect: false,
        feedback:
          'The Boston Tea Party targeted property owned by the East India Company. No British soldiers were attacked — it was property destruction, not military violence.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-011',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'Which factor best explains why peaceful colonial resistance eventually gave way to armed conflict by 1775?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'Britain responded to colonial resistance by sending more troops and passing the Intolerable Acts, which closed Boston\'s port and restricted colonial self-governance.',
        isCorrect: true,
        feedback:
          'Correct! Rather than negotiating, Britain escalated. The Intolerable Acts (1774) united the colonies against Britain and made compromise seem impossible, leading to the First Continental Congress.',
      },
      {
        text: 'Colonial leaders believed peaceful resistance was against Enlightenment principles, so they quickly moved to armed conflict.',
        isCorrect: false,
        feedback:
          'Enlightenment philosophy supports peaceful methods and legitimate political change. Colonial leaders used peaceful methods for a decade before armed conflict.',
      },
      {
        text: 'Colonists ran out of British goods to boycott, making armed conflict the only remaining option.',
        isCorrect: false,
        feedback:
          'Boycotts were effective, but the shift to armed conflict was driven by British military escalation — not a lack of boycott targets.',
      },
      {
        text: 'Colonial assemblies formally voted to declare war on Britain.',
        isCorrect: false,
        feedback:
          'The colonies didn\'t formally declare war — armed conflict began at Lexington and Concord (April 1775), before the Declaration of Independence (July 1776).',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-012',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'From Britain\'s perspective, why did Parliament believe it had the right to tax the American colonies?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    misconceptionCode: 'M-OPLG-10',
    options: [
      {
        text: 'Parliament claimed it represented all British subjects — including colonists — under the concept of "virtual representation."',
        isCorrect: true,
        feedback:
          'Correct! Parliament argued its members represented all British subjects, not just local constituents. Colonists rejected this, insisting representation required actual elected representatives.',
      },
      {
        text: 'Colonial charters specifically granted Parliament the right to impose direct taxes on the colonies.',
        isCorrect: false,
        feedback:
          'Colonial charters did not specifically grant direct taxing authority. Parliament\'s claim rested on broader constitutional theory — parliamentary sovereignty.',
        misconceptionCode: 'M-OPLG-10',
      },
      {
        text: 'Colonists had voted for members of Parliament who supported the taxation policies.',
        isCorrect: false,
        feedback:
          'Colonists had no votes in parliamentary elections — the "virtual representation" argument was Parliament\'s direct response to this fact.',
      },
      {
        text: 'Britain had treaties with each colony granting taxing authority in exchange for military protection.',
        isCorrect: false,
        feedback:
          'No such treaties existed. Parliament\'s authority claim was based on constitutional theory, not specific treaties with individual colonies.',
      },
    ],
  },
  // ── HIGH / Level 2 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG13-013',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'A Loyalist argued in 1770: "The colonists enjoy more freedom than any other people in the world. Their resistance to lawful taxation is selfish and dangerous." How would a Patriot best respond using Enlightenment principles?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'The legitimacy of government depends on consent of the governed — taxation without representation violates the principle that government authority requires the agreement of those it governs.',
        isCorrect: true,
        feedback:
          'Correct! This directly engages the Loyalist\'s claim with the core Enlightenment argument: freedom isn\'t only about current conditions but about whether government has legitimate authority based on consent.',
      },
      {
        text: 'The colonies are financially self-sufficient and don\'t need British protection, so they owe no taxes.',
        isCorrect: false,
        feedback:
          'This economic argument doesn\'t address the Loyalist\'s point about political legitimacy. The Enlightenment response is about consent, not economic self-sufficiency.',
      },
      {
        text: 'British laws have always exempted the colonies from direct taxation under common law.',
        isCorrect: false,
        feedback:
          'While colonists made common law arguments, the stronger Patriot response uses Enlightenment principles about consent to address the core issue of legitimate authority.',
      },
      {
        text: 'The colonists are willing to pay taxes but want to pay more than Parliament is asking.',
        isCorrect: false,
        feedback:
          'This completely misrepresents the colonial position. Colonists were not asking to pay more — they were demanding representation in the body that taxed them.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG13-014',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'Why did the period from 1763 to 1775 see rapid escalation from colonial petitions to armed revolt? Which explanation is most historically complete?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    options: [
      {
        text: 'British insistence on parliamentary supremacy clashed with colonial expectations of self-governance, and each side\'s response to the other\'s escalation made compromise increasingly unlikely.',
        isCorrect: true,
        feedback:
          'Correct! The escalation was mutual — British acts led to colonial resistance, which led to British crackdowns, which led to more resistance. Neither side accepted the other\'s core position.',
      },
      {
        text: 'Colonial leaders had always planned to create an independent nation and used British taxation as a convenient excuse.',
        isCorrect: false,
        feedback:
          'Most colonial leaders initially sought reform within the British system. Independence was not the original goal — it developed gradually through conflict over more than a decade.',
      },
      {
        text: 'The Revolution was primarily caused by economic competition between British and colonial merchants over trade routes.',
        isCorrect: false,
        feedback:
          'Economic conflict played a role but was secondary to the constitutional question of taxation and representation, which was the primary driver of escalation.',
      },
      {
        text: 'Britain deliberately provoked the colonists in order to justify a military crackdown.',
        isCorrect: false,
        feedback:
          'British policies were driven by financial need and constitutional theory, not a deliberate plan to provoke conflict.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG13-015',
    benchmarkCode: 'SS.7.CG.1.5',
    prompt:
      'The Intolerable Acts (1774) closed Boston\'s port, restricted the Massachusetts colonial assembly, and required colonists to house British soldiers. Which analysis is most historically accurate?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'british-policies',
    remediationTag: 'remed-CG13-british-policies',
    misconceptionCode: 'M-OPLG-10',
    options: [
      {
        text: 'The Intolerable Acts directly attacked colonial self-governance, causing colonists to see British rule as incompatible with their established rights — and uniting previously divided colonies against Britain.',
        isCorrect: true,
        feedback:
          'Correct! The Intolerable Acts backfired — instead of isolating Massachusetts, they united all thirteen colonies and led to the First Continental Congress (1774).',
      },
      {
        text: 'The Intolerable Acts were a reasonable and proportionate response to the illegal destruction of private property in the Boston Tea Party.',
        isCorrect: false,
        feedback:
          'While Britain had reasons for the Acts, labeling them simply "reasonable" ignores their dramatic political effects — they significantly escalated conflict and unified colonial resistance.',
        misconceptionCode: 'M-OPLG-10',
      },
      {
        text: 'The Intolerable Acts were largely symbolic and had little practical impact on colonial life.',
        isCorrect: false,
        feedback:
          'The Acts had major practical impacts — closing Boston\'s port devastated the city economically, and restricting the Massachusetts assembly directly limited colonial self-governance.',
      },
      {
        text: 'The Intolerable Acts successfully convinced most colonists to accept British authority.',
        isCorrect: false,
        feedback:
          'The Intolerable Acts had the opposite effect — they united colonial resistance and led to the First Continental Congress.',
      },
    ],
  },
]

// ── SS.7.CG.1.6 — Ideas and Grievances of the Declaration (ADR 0017: was coded 1.4) ──
// Skill tag: declaration-principles  |  Remediation: remed-CG14-declaration

const SS7CG14: QuestionDef[] = [
  // ── LOW / Level 1 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG14-001',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt: 'Who was primarily responsible for drafting the Declaration of Independence?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-04',
    options: [
      {
        text: 'Thomas Jefferson',
        isCorrect: true,
        feedback:
          'Correct! Jefferson was selected by the Continental Congress committee to write the Declaration. He drew heavily on Enlightenment philosophy — especially Locke — in crafting its language.',
      },
      {
        text: 'John Locke',
        isCorrect: false,
        feedback:
          'Locke was an English philosopher who died in 1704. He influenced Jefferson\'s ideas but did not write the Declaration.',
        misconceptionCode: 'M-OPLG-04',
      },
      {
        text: 'Benjamin Franklin',
        isCorrect: false,
        feedback:
          'Franklin was on the committee that reviewed the Declaration and suggested edits, but Jefferson was its primary author.',
      },
      {
        text: 'George Washington',
        isCorrect: false,
        feedback:
          'Washington was the commander of the Continental Army — he was not the primary author of the Declaration.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-002',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'The Declaration of Independence states that all people have "unalienable Rights." Which rights does it specifically list?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-05',
    options: [
      {
        text: 'Life, liberty, and the pursuit of happiness',
        isCorrect: true,
        feedback:
          'Correct! Jefferson chose these three unalienable rights. He adapted John Locke\'s "life, liberty, and property" by changing "property" to "the pursuit of happiness."',
      },
      {
        text: 'Life, liberty, and property',
        isCorrect: false,
        feedback:
          'John Locke listed "life, liberty, and property" — but Jefferson changed "property" to "the pursuit of happiness" in the Declaration.',
        misconceptionCode: 'M-OPLG-05',
      },
      {
        text: 'Freedom of speech, religion, and assembly',
        isCorrect: false,
        feedback:
          'These are rights protected by the First Amendment to the Constitution — they are not the three rights listed in the Declaration\'s preamble.',
      },
      {
        text: 'Life, equality, and the pursuit of happiness',
        isCorrect: false,
        feedback:
          'The Declaration says "liberty," not "equality" in this list. It does say "all men are created equal," but the three listed rights are life, liberty, and the pursuit of happiness.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-003',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'The Declaration of Independence served two main purposes. What were they?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    options: [
      {
        text: 'To explain the philosophical reasons for independence and to list the specific complaints against King George III',
        isCorrect: true,
        feedback:
          'Correct! The Declaration has two distinct sections: universal philosophical principles (natural rights, consent of the governed) and specific grievances proving the king had violated those principles.',
      },
      {
        text: 'To create the new government structure and list the rights of citizens',
        isCorrect: false,
        feedback:
          'The Declaration didn\'t create a government structure — the Articles of Confederation and later the Constitution did that.',
      },
      {
        text: 'To demand that Britain repeal the Intolerable Acts and negotiate a peace treaty',
        isCorrect: false,
        feedback:
          'The Declaration\'s goal was independence, not negotiation. It announced a permanent break from Britain, not a request for compromise.',
      },
      {
        text: 'To announce a military alliance with France and Spain against Britain',
        isCorrect: false,
        feedback:
          'The Declaration announced independence. The military alliance with France came much later in 1778.',
      },
    ],
  },
  // ── MODERATE / Level 1 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG14-004',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'The Declaration contains both universal principles and specific grievances. Which of the following is a universal principle?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-09',
    options: [
      {
        text: '"All men are created equal, that they are endowed by their Creator with certain unalienable Rights."',
        isCorrect: true,
        feedback:
          'Correct! This is a universal principle — it applies to all people everywhere and at all times, not just to colonial complaints about Britain.',
      },
      {
        text: '"He has refused his Assent to Laws, the most wholesome and necessary for the public good."',
        isCorrect: false,
        feedback:
          'This is a specific grievance about King George III\'s actions in the colonies — not a universal principle that applies to all governments.',
        misconceptionCode: 'M-OPLG-09',
      },
      {
        text: '"He has dissolved Representative Houses repeatedly."',
        isCorrect: false,
        feedback:
          'This is a specific grievance about the king\'s actions against colonial assemblies — not a universal philosophical principle.',
        misconceptionCode: 'M-OPLG-09',
      },
      {
        text: '"He has kept among us, in times of peace, Standing Armies without the Consent of our Legislatures."',
        isCorrect: false,
        feedback:
          'This is a specific complaint about British military presence in the colonies — a grievance, not a universal principle.',
        misconceptionCode: 'M-OPLG-09',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-005',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'The Declaration states: "Whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it." Which Enlightenment idea does this most directly reflect?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-09',
    options: [
      {
        text: 'Social contract theory — if government fails to protect rights, the people have the right to change or replace it.',
        isCorrect: true,
        feedback:
          'Correct! This is Locke\'s social contract in action: government gets its authority from the people, and if it fails its obligations, the people can withdraw that authority.',
      },
      {
        text: 'Popular sovereignty — the people choose their own king through democratic elections.',
        isCorrect: false,
        feedback:
          'Popular sovereignty is related, but this passage specifically describes the right to overthrow failing government — that\'s the social contract\'s remedy for governmental failure.',
      },
      {
        text: 'Rule of law — all governments must follow established laws or be removed.',
        isCorrect: false,
        feedback:
          'Rule of law is about everyone following the law. This passage is specifically about the right to change government when it fails its people — this is social contract theory.',
      },
      {
        text: 'Separation of powers — government must be divided into branches to prevent tyranny.',
        isCorrect: false,
        feedback:
          'Separation of powers is Montesquieu\'s concept about dividing government branches — not about the right to overthrow government when it fails.',
      },
    ],
  },
  // ── MODERATE / Level 2 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG14-006',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'How did Enlightenment philosophy provide the intellectual foundation for the Declaration of Independence?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-04',
    options: [
      {
        text: 'The Declaration used Locke\'s concepts of natural rights and consent of the governed to argue that Britain had violated its legitimate authority over the colonies.',
        isCorrect: true,
        feedback:
          'Correct! Jefferson translated Enlightenment philosophy into a practical political document — using natural rights and consent of the governed as the framework for justifying independence.',
      },
      {
        text: 'The Declaration was a direct copy of John Locke\'s writings, with colonial names substituted.',
        isCorrect: false,
        feedback:
          'Jefferson adapted and developed Locke\'s ideas in his own language. The Declaration is an original document inspired by Enlightenment thinking — not a copy.',
        misconceptionCode: 'M-OPLG-04',
      },
      {
        text: 'Montesquieu\'s theory of separation of powers was the most important idea in the Declaration.',
        isCorrect: false,
        feedback:
          'The Declaration focused primarily on natural rights, social contract, and consent — separation of powers became more central in the Constitution, not the Declaration.',
      },
      {
        text: 'The Declaration rejected Enlightenment ideas in favor of uniquely American political traditions.',
        isCorrect: false,
        feedback:
          'The Declaration is one of the clearest expressions of Enlightenment ideas in any founding document — it deeply embraces, not rejects, Enlightenment philosophy.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-007',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'Why is the Declaration of Independence considered historically significant beyond the American Revolution?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-02',
    options: [
      {
        text: 'It expressed ideals of human equality and natural rights that inspired democratic and independence movements around the world for generations.',
        isCorrect: true,
        feedback:
          'Correct! The Declaration\'s universal language — "all men are created equal" — resonated far beyond 1776 and was invoked by liberation movements worldwide.',
      },
      {
        text: 'It created a legal system of rights that remains enforceable in American courts today.',
        isCorrect: false,
        feedback:
          'The Declaration is not a legally binding document in today\'s courts — the Constitution and amendments provide the legal framework. The Declaration is a political and philosophical statement.',
        misconceptionCode: 'M-OPLG-02',
      },
      {
        text: 'It was the first document in history to declare that governments must have consent of the governed.',
        isCorrect: false,
        feedback:
          'While revolutionary, the Declaration built on earlier ideas. Enlightenment philosophers and earlier documents had established similar principles before 1776.',
      },
      {
        text: 'It immediately freed all enslaved people in the colonies upon signing.',
        isCorrect: false,
        feedback:
          'The Declaration did not free enslaved people. The contradiction between its ideals and the reality of slavery was a profound tension not resolved until the Civil War.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-008',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'Which passage from the Declaration most clearly reflects the social contract theory?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-07',
    options: [
      {
        text: '"Governments are instituted among Men, deriving their just powers from the consent of the governed."',
        isCorrect: true,
        feedback:
          'Correct! This directly states the social contract principle — government authority comes from the agreement of the people, not from divine right or force.',
      },
      {
        text: '"We hold these truths to be self-evident, that all men are created equal."',
        isCorrect: false,
        feedback:
          'This reflects natural rights philosophy and the idea of human equality. While related to social contract, it most directly expresses the principle of natural equality.',
      },
      {
        text: '"He has refused his Assent to Laws, the most wholesome and necessary for the public good."',
        isCorrect: false,
        feedback:
          'This is a specific grievance against the king — not a statement of social contract theory, which is a philosophical principle about government\'s source of authority.',
        misconceptionCode: 'M-OPLG-09',
      },
      {
        text: '"That among these are Life, Liberty and the pursuit of Happiness."',
        isCorrect: false,
        feedback:
          'This is a statement of natural rights. While natural rights are the foundation of social contract theory, this passage most directly expresses natural rights philosophy itself.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-009',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'Why does the Declaration of Independence list 27 specific grievances against King George III after stating its philosophical principles?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-09',
    options: [
      {
        text: 'The grievances demonstrate that the king had repeatedly violated the principles stated earlier, justifying the colonists\' decision to exercise their right to self-governance.',
        isCorrect: true,
        feedback:
          'Correct! The structure is logical: principles first (the standard), then grievances (the evidence of violations). Together they build the case that independence is justified.',
      },
      {
        text: 'The grievances are the philosophical foundation of the Declaration — they explain why natural rights matter.',
        isCorrect: false,
        feedback:
          'The philosophical principles come first and form the foundation. The grievances are evidence of violations — not the philosophical basis itself.',
        misconceptionCode: 'M-OPLG-09',
      },
      {
        text: 'The grievances were included to persuade the British Parliament to agree to peaceful terms with the colonies.',
        isCorrect: false,
        feedback:
          'The Declaration was not a negotiation document — it declared a permanent break. Its audience was the world (especially France) and American colonists, not Parliament.',
      },
      {
        text: 'The grievances proved that the colonies had always been independent and that British authority was never legitimate.',
        isCorrect: false,
        feedback:
          'Colonists acknowledged British authority had been legitimate — their argument was that the king had abused that authority, not that it never existed.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-010',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'A student is asked to classify two statements from the Declaration: (1) "All men are created equal, endowed with unalienable rights." (2) "He has quartered large bodies of armed troops among us." How should the student classify these?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-09',
    options: [
      {
        text: '(1) is a universal principle; (2) is a specific grievance.',
        isCorrect: true,
        feedback:
          'Correct! Statement 1 is philosophical — it applies to all people at all times. Statement 2 is a specific complaint about British military actions in the colonies.',
      },
      {
        text: '(1) is a specific grievance; (2) is a universal principle.',
        isCorrect: false,
        feedback:
          'These are reversed. Statement 1 is philosophical — "all men" means all people everywhere. Statement 2 describes a specific British action.',
        misconceptionCode: 'M-OPLG-09',
      },
      {
        text: 'Both are specific grievances about British actions.',
        isCorrect: false,
        feedback:
          'Statement 1 is not a grievance — it\'s a statement of universal philosophical truth. "All men are created equal" applies to all governments, not just to British actions.',
      },
      {
        text: 'Both are universal principles that apply to all governments.',
        isCorrect: false,
        feedback:
          'Statement 2 is not a universal principle — it\'s a specific complaint about what the king actually did in the colonies.',
        misconceptionCode: 'M-OPLG-09',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-011',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'The Declaration says that when government becomes "destructive" of people\'s rights, it is the "duty" of the people to alter or abolish it. How did colonists apply this principle to justify independence?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    options: [
      {
        text: 'They argued that the king\'s repeated violations — documented in the grievances — had made the government destructive of their natural rights, triggering their right and duty to seek independence.',
        isCorrect: true,
        feedback:
          'Correct! The Declaration\'s logical structure is: here are our principles, here is the evidence of violations, therefore independence is both justified and necessary.',
      },
      {
        text: 'They used this principle to argue that all monarchies are inherently destructive and must be replaced.',
        isCorrect: false,
        feedback:
          'The colonists\' argument was not that all monarchies are wrong — they argued this specific king had become destructive through specific, documented actions.',
      },
      {
        text: 'They interpreted "alter or abolish" to mean they should try to reform Parliament from within rather than declare independence.',
        isCorrect: false,
        feedback:
          'By 1776, colonial leaders had concluded reform was not possible — independence was the remedy. The Declaration explicitly announces a break, not a reform effort.',
      },
      {
        text: 'They claimed this principle gave them the right to overthrow any government they personally disliked.',
        isCorrect: false,
        feedback:
          'The Declaration explicitly states that governments should not be overthrown for "light and transient causes." The standard is a long history of abuses — not mere personal dissatisfaction.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-012',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'How does the Declaration of Independence reflect the influence of John Locke\'s political philosophy?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-11',
    options: [
      {
        text: 'Like Locke, Jefferson argued that government gets its authority from the consent of the governed and that people have the right to overthrow government when it violates their natural rights.',
        isCorrect: true,
        feedback:
          'Correct! These two Lockean ideas — consent as the basis of authority and the right of revolution — are the philosophical backbone of the Declaration.',
      },
      {
        text: 'Jefferson copied Locke\'s exact words about natural rights directly into the Declaration.',
        isCorrect: false,
        feedback:
          'Jefferson adapted Locke\'s ideas — notably changing "property" to "pursuit of happiness." He did not copy Locke word for word.',
        misconceptionCode: 'M-OPLG-11',
      },
      {
        text: 'Jefferson disagreed with Locke\'s ideas and wrote the Declaration as a response to Enlightenment philosophy.',
        isCorrect: false,
        feedback:
          'Jefferson deeply admired Locke and used his philosophy as a direct foundation for the Declaration. Jefferson\'s personal library contained Locke\'s works.',
      },
      {
        text: 'Like Locke, Jefferson argued that only men of property had natural rights and the right to govern.',
        isCorrect: false,
        feedback:
          'Jefferson\'s Declaration uses universal language — "all men are created equal." While application was limited in practice, he did not explicitly restrict rights to property owners in the Declaration.',
      },
    ],
  },
  // ── HIGH / Level 2 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG14-013',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'A scholar argues that the Declaration\'s structure — principles first, then grievances — was a deliberate rhetorical and logical strategy. What is the strongest version of this argument?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-09',
    options: [
      {
        text: 'By establishing universal principles first, Jefferson made the grievances more powerful — they served as evidence that the king had violated timeless truths, not just specific rules.',
        isCorrect: true,
        feedback:
          'Correct! The structure is persuasive precisely because of this sequence: first establish what is universally right, then prove the king violated it. The grievances become a case, not just a complaint.',
      },
      {
        text: 'The principles were added after the grievances were written, so the structure was accidental rather than strategic.',
        isCorrect: false,
        feedback:
          'Historical evidence suggests Jefferson carefully crafted the Declaration\'s structure. The principles-then-grievances organization reflects deliberate rhetorical design.',
      },
      {
        text: 'The grievances were placed second because they were less important than the principles in persuading foreign nations.',
        isCorrect: false,
        feedback:
          'The grievances were critical — they provided the specific evidence. The structure is not about importance but about logical sequencing: establish the standard, then prove it was violated.',
        misconceptionCode: 'M-OPLG-09',
      },
      {
        text: 'The principles were included only to appeal to French and Spanish readers familiar with Enlightenment philosophy.',
        isCorrect: false,
        feedback:
          'While international persuasion was a goal, the structure also served domestic purposes — justifying revolution to Americans uncertain about independence.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG14-014',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'Jefferson changed Locke\'s phrase "life, liberty, and property" to "life, liberty, and the pursuit of happiness." Which explanation best accounts for this change?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-05',
    options: [
      {
        text: 'Jefferson may have wanted a broader concept that included more than just ownership — emphasizing that government should protect people\'s ability to flourish and seek a good life, not just protect property.',
        isCorrect: true,
        feedback:
          'Correct! "Pursuit of happiness" has roots in classical philosophy and suggests a richer vision of human flourishing than the narrower concept of property ownership.',
      },
      {
        text: 'Jefferson changed "property" to avoid the contradiction with slavery — since enslaved people were considered property.',
        isCorrect: false,
        feedback:
          'While the contradiction of slavery was real and profound, historians note that Jefferson himself enslaved people. "Pursuit of happiness" still implicitly related to property for many at the time.',
        misconceptionCode: 'M-OPLG-05',
      },
      {
        text: 'Jefferson was unfamiliar with Locke\'s writings and didn\'t know the original phrase was "life, liberty, and property."',
        isCorrect: false,
        feedback:
          'Jefferson was deeply familiar with Locke — his library contained Locke\'s works and he drew extensively on Locke\'s philosophy. The change was deliberate.',
        misconceptionCode: 'M-OPLG-04',
      },
      {
        text: '"Pursuit of happiness" was a legal term with a specific technical meaning under colonial law.',
        isCorrect: false,
        feedback:
          '"Pursuit of happiness" was not a legal term with a precise technical meaning. It was a philosophical concept Jefferson chose to expand the Declaration\'s vision of human rights.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG14-015',
    benchmarkCode: 'SS.7.CG.1.6',
    prompt:
      'Abolitionist Frederick Douglass asked in 1852: "What to the Slave is the Fourth of July?" — arguing the Declaration\'s ideals had not been fulfilled for enslaved Americans. Which analysis of the Declaration\'s legacy is most historically nuanced?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'declaration-principles',
    remediationTag: 'remed-CG14-declaration',
    misconceptionCode: 'M-OPLG-02',
    options: [
      {
        text: 'The Declaration articulated ideals of equality and natural rights powerful enough to be claimed by groups who were excluded at the time, showing both its unfulfilled promise and its enduring transformative potential.',
        isCorrect: true,
        feedback:
          'Correct! Douglass himself used the Declaration\'s language against slavery — proving that its universal ideals could be turned into tools for expanding freedom beyond the founders\' original intentions.',
      },
      {
        text: 'The Declaration\'s ideals were clearly intended to apply only to white male property owners, and any later interpretation to include others was a misreading.',
        isCorrect: false,
        feedback:
          'While the original application was limited, the document\'s universal language — "all men," "unalienable rights" — invited broader interpretation. That interpretive potential was part of its power.',
      },
      {
        text: 'Because the Declaration contradicted itself by allowing slavery, it had no significant impact on later civil rights movements.',
        isCorrect: false,
        feedback:
          'The Declaration\'s ideals of equality and natural rights were explicitly invoked by abolitionists, suffragists, and civil rights leaders — its impact on later movements was profound.',
        misconceptionCode: 'M-OPLG-02',
      },
      {
        text: 'The Declaration solved the problem of slavery by declaring all people equal, which eventually led all states to end slavery voluntarily.',
        isCorrect: false,
        feedback:
          'Slavery was not ended by voluntary state action citing the Declaration — it required the Civil War and the 13th Amendment (1865) to abolish slavery in the United States.',
      },
    ],
  },
]

// ── SS.7.CG.1.7 — Articles of Confederation to the Constitution (ADR 0017: was coded 1.5) ──
// Skill tag: articles-weaknesses  |  Remediation: remed-CG15-articles

const SS7CG15: QuestionDef[] = [
  // ── LOW / Level 1 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG15-001',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'What was the most significant financial weakness of the Articles of Confederation?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    misconceptionCode: 'M-OPLG-01',
    options: [
      {
        text: 'Congress could not tax citizens directly — it could only ask states to contribute money.',
        isCorrect: true,
        feedback:
          'Correct! Without taxing power, Congress had no reliable revenue. States frequently ignored requests for money, leaving the national government unable to pay its debts or fund basic operations.',
      },
      {
        text: 'Congress could print money but couldn\'t collect taxes from citizens.',
        isCorrect: false,
        feedback:
          'Under the Articles, Congress could print money — but the bigger structural problem was the complete absence of any taxing power to fund government operations.',
      },
      {
        text: 'The president controlled all taxation, which Congress could not override.',
        isCorrect: false,
        feedback:
          'There was no president under the Articles of Confederation — the lack of an executive branch was itself a major weakness.',
        misconceptionCode: 'M-OPLG-01',
      },
      {
        text: 'States were required to send all their tax revenue to Congress, leaving states with no funding.',
        isCorrect: false,
        feedback:
          'The opposite was true — states kept their money and could choose whether to contribute to Congress, which they often did not.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-002',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Under the Articles of Confederation, how were votes distributed among the states in Congress?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'Each state had one vote, regardless of its population.',
        isCorrect: true,
        feedback:
          'Correct! Under the Articles, every state had exactly one vote in Congress — whether it was large Virginia or small Delaware. This became a major point of contention at the Constitutional Convention.',
      },
      {
        text: 'Each state received votes proportional to its population.',
        isCorrect: false,
        feedback:
          'Population-based representation was the Virginia Plan proposal at the Constitutional Convention — not the system under the Articles, which gave each state one vote.',
      },
      {
        text: 'Only states that paid their share of national expenses could vote.',
        isCorrect: false,
        feedback:
          'All states had one vote under the Articles regardless of financial contributions — though many states did fail to pay their share, which was part of the problem.',
      },
      {
        text: 'Large states had two votes and small states had one vote.',
        isCorrect: false,
        feedback:
          'All states had exactly one vote under the Articles — equal representation regardless of size.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-003',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Shays\' Rebellion (1786–1787) was an armed uprising in Massachusetts. Why did it alarm national leaders and contribute to calls for a new constitution?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'It showed that the national government under the Articles was too weak to maintain order or respond to a domestic crisis.',
        isCorrect: true,
        feedback:
          'Correct! When Massachusetts farmers revolted, the national government had no army or funds to help — the state had to act alone. This exposed the Articles\' inability to protect the nation from internal disorder.',
      },
      {
        text: 'It proved that state governments were too powerful and needed to be limited by a stronger national government.',
        isCorrect: false,
        feedback:
          'The primary lesson was the weakness of the national government — it couldn\'t help Massachusetts. It was the national government that was too weak, not the states that were too strong.',
      },
      {
        text: 'It demonstrated that the Continental Army was strong enough to defeat any rebellion without help.',
        isCorrect: false,
        feedback:
          'The Continental Army had been largely disbanded after the Revolution. There was no effective national military force to respond to the rebellion — that was part of the problem.',
      },
      {
        text: 'It showed that taxation was unnecessary because states could fund themselves through trade alone.',
        isCorrect: false,
        feedback:
          'Shays\' Rebellion was partly caused by economic hardship and inability to pay debts — it highlighted the need for stable economic governance, not the elimination of taxation.',
      },
    ],
  },
  // ── MODERATE / Level 1 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG15-004',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Under the Articles of Confederation, Congress could pass laws but had no power to enforce them. What practical problem did this create?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'States could simply ignore national laws they didn\'t like, leaving the national government powerless to ensure compliance.',
        isCorrect: true,
        feedback:
          'Correct! Without an executive branch to implement laws and a judiciary to enforce them, Congress could make rules that states simply chose to ignore.',
      },
      {
        text: 'The Supreme Court had to enforce all laws, creating a backlog of cases.',
        isCorrect: false,
        feedback:
          'There was no Supreme Court under the Articles of Confederation — the absence of a federal judiciary was itself a major structural weakness.',
      },
      {
        text: 'The president vetoed most laws that Congress tried to enforce.',
        isCorrect: false,
        feedback:
          'There was no president under the Articles. The lack of an executive branch was one of the most fundamental weaknesses of the Articles.',
      },
      {
        text: 'Citizens could appeal to British courts to avoid complying with American laws.',
        isCorrect: false,
        feedback:
          'Citizens did not appeal to British courts. The problem was purely structural — there was no executive to enforce laws and no federal courts to hear cases.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-005',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'In 1786, the national government needed funds to pay its war debts. Congress requested money from the states, but several refused to contribute. Which weakness of the Articles does this best illustrate?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    misconceptionCode: 'M-OPLG-01',
    options: [
      {
        text: 'Congress had no power to tax citizens directly and could not compel states to contribute money.',
        isCorrect: true,
        feedback:
          'Correct! This was the Articles\' fundamental financial weakness — Congress could request but not require. States that refused to pay suffered no consequences.',
      },
      {
        text: 'Congress lacked financial expertise to manage government money effectively.',
        isCorrect: false,
        feedback:
          'The problem was structural, not a matter of competence. Congress genuinely had no constitutional power to tax — that was the design flaw.',
      },
      {
        text: 'The states were too poor to contribute money to the national government.',
        isCorrect: false,
        feedback:
          'While some states faced hardship, others simply chose not to pay. The issue was structural authority — Congress couldn\'t compel payment regardless of a state\'s ability to pay.',
      },
      {
        text: 'Congress spent too much on unnecessary programs, creating avoidable debt.',
        isCorrect: false,
        feedback:
          'The debt was primarily from Revolutionary War expenses. The problem was the government\'s inability to raise revenue — not excessive spending.',
        misconceptionCode: 'M-OPLG-01',
      },
    ],
  },
  // ── MODERATE / Level 2 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG15-006',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'The Articles of Confederation created no executive branch. What was the most serious consequence of this structural gap?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'There was no single leader or institution responsible for implementing laws, negotiating treaties, or managing national affairs — creating dangerous inefficiency.',
        isCorrect: true,
        feedback:
          'Correct! Without an executive branch, Congress had to manage everything itself — but a committee of delegates cannot effectively run a government. Laws went unenforced, treaties went unimplemented.',
      },
      {
        text: 'Individual members of Congress had to personally enforce all laws, which was dangerous.',
        isCorrect: false,
        feedback:
          'Members of Congress didn\'t personally enforce laws — the issue was that no institution was responsible for implementation at all.',
      },
      {
        text: 'The lack of a president meant states had to elect their own governors to manage national affairs.',
        isCorrect: false,
        feedback:
          'State governors managed state affairs — they did not step in to manage national affairs. The absence of a national executive left a structural gap that no existing institution filled.',
      },
      {
        text: 'Without a president, Congress could not declare war or maintain an army.',
        isCorrect: false,
        feedback:
          'Congress could declare war under the Articles. The problem was that without an executive, there was no effective command structure or means to fund and supply military operations.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-007',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Why did Shays\' Rebellion particularly alarm leaders like Washington, Hamilton, and Madison — leading them to support a constitutional convention?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'It demonstrated that without a stronger national government, the United States could not protect itself from internal disorder — and might appear weak to foreign powers.',
        isCorrect: true,
        feedback:
          'Correct! The rebellion alarmed founders on multiple levels: it showed the national government couldn\'t handle domestic crises and signaled to European powers that America might be vulnerable.',
      },
      {
        text: 'It showed that the Massachusetts state government was too weak and needed to be replaced with national governance.',
        isCorrect: false,
        feedback:
          'Massachusetts actually did act to suppress the rebellion — with difficulty. The primary concern was the national government\'s inability to help, not state government weakness.',
      },
      {
        text: 'It convinced them that democracy was too dangerous and that America needed a strong monarch.',
        isCorrect: false,
        feedback:
          'The Constitutional Convention created a stronger republic, not a monarchy. The founders rejected monarchy despite Shays\' Rebellion.',
      },
      {
        text: 'It proved that American soldiers were prone to revolt, making a large permanent standing army necessary.',
        isCorrect: false,
        feedback:
          'The founders were concerned about disorder but also worried about a large standing army as a threat to liberty. The lesson was about governmental structure, not military size.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-008',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Under the Articles of Confederation, changing the rules required unanimous agreement from all 13 states. Why was this a critical weakness?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'Even one state\'s refusal to agree could block necessary changes, making the Articles almost impossible to reform even when most states recognized the problems.',
        isCorrect: true,
        feedback:
          'Correct! In practice, the unanimity requirement made the Articles unamendable. Rhode Island alone blocked several reform efforts, forcing leaders to abandon the Articles entirely rather than fix them.',
      },
      {
        text: 'It meant the constitution changed too often, creating instability.',
        isCorrect: false,
        feedback:
          'The opposite was true — the unanimity requirement made it nearly impossible to change the Articles, not too easy.',
      },
      {
        text: 'States were required to physically attend all congressional sessions to maintain veto power over amendments.',
        isCorrect: false,
        feedback:
          'All states had a veto by default. The issue was getting all 13 to agree on changes, not about physical attendance.',
      },
      {
        text: 'The president had to approve all changes, which the president always vetoed.',
        isCorrect: false,
        feedback:
          'There was no president under the Articles. The unanimity requirement meant all 13 states had to agree — there was no presidential veto.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-009',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'One fundamental problem with the Articles of Confederation was that it treated states as essentially independent sovereign powers. What negative consequence did this create?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'States competed economically with each other and could impose tariffs on goods crossing state borders, undermining national economic unity.',
        isCorrect: true,
        feedback:
          'Correct! Without national authority over interstate commerce, states acted like separate countries — taxing each other\'s goods and creating trade barriers that hurt the national economy.',
      },
      {
        text: 'States refused to participate in the national government, leaving Congress with few members.',
        isCorrect: false,
        feedback:
          'States did send delegates to Congress — the problem was the limits on what Congress could actually do to those states that didn\'t comply with national decisions.',
      },
      {
        text: 'Smaller states gained so much power that larger states left the union in protest.',
        isCorrect: false,
        feedback:
          'No states left the union under the Articles. Large states were concerned about equal-vote structure, but this didn\'t cause secession.',
      },
      {
        text: 'The national government became too strong because individual states couldn\'t limit its power.',
        isCorrect: false,
        feedback:
          'Under the Articles, the problem was the opposite — the national government was too weak precisely because states held most of the power and sovereignty.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-010',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Under the Articles of Confederation, there were no national courts. What practical problem did this absence create?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'There was no way to resolve disputes between states or enforce national laws consistently — each state\'s courts applied only that state\'s laws.',
        isCorrect: true,
        feedback:
          'Correct! Without federal courts, interstate disputes had no neutral arbiter, national laws had no enforcement mechanism, and legal standards varied wildly from state to state.',
      },
      {
        text: 'Citizens had no courts of any kind to resolve legal disputes.',
        isCorrect: false,
        feedback:
          'State courts still functioned under the Articles. The gap was specifically in national-level courts to resolve interstate disputes and enforce national law.',
      },
      {
        text: 'The king of England retained the right to appoint judges for American courts.',
        isCorrect: false,
        feedback:
          'After independence, British courts had no authority in America. The issue was the gap in national judicial authority, not continued British control.',
      },
      {
        text: 'Congress acted as both legislature and court, hearing all legal cases itself.',
        isCorrect: false,
        feedback:
          'Congress did not function as a court. The Articles simply provided no federal judicial branch — leaving a major structural gap.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-011',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Under the Articles, a merchant in New York had to pay different taxes every time his goods crossed into New Jersey, Pennsylvania, or Connecticut. How does this illustrate a weakness of the Articles of Confederation?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'The national government had no authority to regulate commerce between states, allowing states to undermine economic unity through conflicting trade policies.',
        isCorrect: true,
        feedback:
          'Correct! This is exactly the interstate commerce problem the Articles created. Congress could not regulate trade between states — they functioned like separate countries with separate tariffs.',
      },
      {
        text: 'The national government was collecting too much tax revenue from interstate trade.',
        isCorrect: false,
        feedback:
          'The national government had no authority to collect interstate trade taxes — it was the individual states collecting these tariffs.',
      },
      {
        text: 'Individual merchants had too much political power and were able to avoid paying taxes.',
        isCorrect: false,
        feedback:
          'Merchants had little political power to avoid these tariffs — they were subject to the tariff laws of every state they traded in.',
      },
      {
        text: 'The states were cooperating too well, creating a monopoly on trade that hurt consumers.',
        isCorrect: false,
        feedback:
          'The opposite was true — states were competing and imposing tariffs on each other, which was the problem.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-012',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Which statement best summarizes the fundamental structural weakness of the Articles of Confederation?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'It created a government that depended on voluntary cooperation from states rather than having the authority to act directly on citizens.',
        isCorrect: true,
        feedback:
          'Correct! The Articles created a government of governments — it could only work through state governments, not directly with citizens. When states didn\'t cooperate, the national government was helpless.',
      },
      {
        text: 'It gave too much power to the national government, threatening state independence.',
        isCorrect: false,
        feedback:
          'The Articles gave too little power to the national government — states retained almost all authority and sovereignty.',
      },
      {
        text: 'It created too many branches of government, leading to conflict and gridlock.',
        isCorrect: false,
        feedback:
          'The Articles created only one branch — Congress. The weakness was the opposite: too few branches, with no executive or judicial branch.',
      },
      {
        text: 'It allowed any single citizen to veto national laws, making effective governance impossible.',
        isCorrect: false,
        feedback:
          'Citizens had no direct veto over national laws. The structural problems were about state sovereignty and congressional authority, not individual citizen veto power.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG15-013',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'After Shays\' Rebellion, most leaders agreed the Articles had serious problems. Why did the Constitutional Convention ultimately decide to write a new constitution rather than amend the Articles?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    misconceptionCode: 'M-OPLG-01',
    options: [
      {
        text: 'Amending the Articles required unanimous consent from all 13 states, making significant reform practically impossible — so delegates chose to write a new document requiring only nine states to ratify.',
        isCorrect: true,
        feedback:
          'Correct! The unanimity requirement was itself the ultimate weakness of the Articles — it meant the Articles were self-protecting against the reforms they most needed.',
      },
      {
        text: 'The Articles were so popular with ordinary citizens that no state would vote to amend them.',
        isCorrect: false,
        feedback:
          'The Articles were not particularly popular — many citizens recognized their failures. The problem was the unanimous amendment requirement, not popular opposition to change.',
      },
      {
        text: 'The Constitutional Convention didn\'t have legal authority to amend the Articles — only to write new documents.',
        isCorrect: false,
        feedback:
          'The Convention actually exceeded its mandate by writing a new constitution — its original charge was only to revise the Articles. The delegates decided replacement was necessary.',
        misconceptionCode: 'M-OPLG-01',
      },
      {
        text: 'The Articles of Confederation had already been repealed by Congress before the Convention met.',
        isCorrect: false,
        feedback:
          'The Articles were still in effect when the Convention met in 1787 — they were replaced by the Constitution, not repealed before the Convention.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG15-014',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Historian Gordon Wood argues that the weakness of the Articles was intentional — founders deliberately created a weak national government because they feared tyranny more than weakness. How does this insight help explain the Constitutional Convention?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'When the Articles\' weakness created real crises like Shays\' Rebellion, founders had to accept that some balance between central authority and state sovereignty was necessary to prevent both tyranny and disorder.',
        isCorrect: true,
        feedback:
          'Correct! The Constitutional Convention was the founders\' correction: after seeing the consequences of making government too weak, they sought a new balance — strong enough to govern, limited enough not to tyrannize.',
      },
      {
        text: 'This insight shows the Constitutional Convention was a mistake because the Articles\' weak government was exactly what founders wanted.',
        isCorrect: false,
        feedback:
          'The Constitutional Convention was a direct response to the failure of the weak government. Founders recognized they had overcorrected in their fear of tyranny.',
      },
      {
        text: 'The intentional weakness of the Articles proves founders never intended to create a permanent national government.',
        isCorrect: false,
        feedback:
          'Founders intended to create a permanent government — they just made it too weak. The Constitution was the correction, not an abandonment of national government.',
      },
      {
        text: 'Because the Articles\' weakness was intentional, fixing them didn\'t require a convention — just better enforcement of existing powers.',
        isCorrect: false,
        feedback:
          'The problem was structural — Congress lacked powers that better enforcement couldn\'t provide. The Convention was necessary to create new governmental powers.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG15-015',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'A political scientist writes: "Shays\' Rebellion was the best thing that ever happened to James Madison." Evaluate this claim.',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'articles-weaknesses',
    remediationTag: 'remed-CG15-articles',
    options: [
      {
        text: 'The claim captures an important historical truth — the rebellion demonstrated the Articles\' failures so dramatically that it created the political will for a stronger constitution that Madison had been advocating.',
        isCorrect: true,
        feedback:
          'Correct! Madison had been pushing for constitutional reform for years. Shays\' Rebellion shocked skeptics and created the urgency needed to call a convention — turning Madison\'s minority position into a consensus.',
      },
      {
        text: 'The claim is false because Shays\' Rebellion strengthened support for the Articles by showing that state governments could handle crises without national help.',
        isCorrect: false,
        feedback:
          'Shays\' Rebellion showed the opposite — even Massachusetts struggled to suppress it, and the national government was completely unable to help.',
      },
      {
        text: 'The claim is false because Madison opposed a stronger national government and Shays\' Rebellion undermined his position.',
        isCorrect: false,
        feedback:
          'Madison was one of the strongest advocates for a stronger national government — he was a primary architect of both the Constitution and the Federalist Papers.',
      },
      {
        text: 'The claim is accurate only because Shays\' Rebellion gave Madison a personal economic motive to protect his property through stronger government.',
        isCorrect: false,
        feedback:
          'While economic interests played a role in founding-era politics, this interpretation is too narrow. The claim is best understood as political opportunity — the rebellion created conditions for the constitutional change Madison sought.',
      },
    ],
  },
]

// ── Old 1.6 bank (Constitutional Convention/ratification) — split item-level to 1.7 and 1.10 (ADR 0017) ──
// Skill tag: constitutional-convention  |  Remediation: remed-CG16-constitution

const SS7CG16: QuestionDef[] = [
  // ── LOW / Level 1 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG16-001',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt: 'What did the Great Compromise create at the Constitutional Convention?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'A bicameral Congress with equal state representation in the Senate and population-based representation in the House',
        isCorrect: true,
        feedback:
          'Correct! The Great Compromise blended the Virginia Plan (population-based House) and the New Jersey Plan (equal Senate) — giving both large and small states what they needed most.',
      },
      {
        text: 'An agreement that all states would keep slavery until the Constitution was fully ratified',
        isCorrect: false,
        feedback:
          'That was a separate compromise. The Great Compromise specifically resolved the representation dispute between large and small states in Congress.',
      },
      {
        text: 'A plan for the president to be elected directly by popular vote',
        isCorrect: false,
        feedback:
          'The Electoral College system addressed presidential election — not the Great Compromise, which resolved congressional representation.',
      },
      {
        text: 'A system where large states held more power in both houses of Congress',
        isCorrect: false,
        feedback:
          'The Great Compromise was designed to balance large and small states — the Senate gave equal representation specifically to protect small states.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-002',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt: 'What did the Three-Fifths Compromise determine at the Constitutional Convention?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'That enslaved people would count as three-fifths of a person for determining a state\'s representation in Congress and its share of direct taxes',
        isCorrect: true,
        feedback:
          'Correct! The Three-Fifths Compromise resolved the North-South dispute over whether enslaved people would count for representation — a morally troubling compromise that embedded slavery into the Constitution\'s structure.',
      },
      {
        text: 'That three-fifths of all states needed to approve the Constitution for it to take effect',
        isCorrect: false,
        feedback:
          'Ratification required nine of thirteen states — not three-fifths. The Three-Fifths Compromise was specifically about counting enslaved people for representation.',
      },
      {
        text: 'That three-fifths of Congress could override a presidential veto',
        isCorrect: false,
        feedback:
          'A two-thirds majority — not three-fifths — of both houses is required to override a veto. The Three-Fifths Compromise addressed representation, not veto overrides.',
      },
      {
        text: 'That three-fifths of states could amend the Constitution without a convention',
        isCorrect: false,
        feedback:
          'Amendments require three-fourths of states to ratify — not three-fifths. The Three-Fifths Compromise addressed counting enslaved people for congressional representation.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-003',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt: 'Anti-Federalists opposed ratification of the Constitution. What was their main concern?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'LOW',
    readingLoadLevel: 1,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'The Constitution created a federal government that was too powerful and threatened the rights of individual citizens and states.',
        isCorrect: true,
        feedback:
          'Correct! Anti-Federalists feared that a strong central government would eventually become tyrannical. They wanted stronger protections for states and a Bill of Rights.',
      },
      {
        text: 'The Constitution gave too much power to individual states at the expense of national unity.',
        isCorrect: false,
        feedback:
          'Anti-Federalists actually wanted more power for states — they were the ones who opposed the strong central government the Constitution created.',
        misconceptionCode: 'M-OPLG-12',
      },
      {
        text: 'The Constitution kept the same weak structure as the Articles of Confederation.',
        isCorrect: false,
        feedback:
          'Anti-Federalists opposed the Constitution because it was much stronger than the Articles — they feared it was too strong, not too weak.',
      },
      {
        text: 'The Constitution banned the practice of slavery, which Southern states opposed.',
        isCorrect: false,
        feedback:
          'The Constitution did not ban slavery — several provisions actually protected it. Anti-Federalists opposed the Constitution primarily because of its strong central government, not provisions about slavery.',
      },
    ],
  },
  // ── MODERATE / Level 1 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG16-004',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt:
      'Federalists supported ratification of the Constitution. Which argument did they most commonly make in its favor?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'A stronger national government was necessary to maintain order, manage the economy, and defend the nation effectively.',
        isCorrect: true,
        feedback:
          'Correct! Federalists argued the Articles had proven too weak. A stronger government — with taxing power, an executive, and a judiciary — was essential for national survival.',
      },
      {
        text: 'The Constitution perfectly balanced all interests and needed no further changes.',
        isCorrect: false,
        feedback:
          'Federalists acknowledged the Constitution wasn\'t perfect — their agreement to add a Bill of Rights was itself a recognition that improvements were needed.',
        misconceptionCode: 'M-OPLG-12',
      },
      {
        text: 'The Constitution would eliminate state governments, creating a more efficient unified nation.',
        isCorrect: false,
        feedback:
          'Federalists did not argue for eliminating state governments — they supported a federal system maintaining both state and national authority.',
      },
      {
        text: 'The Constitution would allow the United States to rejoin the British Empire on favorable terms.',
        isCorrect: false,
        feedback:
          'Federalists had no intention of rejoining the British Empire — they wanted a strong American nation capable of standing independent.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-005',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'At the Constitutional Convention, Virginia proposed population-based representation (Virginia Plan) while New Jersey proposed equal state representation (New Jersey Plan). A small state like Delaware would most likely prefer which plan, and why?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 1,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'The New Jersey Plan — because equal representation regardless of population would give small states the same voting power as large states.',
        isCorrect: true,
        feedback:
          'Correct! Small states feared being dominated by large, populous states. Equal representation in Congress regardless of population protected their interests.',
      },
      {
        text: 'The Virginia Plan — because more representatives would give small states greater influence.',
        isCorrect: false,
        feedback:
          'Population-based representation would actually give large states like Virginia far more influence. Small states would have fewer representatives under this plan.',
      },
      {
        text: 'The New Jersey Plan — because small states had larger populations than large states.',
        isCorrect: false,
        feedback:
          'Large states like Virginia and Pennsylvania had significantly larger populations. That\'s exactly why small states preferred equal representation — to overcome the population disadvantage.',
      },
      {
        text: 'The Virginia Plan — because it was already being used successfully under the Articles of Confederation.',
        isCorrect: false,
        feedback:
          'The Articles gave each state one vote (equal representation) — the Virginia Plan proposed a new, population-based approach that small states opposed.',
      },
    ],
  },
  // ── MODERATE / Level 2 ───────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG16-006',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'The Constitution was designed to address specific weaknesses of the Articles. Which correctly identifies a weakness and how the Constitution fixed it?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-01',
    options: [
      {
        text: 'Weakness: Congress couldn\'t tax citizens directly. Fix: The Constitution gave Congress the power to levy and collect taxes.',
        isCorrect: true,
        feedback:
          'Correct! Article I, Section 8 of the Constitution specifically grants Congress the power to "lay and collect Taxes" — directly fixing the Articles\' most critical financial weakness.',
      },
      {
        text: 'Weakness: The president had too much power under the Articles. Fix: The Constitution limited presidential authority.',
        isCorrect: false,
        feedback:
          'There was no president under the Articles. The Constitution created the executive branch — it didn\'t limit an existing presidency.',
        misconceptionCode: 'M-OPLG-01',
      },
      {
        text: 'Weakness: The Supreme Court kept overturning laws. Fix: The Constitution limited the Court\'s power.',
        isCorrect: false,
        feedback:
          'There was no Supreme Court under the Articles. The Constitution created the judicial branch, including the Supreme Court.',
      },
      {
        text: 'Weakness: States had too little power under the Articles. Fix: The Constitution gave states more authority.',
        isCorrect: false,
        feedback:
          'The Articles gave states too much power — the Constitution shifted some authority to the national government to address the resulting chaos.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-007',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Under the Great Compromise, the Senate and House of Representatives were designed differently. What was the specific difference, and what problem did it solve?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'All states have two senators (protecting small states), while the House has representation based on population (protecting large states).',
        isCorrect: true,
        feedback:
          'Correct! The two-chamber design was the compromise: the Senate gave equal representation to small states, while the House gave proportional representation to large states.',
      },
      {
        text: 'The Senate represents the national population, while the House represents state governments.',
        isCorrect: false,
        feedback:
          'These are reversed — the House is based on population (representing citizens), while the Senate gives equal representation to states regardless of population.',
      },
      {
        text: 'Large states have more senators, while small states have more House representatives.',
        isCorrect: false,
        feedback:
          'All states have exactly two senators — equal Senate representation was the concession to small states, not more senators for large states.',
      },
      {
        text: 'The Senate can override the House, giving smaller states final say on all legislation.',
        isCorrect: false,
        feedback:
          'Neither house can override the other — both must pass the same bill. The two-chamber requirement means both large and small state interests must be satisfied.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-008',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt:
      'Why was a Bill of Rights added to the Constitution after ratification?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'Anti-Federalists feared the new national government might abuse its powers and insisted that specific protections for individual rights be added.',
        isCorrect: true,
        feedback:
          'Correct! Several key states made ratification conditional on a promise to add a Bill of Rights. James Madison shepherded the first ten amendments through Congress in 1789, and they were ratified in 1791.',
      },
      {
        text: 'The original Constitution was missing a declaration of independence, so the Bill of Rights was added to replace it.',
        isCorrect: false,
        feedback:
          'The Bill of Rights protects individual liberties from government interference — it is not a declaration of independence or a replacement for the Declaration.',
      },
      {
        text: 'Federalists included the Bill of Rights to give the national government additional powers over citizens.',
        isCorrect: false,
        feedback:
          'The Bill of Rights limits government power — it doesn\'t expand it. Federalists were actually reluctant to add a Bill of Rights, arguing the Constitution already sufficiently limited government.',
        misconceptionCode: 'M-OPLG-12',
      },
      {
        text: 'The Bill of Rights was required by the Articles of Confederation as a condition for replacing them.',
        isCorrect: false,
        feedback:
          'The Articles made no such requirement. The Bill of Rights was a political compromise to secure Anti-Federalist support for ratification of the new Constitution.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-009',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt:
      'Which of the following correctly pairs a concern with the group that held it during the ratification debate?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'Anti-Federalists worried the Constitution gave the federal government too much power and lacked a Bill of Rights.',
        isCorrect: true,
        feedback:
          'Correct! Anti-Federalists\' two main objections were the strength of the central government and the absence of explicit individual rights protections.',
      },
      {
        text: 'Federalists worried that the Constitution created a government too weak to handle national problems.',
        isCorrect: false,
        feedback:
          'Federalists supported the Constitution because it created a stronger government they believed was necessary. Concerns about weakness were the Anti-Federalists\' argument against the Articles, not Federalists\' argument against the Constitution.',
        misconceptionCode: 'M-OPLG-12',
      },
      {
        text: 'Anti-Federalists worried the Constitution didn\'t give the president enough military authority.',
        isCorrect: false,
        feedback:
          'Anti-Federalists worried the president would have too much military authority — they feared tyranny, not insufficient presidential power.',
      },
      {
        text: 'Federalists demanded that specific states\' rights be listed to prevent federal overreach.',
        isCorrect: false,
        feedback:
          'It was Anti-Federalists who demanded explicit protections. Federalists argued listing specific rights was unnecessary and potentially dangerous — unlisted rights might be seen as unprotected.',
        misconceptionCode: 'M-OPLG-12',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-010',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt: 'How was the Constitution officially ratified (approved)?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'State ratifying conventions in nine of the thirteen states had to vote to approve it — by 1788, nine states had ratified, making it officially in effect.',
        isCorrect: true,
        feedback:
          'Correct! The Constitution required nine states to ratify — a deliberate change from the Articles\' unanimity requirement. Delaware was first (December 1787) and New Hampshire was the decisive ninth state (June 1788).',
      },
      {
        text: 'All thirteen states had to unanimously approve it, as required under the Articles of Confederation.',
        isCorrect: false,
        feedback:
          'Unanimous approval was the Articles\' requirement. The Constitution changed this to nine states — itself a departure from the Articles that made ratification achievable.',
      },
      {
        text: 'Congress voted to approve the Constitution and it automatically became law.',
        isCorrect: false,
        feedback:
          'Congress didn\'t ratify the Constitution — state ratifying conventions did. This was deliberate: by going to the people through conventions, the founders bypassed the existing government.',
      },
      {
        text: 'Constitutional Convention delegates signed it, and it took effect immediately upon their signatures.',
        isCorrect: false,
        feedback:
          'Signing by delegates was only the first step. The Constitution needed to be ratified by state conventions — a separate process — before it could take effect.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-011',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt:
      'During ratification, Anti-Federalists in Virginia argued they could not support the Constitution without assurance that individual rights would be protected. Federalists promised to add amendments after ratification. What does this exchange reveal about the founding era?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'Achieving constitutional change required compromise — Anti-Federalists gave up some objections in exchange for a promise that became the Bill of Rights.',
        isCorrect: true,
        feedback:
          'Correct! This exchange shows the founders\' political skill: Federalists secured ratification by promising a Bill of Rights, and Anti-Federalists got the protections they demanded — just after ratification rather than before.',
      },
      {
        text: 'Federalists and Anti-Federalists had no real disagreements — the ratification debate was just political theater.',
        isCorrect: false,
        feedback:
          'The debate was substantive and consequential. It shaped not only ratification but the addition of the Bill of Rights — one of the most important components of the American constitutional system.',
        misconceptionCode: 'M-OPLG-12',
      },
      {
        text: 'Anti-Federalists ultimately agreed that the federal government should have unlimited power as long as rights were listed.',
        isCorrect: false,
        feedback:
          'Anti-Federalists did not agree to unlimited federal power. The Bill of Rights was meant to limit federal power — that was the entire point.',
      },
      {
        text: 'The promise of a Bill of Rights was never fulfilled, leaving Anti-Federalists without the protections they sought.',
        isCorrect: false,
        feedback:
          'The first ten amendments — the Bill of Rights — were ratified in 1791, just two years after the Constitution took effect. The promise was kept.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-012',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'The Constitution created an executive branch led by the President. How did this directly address a weakness of the Articles of Confederation?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'MODERATE',
    readingLoadLevel: 2,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'Under the Articles, no institution could implement or enforce national decisions — the President and executive branch gave the national government the capacity to act on its own laws.',
        isCorrect: true,
        feedback:
          'Correct! The executive branch filled the most critical gap in the Articles — without someone responsible for implementation, even good laws were meaningless.',
      },
      {
        text: 'Under the Articles, the president had too little power — the Constitution gave the new president more authority to override Congress.',
        isCorrect: false,
        feedback:
          'There was no president under the Articles. The Constitution created the executive branch from scratch — and also created checks on presidential power from the start.',
      },
      {
        text: 'The executive branch was created because state governors refused to cooperate with Congress under the Articles.',
        isCorrect: false,
        feedback:
          'While state governors often resisted national authority, the executive branch was created to give the national government its own implementation capacity — not to force cooperation from governors.',
      },
      {
        text: 'The Articles gave the president unlimited power, which the Constitution reduced by creating the executive branch.',
        isCorrect: false,
        feedback:
          'There was no president under the Articles at all. The Constitution created the presidency and balanced its power from the beginning through checks and balances.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG16-013',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'A historian writes that the Constitution is "a bundle of compromises." Which specific compromises at the Convention best support this description?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'The Great Compromise balanced large and small states\' interests in Congress; the Three-Fifths Compromise addressed North-South differences over slavery and representation.',
        isCorrect: true,
        feedback:
          'Correct! These two compromises were the most critical. Without the Great Compromise, the Convention would have collapsed over representation; without the Three-Fifths Compromise, Southern states would have rejected the Constitution.',
      },
      {
        text: 'The Constitution required no significant compromises because all delegates agreed on major principles.',
        isCorrect: false,
        feedback:
          'Major disagreements at the Convention made compromise essential. Delegates strongly disagreed about representation, slavery, and the extent of federal power.',
        misconceptionCode: 'M-OPLG-12',
      },
      {
        text: 'The only major compromise was the Bill of Rights, which balanced Federalist and Anti-Federalist views.',
        isCorrect: false,
        feedback:
          'The Bill of Rights was a post-ratification compromise. The Convention itself produced multiple major compromises including the Great Compromise and Three-Fifths Compromise.',
      },
      {
        text: 'The Constitution represents only Federalist views — Anti-Federalists walked out of the Convention.',
        isCorrect: false,
        feedback:
          'Anti-Federalists did not walk out as a group — some delegates (like George Mason) refused to sign, but delegates worked through significant compromises to produce the document.',
      },
    ],
  },
  // ── HIGH / Level 3 ────────────────────────────────────────────────────────
  {
    externalKey: 'q-SS7CG16-014',
    benchmarkCode: 'SS.7.CG.1.7',
    prompt:
      'Political scientists argue that the Great Compromise was the single most important decision at the Constitutional Convention. What is the strongest reasoning behind this claim?',
    itemType: 'MULTIPLE_CHOICE',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    options: [
      {
        text: 'Without resolving the representation dispute between large and small states, the Convention would have collapsed — making the entire Constitution and the United States as a unified nation impossible.',
        isCorrect: true,
        feedback:
          'Correct! The representation dispute was the existential threat to the Convention. When it was resolved on July 16, 1787, delegates could tackle all other issues. Without it, there would have been no Constitution to write.',
      },
      {
        text: 'The Great Compromise was most important because it resolved the slavery question, the most divisive issue of the era.',
        isCorrect: false,
        feedback:
          'The Great Compromise addressed representation. Slavery was addressed separately through the Three-Fifths Compromise and slave trade provisions. While slavery was profoundly divisive, the representation dispute specifically threatened to break up the Convention.',
      },
      {
        text: 'The Great Compromise was most important because it gave the president the powers needed to lead the nation effectively.',
        isCorrect: false,
        feedback:
          'The Great Compromise addressed congressional structure, not presidential powers. Presidential authority was defined separately in Article II.',
      },
      {
        text: 'The Great Compromise mattered most because it eliminated all Anti-Federalist opposition to the Constitution.',
        isCorrect: false,
        feedback:
          'Anti-Federalist opposition continued after the Great Compromise — they were primarily concerned about federal power and the lack of a Bill of Rights, not the specific structure of Congress.',
      },
    ],
  },
  {
    externalKey: 'q-SS7CG16-015',
    benchmarkCode: 'SS.7.CG.1.10',
    prompt:
      'A modern analyst argues: "We can still see the Federalist-Anti-Federalist debate playing out in American politics today." Which example best supports this claim?',
    itemType: 'SCENARIO_MC',
    cognitiveComplexity: 'HIGH',
    readingLoadLevel: 3,
    skillTag: 'constitutional-convention',
    remediationTag: 'remed-CG16-constitution',
    misconceptionCode: 'M-OPLG-12',
    options: [
      {
        text: 'Debates about the balance of power between the federal government and state governments continue to reflect the founding-era tension between Federalist support for strong national government and Anti-Federalist support for state authority.',
        isCorrect: true,
        feedback:
          'Correct! Modern debates about federal vs. state authority over issues like education, healthcare, and law enforcement echo the same fundamental tension that divided Federalists and Anti-Federalists in 1787.',
      },
      {
        text: 'The Federalist Party and Anti-Federalist Party still compete in elections today with the same platforms they had in the founding era.',
        isCorrect: false,
        feedback:
          'The Federalist Party dissolved in the early 1800s. There is no modern party with the same name or platform. The modern connection is through the ongoing debate about federal vs. state power.',
      },
      {
        text: 'The Federalist Papers are read aloud in Congress daily to guide legislative decisions.',
        isCorrect: false,
        feedback:
          'While the Federalist Papers are cited in constitutional debates, they are not read daily in Congress. The modern connection is through substantive policy debates, not ceremonial readings.',
      },
      {
        text: 'Anti-Federalist ideas were completely defeated at ratification, so there is no modern counterpart.',
        isCorrect: false,
        feedback:
          'Anti-Federalist ideas about state power and limited federal government continue to influence American political debate. They weren\'t defeated — they were incorporated into the ongoing constitutional conversation.',
        misconceptionCode: 'M-OPLG-12',
      },
    ],
  },
]

// ── Combined question pool ────────────────────────────────────────────────────

const ALL_QUESTIONS: QuestionDef[] = [
  ...SS7CG11,
  ...SS7CG12,
  ...SS7CG13,
  ...SS7CG14,
  ...SS7CG15,
  ...SS7CG16,
]

// ── Seed function ─────────────────────────────────────────────────────────────

export async function seedSampleQuestions(prisma: PrismaClient): Promise<void> {
  // ── Look up benchmarks by code ─────────────────────────────────────────
  const benchmarks = await prisma.benchmark.findMany({ select: { id: true, code: true } })
  const bmMap = new Map(benchmarks.map((b) => [b.code, b.id]))

  // ── Look up the Origins reporting category ─────────────────────────────
  const originsCategory = await prisma.reportingCategory.findUnique({
    where: { name: REPORTING_CATEGORY_NAMES.ORIGINS },
  })
  if (!originsCategory) {
    throw new Error('Origins reporting category not found — run seedReportingCategories first.')
  }

  // ── Look up misconceptions by code ─────────────────────────────────────
  const misconceptions = await prisma.misconception.findMany({ select: { id: true, code: true } })
  const mcMap = new Map(misconceptions.map((m) => [m.code, m.id]))

  // ── Upsert questions and recreate options ──────────────────────────────
  let upsertedCount = 0
  for (const q of ALL_QUESTIONS) {
    const benchmarkId = bmMap.get(q.benchmarkCode)
    if (!benchmarkId) {
      throw new Error(`Benchmark not found: "${q.benchmarkCode}" — run seedBenchmarks first.`)
    }

    const misconceptionId = q.misconceptionCode ? (mcMap.get(q.misconceptionCode) ?? null) : null

    const question = await prisma.question.upsert({
      where: { externalKey: q.externalKey },
      create: {
        externalKey: q.externalKey,
        benchmarkId,
        reportingCategoryId: originsCategory.id,
        prompt: q.prompt,
        itemType: q.itemType,
        cognitiveComplexity: q.cognitiveComplexity,
        readingLoadLevel: q.readingLoadLevel,
        skillTag: q.skillTag,
        remediationTag: q.remediationTag,
        misconceptionId,
        approvalStatus: 'APPROVED',
        sourceTier: 'B',
        active: true,
      },
      update: {
        // benchmarkId included so def-level code reassignments (ADR 0017 —
        // e.g. the old-1.6 bank's item-level split to 1.7/1.10) move existing
        // rows on re-seed instead of silently leaving them behind.
        benchmarkId,
        reportingCategoryId: originsCategory.id,
        prompt: q.prompt,
        itemType: q.itemType,
        cognitiveComplexity: q.cognitiveComplexity,
        readingLoadLevel: q.readingLoadLevel,
        skillTag: q.skillTag,
        remediationTag: q.remediationTag,
        misconceptionId,
      },
    })

    // Delete old options and recreate — options have no stable unique key
    await prisma.questionOption.deleteMany({ where: { questionId: question.id } })

    for (const opt of q.options) {
      const optMiscId = opt.misconceptionCode ? (mcMap.get(opt.misconceptionCode) ?? null) : null
      await prisma.questionOption.create({
        data: {
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.isCorrect,
          feedback: opt.feedback,
          misconceptionId: optMiscId,
        },
      })
    }

    upsertedCount++
  }

  console.log(`  ✓ Sample questions seeded (${upsertedCount} questions, ${upsertedCount * 4} options)`)
}
