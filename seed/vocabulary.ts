/**
 * Seed: Vocabulary Tier List
 *
 * Tier 2: Academic verbs and function words essential for reading EOC items.
 * Tier 3: Civics content vocabulary, organized by reporting category.
 * Source: spec Appendix F.
 * Idempotent: upsert by (benchmarkId, term) — terms without a benchmark use benchmarkId=null.
 */

import { PrismaClient } from '@prisma/client'

interface TermDef {
  term: string
  definition: string
  tier: 'TIER_2' | 'TIER_3'
  benchmarkCode?: string // if null, term applies across benchmarks
  relatedVocab?: string
}

// ── Tier 2: Academic Verbs ─────────────────────────────────────────────────

const TIER_2_VERBS: TermDef[] = [
  { term: 'analyze', definition: 'To examine something in detail to understand it or explain it.', tier: 'TIER_2', relatedVocab: 'evaluate, examine, assess' },
  { term: 'evaluate', definition: 'To make a judgment about the value, quality, or importance of something.', tier: 'TIER_2', relatedVocab: 'assess, judge, analyze' },
  { term: 'infer', definition: 'To reach a conclusion based on evidence and reasoning rather than direct statement.', tier: 'TIER_2', relatedVocab: 'conclude, deduce, determine' },
  { term: 'interpret', definition: 'To explain the meaning of information, an event, or a text.', tier: 'TIER_2', relatedVocab: 'analyze, explain, clarify' },
  { term: 'classify', definition: 'To arrange or organize into groups based on shared characteristics.', tier: 'TIER_2', relatedVocab: 'categorize, sort, group' },
  { term: 'illustrate', definition: 'To show or explain something by giving examples or using a diagram.', tier: 'TIER_2', relatedVocab: 'demonstrate, show, explain' },
  { term: 'summarize', definition: 'To give a brief statement of the main points of something.', tier: 'TIER_2', relatedVocab: 'condense, outline, describe' },
  { term: 'justify', definition: 'To give reasons or evidence to support a decision, action, or statement.', tier: 'TIER_2', relatedVocab: 'support, defend, explain' },
  { term: 'compare', definition: 'To examine the similarities and differences between two or more things.', tier: 'TIER_2', relatedVocab: 'contrast, distinguish, differentiate' },
  { term: 'contrast', definition: 'To highlight the differences between two or more things.', tier: 'TIER_2', relatedVocab: 'compare, distinguish, differentiate' },
  { term: 'distinguish', definition: 'To recognize or point out the difference between two or more things.', tier: 'TIER_2', relatedVocab: 'differentiate, compare, contrast' },
  { term: 'sequence', definition: 'To arrange events or ideas in the order in which they occurred or should occur.', tier: 'TIER_2', relatedVocab: 'order, arrange, organize' },
  { term: 'identify', definition: 'To recognize or name something specifically.', tier: 'TIER_2', relatedVocab: 'recognize, name, describe' },
  { term: 'determine', definition: 'To decide or conclude after reasoning or investigation.', tier: 'TIER_2', relatedVocab: 'conclude, identify, establish' },
  { term: 'explain', definition: 'To make something clear or easy to understand by describing or giving reasons.', tier: 'TIER_2', relatedVocab: 'describe, clarify, justify' },
  { term: 'describe', definition: 'To give an account of the qualities, features, or characteristics of something.', tier: 'TIER_2', relatedVocab: 'explain, characterize, illustrate' },
  { term: 'examine', definition: 'To inspect or study something carefully and in detail.', tier: 'TIER_2', relatedVocab: 'analyze, investigate, assess' },
  { term: 'conclude', definition: 'To reach a judgment or decision based on evidence and reasoning.', tier: 'TIER_2', relatedVocab: 'determine, infer, deduce' },
  { term: 'assess', definition: 'To evaluate or estimate the nature, quality, or importance of something.', tier: 'TIER_2', relatedVocab: 'evaluate, judge, analyze' },
  { term: 'characterize', definition: "To describe the qualities or features that make something what it is.", tier: 'TIER_2', relatedVocab: 'describe, define, identify' },
]

const TIER_2_FUNCTION_WORDS: TermDef[] = [
  { term: 'according to', definition: 'Based on what is stated in a source or document.', tier: 'TIER_2' },
  { term: 'based on', definition: 'Using something as a foundation or reason for a conclusion.', tier: 'TIER_2' },
  { term: 'primarily', definition: 'For the most part; mainly; chiefly.', tier: 'TIER_2' },
  { term: 'most likely', definition: 'With the greatest probability; probably.', tier: 'TIER_2' },
  { term: 'best supports', definition: 'Provides the strongest or most relevant evidence for.', tier: 'TIER_2' },
  { term: 'except', definition: 'Not including; other than.', tier: 'TIER_2' },
  { term: 'both', definition: 'Used to indicate two things being considered together.', tier: 'TIER_2' },
  { term: 'contradicts', definition: 'Opposes or disagrees with; says the opposite of.', tier: 'TIER_2' },
  { term: 'results in', definition: 'Causes or leads to a particular outcome.', tier: 'TIER_2' },
  { term: 'prior to', definition: 'Before something else in time or order.', tier: 'TIER_2' },
  { term: 'as a consequence', definition: 'As a result; because of something that happened.', tier: 'TIER_2' },
  { term: 'despite', definition: 'Without being affected by; in spite of.', tier: 'TIER_2' },
]

// ── Tier 3: Civics Content Vocabulary ─────────────────────────────────────

const TIER_3_ORIGINS: TermDef[] = [
  { term: 'republic', definition: 'A form of government in which citizens elect representatives to govern on their behalf.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'democracy', definition: 'A system of government in which power is held by the people, either directly or through elected representatives.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'natural rights', definition: 'Rights that all people are born with, not granted by government; according to Locke: life, liberty, and property.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'social contract', definition: 'The idea that people give up some freedoms to a government in exchange for protection of their remaining rights.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'rule of law', definition: 'The principle that all people and institutions, including the government, must follow the law.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'popular sovereignty', definition: 'The idea that political authority belongs to the people, who grant it to the government.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'consent of the governed', definition: 'The principle that a government derives its legitimacy from the agreement and approval of the people it governs.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'Enlightenment', definition: 'An 18th-century intellectual movement emphasizing reason, individual rights, and limited government, which influenced the American founding.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'Magna Carta', definition: 'A 1215 English document that limited the power of the king and established certain rights; an early influence on American democracy.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'English Bill of Rights', definition: 'A 1689 English law that limited royal power and guaranteed certain rights to Parliament and citizens; influenced American founders.', tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'Mayflower Compact', definition: "A 1620 agreement among Pilgrims to create a self-governing community; an early example of self-governance in America.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.2' },
  { term: 'Declaration of Independence', definition: "The 1776 document declaring the colonies' independence from Britain and stating founding principles of natural rights and consent of the governed.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.4' },
  { term: 'Articles of Confederation', definition: "The first plan of government for the United States (1781–1789); had significant weaknesses including no power to tax or enforce laws.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.5' },
  { term: 'Constitution', definition: "The supreme law of the United States, establishing the structure of government and protecting individual rights.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.6' },
  { term: 'Preamble', definition: "The introductory statement of the U.S. Constitution beginning with 'We the People' that states the purposes of the document.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.6' },
  { term: 'ratification', definition: "The process of formally approving a document or agreement, such as a treaty or constitutional amendment.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.6' },
  { term: 'grievance', definition: "A formal complaint; the Declaration of Independence lists specific grievances against the British king.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.4' },
  { term: 'principle', definition: "A fundamental truth or rule that guides thinking or action.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.4' },
  { term: 'monarchy', definition: "A form of government in which a single ruler (king or queen) holds supreme power, often hereditary.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
  { term: 'oligarchy', definition: "A form of government in which a small group of people hold all power.", tier: 'TIER_3', benchmarkCode: 'SS.7.CG.1.1' },
]

const TIER_3_CITIZENS: TermDef[] = [
  { term: 'citizen', definition: "A person who legally belongs to a country and has rights and responsibilities within it.", tier: 'TIER_3' },
  { term: 'naturalization', definition: "The legal process by which a non-citizen becomes a citizen of a country.", tier: 'TIER_3' },
  { term: 'civic responsibility', definition: "A voluntary action that citizens take to benefit their community or country, such as voting or volunteering.", tier: 'TIER_3' },
  { term: 'civic obligation', definition: "A required duty of citizens that is enforced by law, such as paying taxes or serving on a jury.", tier: 'TIER_3' },
  { term: 'due process', definition: "The principle that the government must follow established legal procedures before depriving a person of life, liberty, or property.", tier: 'TIER_3' },
  { term: 'Bill of Rights', definition: "The first ten amendments to the U.S. Constitution, which protect individual freedoms from government interference.", tier: 'TIER_3' },
  { term: 'suffrage', definition: "The right to vote in political elections.", tier: 'TIER_3' },
  { term: 'double jeopardy', definition: "The legal protection that prevents a person from being tried twice for the same crime after being acquitted.", tier: 'TIER_3' },
  { term: 'search and seizure', definition: "The 4th Amendment protection requiring law enforcement to have a warrant or valid exception to search a person or property.", tier: 'TIER_3' },
]

const TIER_3_POLICIES: TermDef[] = [
  { term: 'public policy', definition: "A course of action or set of rules created by the government to address a public issue or problem.", tier: 'TIER_3' },
  { term: 'political party', definition: "An organization of people with shared political beliefs that works to elect candidates and influence government policy.", tier: 'TIER_3' },
  { term: 'interest group', definition: "An organization that tries to influence government policy on behalf of a particular cause or group of people.", tier: 'TIER_3' },
  { term: 'lobbying', definition: "The act of trying to persuade government officials to support particular legislation or policies; a legal form of political advocacy.", tier: 'TIER_3' },
  { term: 'propaganda', definition: "Information, often misleading or biased, used to promote a particular political cause or point of view.", tier: 'TIER_3' },
  { term: 'bias', definition: "An unfair preference for or against something; in media, presenting information in a way that favors one viewpoint.", tier: 'TIER_3' },
  { term: 'civic engagement', definition: "Active participation in the life of one's community and in the political process, including voting, volunteering, and advocacy.", tier: 'TIER_3' },
  { term: 'primary election', definition: "An election held within a political party to choose its candidate for a general election.", tier: 'TIER_3' },
  { term: 'general election', definition: "An election in which all eligible voters choose among candidates from different parties for a public office.", tier: 'TIER_3' },
  { term: 'electoral college', definition: "The system established by the Constitution in which electors from each state formally elect the President and Vice President.", tier: 'TIER_3' },
]

const TIER_3_ORGANIZATION: TermDef[] = [
  { term: 'federalism', definition: "A system of government that divides power between a national government and state governments.", tier: 'TIER_3' },
  { term: 'separation of powers', definition: "The division of government authority among three branches (legislative, executive, judicial) to prevent any one branch from having too much power.", tier: 'TIER_3' },
  { term: 'checks and balances', definition: "A system in which each branch of government has the ability to limit the power of the other branches.", tier: 'TIER_3' },
  { term: 'bicameral', definition: "Having two legislative chambers or houses; the U.S. Congress is bicameral (Senate and House of Representatives).", tier: 'TIER_3' },
  { term: 'veto', definition: "The power of the President to reject a bill passed by Congress, preventing it from becoming law.", tier: 'TIER_3' },
  { term: 'override', definition: "The ability of Congress to pass a bill into law despite a presidential veto, requiring a two-thirds vote in both chambers.", tier: 'TIER_3' },
  { term: 'impeach', definition: "To formally charge a government official with misconduct while in office; the House of Representatives has the power to impeach.", tier: 'TIER_3' },
  { term: 'judicial review', definition: "The power of courts, especially the Supreme Court, to determine whether a law or government action violates the Constitution.", tier: 'TIER_3' },
  { term: 'appellate court', definition: "A court that reviews decisions made by lower courts; does not hold new trials but examines whether legal errors were made.", tier: 'TIER_3' },
  { term: 'delegated powers', definition: "Powers specifically granted to the federal government by the Constitution (e.g., coining money, declaring war).", tier: 'TIER_3' },
  { term: 'reserved powers', definition: "Powers not granted to the federal government by the Constitution, which are kept by the states (10th Amendment).", tier: 'TIER_3' },
  { term: 'concurrent powers', definition: "Powers shared by both the federal and state governments (e.g., taxing, building roads).", tier: 'TIER_3' },
  { term: 'amendment', definition: "A formal change or addition to the Constitution.", tier: 'TIER_3' },
  { term: 'supremacy clause', definition: "The constitutional provision that makes the U.S. Constitution and federal laws the supreme law of the land.", tier: 'TIER_3' },
]

const ALL_TERMS: TermDef[] = [
  ...TIER_2_VERBS,
  ...TIER_2_FUNCTION_WORDS,
  ...TIER_3_ORIGINS,
  ...TIER_3_CITIZENS,
  ...TIER_3_POLICIES,
  ...TIER_3_ORGANIZATION,
]

export async function seedVocabulary(prisma: PrismaClient): Promise<void> {
  // Build a map of benchmark code → id
  const benchmarks = await prisma.benchmark.findMany({ select: { id: true, code: true } })
  const bmMap = new Map(benchmarks.map((b) => [b.code, b.id]))

  for (const t of ALL_TERMS) {
    const benchmarkId = t.benchmarkCode ? bmMap.get(t.benchmarkCode) ?? null : null

    // Upsert key: unique combination of tier + term + benchmarkId
    // Since there's no composite unique, we check existence first
    const existing = await prisma.term.findFirst({
      where: { term: t.term, tier: t.tier, benchmarkId: benchmarkId ?? undefined },
    })

    if (!existing) {
      await prisma.term.create({
        data: {
          term: t.term,
          definition: t.definition,
          tier: t.tier,
          benchmarkId: benchmarkId ?? null,
          relatedVocab: t.relatedVocab ?? null,
          approvalStatus: 'APPROVED',
        },
      })
    } else {
      await prisma.term.update({
        where: { id: existing.id },
        data: {
          definition: t.definition,
          relatedVocab: t.relatedVocab ?? null,
        },
      })
    }
  }

  console.log(`  ✓ Vocabulary seeded (${ALL_TERMS.length} terms)`)
}
