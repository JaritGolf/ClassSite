/**
 * Seed: Unit 1 Backfill — bring SS.7.CG.1.1–1.6 from 15 → 30 questions each.
 *
 * Phase 15. The original 15/benchmark (seed/sample_questions_unit_1.ts) are Tier B /
 * APPROVED. These +15/benchmark are AI-drafted → sourceTier C / approvalStatus
 * NEEDS_REVIEW (owner approves later). Each backfill set is authored to COMPLEMENT
 * the existing 15 so the combined 30 hit the §13.2 / §7.4 targets:
 *   existing 15  : reading 5/7/3 · complexity 3/9/3
 *   backfill 15  : reading 4/8/3 · complexity 3/8/4   ← this file
 *   combined 30  : reading 9/15/6 (30/50/20) · complexity 6/17/7 (within §7.4 bands)
 *
 * Per-benchmark backfill §13.2 categories: vocab 1 · basic 1 · scenario 4 · source 3 ·
 * chart 2 · misconception 2 · eoc 2 (= 15), weighted toward the richer EOC categories
 * the original set under-covers. externalKeys continue the sequence (016–030).
 * Source/chart content is embedded inline. Skill/remediation tags match the originals.
 */

import type { PrismaClient } from '@prisma/client'
import { seedQuestionDefs, type QuestionSeedDef } from './_seeder'

// ── SS.7.CG.1.1 — Enlightenment and European Influences ──────────────────────
const SS7CG11: QuestionSeedDef[] = [
  { externalKey: 'q-SS7CG11-016', benchmarkCode: 'SS.7.CG.1.1', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'What is "popular sovereignty"?', options: [
      { text: 'The idea that government power comes from the people', isCorrect: true, feedback: 'Correct! Popular sovereignty means the people are the source of government power.' },
      { text: 'A popular ruler chosen by a king', isCorrect: false, feedback: 'Sovereignty here means the source of authority — the people, not a king.', misconceptionCode: 'M-OPLG-06' },
      { text: 'The right to own property', isCorrect: false, feedback: 'That is a natural right, not popular sovereignty.' },
      { text: 'Rule by the wealthiest citizens', isCorrect: false, feedback: 'Popular sovereignty means power from all the people, not just the wealthy.' },
    ] },
  { externalKey: 'q-SS7CG11-017', benchmarkCode: 'SS.7.CG.1.1', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'Which Enlightenment thinker is best known for the idea of separation of powers?', options: [
      { text: 'Montesquieu', isCorrect: true, feedback: 'Correct! Montesquieu argued for dividing government into separate branches.' },
      { text: 'John Locke', isCorrect: false, feedback: 'Locke is known for natural rights and social contract, not separation of powers.' },
      { text: 'King George III', isCorrect: false, feedback: 'King George III was a British monarch, not an Enlightenment thinker.' },
      { text: 'Thomas Jefferson', isCorrect: false, feedback: 'Jefferson applied Enlightenment ideas but separation of powers is Montesquieu\'s.' },
    ] },
  { externalKey: 'q-SS7CG11-018', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A government agrees to protect people\'s rights, and in return the people agree to follow its laws. Which Enlightenment idea does this BEST show?', options: [
      { text: 'The social contract', isCorrect: true, feedback: 'Correct! The social contract is an agreement between people and government.' },
      { text: 'Divine right of kings', isCorrect: false, feedback: 'Divine right says rulers get power from God, the opposite of a social contract.' },
      { text: 'Separation of powers', isCorrect: false, feedback: 'That divides government branches; this is about a people–government agreement.' },
      { text: 'Mercantilism', isCorrect: false, feedback: 'Mercantilism is an economic policy, not a government agreement.' },
    ] },
  { externalKey: 'q-SS7CG11-019', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A colonist argues that people are born with rights that no king can take away. This argument most directly reflects the ideas of —', options: [
      { text: 'John Locke', isCorrect: true, feedback: 'Correct! Locke argued for natural rights that exist before and beyond government.' },
      { text: 'Montesquieu', isCorrect: false, feedback: 'Montesquieu focused on separating powers, not natural rights specifically.' },
      { text: 'King James II', isCorrect: false, feedback: 'A king would not argue that people\'s rights limit royal power.' },
      { text: 'Adam Smith', isCorrect: false, feedback: 'Smith wrote about economics, not natural rights.' },
    ] },
  { externalKey: 'q-SS7CG11-020', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A student claims, "John Locke wrote the U.S. Constitution." Why is this incorrect, even though Locke influenced it?', options: [
      { text: 'Locke\'s ideas inspired the founders, but he did not author the document; American framers wrote it decades after his death', isCorrect: true, feedback: 'Correct! Locke provided ideas; the framers wrote the Constitution.', misconceptionCode: 'M-OPLG-11' },
      { text: 'Locke actually wrote the Declaration instead', isCorrect: false, feedback: 'Locke wrote neither; Jefferson drafted the Declaration.' },
      { text: 'Locke was an American colonist', isCorrect: false, feedback: 'Locke was an English philosopher, not an American colonist.' },
      { text: 'The Constitution rejected all of Locke\'s ideas', isCorrect: false, feedback: 'It embraced many Lockean ideas; he simply didn\'t write it.' },
    ] },
  { externalKey: 'q-SS7CG11-021', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A new country wants to prevent any single leader from gaining total control. Drawing on Enlightenment thought, which design would BEST achieve this, and why?', options: [
      { text: 'Divide government into separate branches that check one another (Montesquieu), so no branch can dominate', isCorrect: true, feedback: 'Correct! Montesquieu\'s separation of powers prevents concentrated power.' },
      { text: 'Give one wise ruler unlimited power for life', isCorrect: false, feedback: 'That concentrates power — the opposite goal.' },
      { text: 'Abolish all government', isCorrect: false, feedback: 'Enlightenment thinkers wanted limited government, not none.' },
      { text: 'Let the military control the courts', isCorrect: false, feedback: 'That removes checks rather than creating them.' },
    ] },
  { externalKey: 'q-SS7CG11-022', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'Locke wrote: "The natural liberty of man is to be free from any superior power on earth... and to have only the law of Nature for his rule." This passage supports the idea that —', options: [
      { text: 'people have rights that come from nature, not from a ruler', isCorrect: true, feedback: 'Correct! Locke describes natural rights independent of any ruler.' },
      { text: 'kings should have unlimited power', isCorrect: false, feedback: 'The passage argues against a "superior power on earth."' },
      { text: 'only nobles are free', isCorrect: false, feedback: 'Locke refers to the natural liberty of "man" generally.' },
      { text: 'people must obey any law a king makes', isCorrect: false, feedback: 'The passage emphasizes natural law over a ruler\'s command.' },
    ] },
  { externalKey: 'q-SS7CG11-023', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'The Magna Carta (1215) stated that the king could not collect certain taxes "unless by common counsel of our kingdom." This idea most influenced the later principle of —', options: [
      { text: 'no taxation without representation / limits on the ruler', isCorrect: true, feedback: 'Correct! Requiring counsel before taxing limited the king\'s power.' },
      { text: 'absolute royal power', isCorrect: false, feedback: 'It did the opposite — it limited the king.' },
      { text: 'freedom of religion', isCorrect: false, feedback: 'This clause is about taxation and consent, not religion.' },
      { text: 'the right to bear arms', isCorrect: false, feedback: 'This clause concerns taxation by consent, not weapons.' },
    ] },
  { externalKey: 'q-SS7CG11-024', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A textbook says: "The Magna Carta and the English Bill of Rights were different documents written centuries apart, yet both limited the monarch." Which statement correctly distinguishes them?', options: [
      { text: 'The Magna Carta (1215) first limited the king; the English Bill of Rights (1689) further restricted the monarch and strengthened Parliament', isCorrect: true, feedback: 'Correct! They are separate documents from different eras that both limited royal power.', misconceptionCode: 'M-OPLG-03' },
      { text: 'They are two names for the same single document', isCorrect: false, feedback: 'They are distinct documents written centuries apart.' },
      { text: 'The English Bill of Rights came first, in 1215', isCorrect: false, feedback: 'The Magna Carta was 1215; the English Bill of Rights was 1689.' },
      { text: 'Both were written in America', isCorrect: false, feedback: 'Both were English documents.' },
    ] },
  { externalKey: 'q-SS7CG11-025', benchmarkCode: 'SS.7.CG.1.1', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A table pairs thinkers with ideas:\n| Thinker | Key Idea |\n| Locke | natural rights, social contract |\n| Montesquieu | ??? |\nWhich idea best completes the table?', options: [
      { text: 'Separation of powers', isCorrect: true, feedback: 'Correct! Montesquieu is known for separation of powers.' },
      { text: 'Divine right of kings', isCorrect: false, feedback: 'Montesquieu opposed concentrated power; divine right supports it.' },
      { text: 'Mercantilism', isCorrect: false, feedback: 'That is an economic theory, not Montesquieu\'s political idea.' },
      { text: 'Manifest destiny', isCorrect: false, feedback: 'That is a 19th-century U.S. idea, unrelated to Montesquieu.' },
    ] },
  { externalKey: 'q-SS7CG11-026', benchmarkCode: 'SS.7.CG.1.1', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A timeline lists: Magna Carta (1215) → English Bill of Rights (1689) → U.S. Constitution (1787). What does the timeline best show?', options: [
      { text: 'A growing tradition of limiting government power over time', isCorrect: true, feedback: 'Correct! Each document built on limiting government and protecting rights.' },
      { text: 'That government power increased over time', isCorrect: false, feedback: 'The trend is toward limiting, not increasing, government power.' },
      { text: 'That all three were written the same year', isCorrect: false, feedback: 'The dates show centuries apart.' },
      { text: 'That America wrote all three', isCorrect: false, feedback: 'The first two were English documents.' },
    ] },
  { externalKey: 'q-SS7CG11-027', benchmarkCode: 'SS.7.CG.1.1', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'Which statement correctly describes natural rights?', options: [
      { text: 'Rights people are born with that government should protect', isCorrect: true, feedback: 'Correct! Natural rights exist by nature and government protects them.' },
      { text: 'Rights the government creates and can remove anytime', isCorrect: false, feedback: 'Those are legal/civil rights; natural rights are not government-granted.', misconceptionCode: 'M-OPLG-05' },
      { text: 'Rights only kings have', isCorrect: false, feedback: 'Natural rights belong to all people, not only kings.' },
      { text: 'Rights that apply only during wars', isCorrect: false, feedback: 'Natural rights are not limited to wartime.' },
    ] },
  { externalKey: 'q-SS7CG11-028', benchmarkCode: 'SS.7.CG.1.1', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'A student says, "The social contract was a real paper that everyone signed." What is the BEST correction?', options: [
      { text: 'The social contract is an idea about the relationship between people and government, not a literal signed document', isCorrect: true, feedback: 'Correct! It is a concept, not an actual signed paper.', misconceptionCode: 'M-OPLG-07' },
      { text: 'Everyone really did sign it in 1776', isCorrect: false, feedback: 'It is a metaphor, not a signed document.' },
      { text: 'Only the king signed it', isCorrect: false, feedback: 'There was no literal contract to sign.' },
      { text: 'It is the same as the Constitution', isCorrect: false, feedback: 'The social contract is an idea that influenced the Constitution, not the document itself.' },
    ] },
  { externalKey: 'q-SS7CG11-029', benchmarkCode: 'SS.7.CG.1.1', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'Which Enlightenment idea is reflected in the phrase "governments derive their just powers from the consent of the governed"?', options: [
      { text: 'Popular sovereignty / social contract', isCorrect: true, feedback: 'Correct! Power coming from the consent of the people reflects these ideas.' },
      { text: 'Divine right of kings', isCorrect: false, feedback: 'Divine right says power comes from God, not the people.' },
      { text: 'Absolute monarchy', isCorrect: false, feedback: 'Consent of the governed limits rulers, unlike absolute monarchy.' },
      { text: 'Mercantilism', isCorrect: false, feedback: 'That is economics, not the source of governing power.' },
    ] },
  { externalKey: 'q-SS7CG11-030', benchmarkCode: 'SS.7.CG.1.1', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'enlightenment-influence', remediationTag: 'remed-CG11-enlightenment',
    prompt: 'How did Enlightenment ideas MOST influence the way American colonists thought about their relationship with Great Britain?', options: [
      { text: 'They gave colonists a framework to argue that government must protect rights and rest on consent — so a government that did neither could be resisted', isCorrect: true, feedback: 'Correct! Natural rights and consent gave colonists a basis to challenge British rule.' },
      { text: 'They convinced colonists that kings could never be questioned', isCorrect: false, feedback: 'Enlightenment ideas did the opposite — they justified questioning rulers.' },
      { text: 'They had no effect on colonial thinking', isCorrect: false, feedback: 'These ideas strongly shaped colonial arguments.' },
      { text: 'They made colonists support absolute monarchy', isCorrect: false, feedback: 'They pushed colonists toward limited government and consent.' },
    ] },
]

// ── SS.7.CG.1.2 — Colonial and British Governmental Traditions ───────────────
const SS7CG12: QuestionSeedDef[] = [
  { externalKey: 'q-SS7CG12-016', benchmarkCode: 'SS.7.CG.1.2', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'What was "salutary neglect"?', options: [
      { text: 'Britain\'s loose enforcement of laws that let colonies govern themselves', isCorrect: true, feedback: 'Correct! Salutary neglect was Britain\'s relaxed oversight of the colonies.' },
      { text: 'A tax on imported sugar', isCorrect: false, feedback: 'That describes the Sugar Act, not salutary neglect.' },
      { text: 'A colonial army', isCorrect: false, feedback: 'Salutary neglect was a British policy of loose enforcement.' },
      { text: 'A type of town meeting', isCorrect: false, feedback: 'Salutary neglect was Britain\'s hands-off approach, not a meeting.' },
    ] },
  { externalKey: 'q-SS7CG12-017', benchmarkCode: 'SS.7.CG.1.2', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'The Virginia House of Burgesses is important because it was —', options: [
      { text: 'the first elected lawmaking body in the American colonies', isCorrect: true, feedback: 'Correct! It was the first representative assembly in the colonies.' },
      { text: 'the British king\'s palace', isCorrect: false, feedback: 'It was a colonial assembly, not a royal palace.' },
      { text: 'a colonial church', isCorrect: false, feedback: 'It was a lawmaking body, not a church.' },
      { text: 'a tax on tea', isCorrect: false, feedback: 'It was a representative assembly, not a tax.' },
    ] },
  { externalKey: 'q-SS7CG12-018', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'In a New England town, residents gather to vote directly on local rules and budgets. This practice is an early example of —', options: [
      { text: 'self-government through town meetings', isCorrect: true, feedback: 'Correct! Town meetings let colonists govern themselves directly.' },
      { text: 'rule by the British king', isCorrect: false, feedback: 'Town meetings were local self-rule, not royal control.' },
      { text: 'taxation without representation', isCorrect: false, feedback: 'This is participation, not unfair taxation.' },
      { text: 'salutary neglect', isCorrect: false, feedback: 'Salutary neglect is Britain\'s loose oversight; this is the colonists\' own self-rule.' },
    ] },
  { externalKey: 'q-SS7CG12-019', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'Colonial courts begin following earlier court decisions as precedent. This reflects the influence of —', options: [
      { text: 'English common law', isCorrect: true, feedback: 'Correct! Common law relies on precedent from earlier decisions.' },
      { text: 'the Mayflower Compact', isCorrect: false, feedback: 'The Mayflower Compact was a governing agreement, not a court system.' },
      { text: 'the Stamp Act', isCorrect: false, feedback: 'The Stamp Act was a tax, not a legal tradition of precedent.' },
      { text: 'mercantilism', isCorrect: false, feedback: 'Mercantilism is economic policy, not court precedent.' },
    ] },
  { externalKey: 'q-SS7CG12-020', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'For decades Britain loosely enforced trade laws while colonies built their own assemblies. How did this set the stage for later conflict?', options: [
      { text: 'Colonists grew used to self-rule, so they resisted when Britain later tightened control', isCorrect: true, feedback: 'Correct! Self-governance under salutary neglect made later British control feel like an overreach.' },
      { text: 'Colonists forgot how to govern themselves', isCorrect: false, feedback: 'They became MORE practiced at self-rule, not less.' },
      { text: 'Britain gave up all colonies immediately', isCorrect: false, feedback: 'Britain later tightened, not abandoned, control.' },
      { text: 'It had no effect on later events', isCorrect: false, feedback: 'It strongly shaped colonial resistance.' },
    ] },
  { externalKey: 'q-SS7CG12-021', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'A historian argues that American self-government did not begin in 1776 but much earlier. Which evidence BEST supports this claim?', options: [
      { text: 'Colonies had elected assemblies (e.g., House of Burgesses) and town meetings long before independence', isCorrect: true, feedback: 'Correct! Representative institutions existed well before 1776.' },
      { text: 'The colonies had no government until 1776', isCorrect: false, feedback: 'They had assemblies and local governments earlier.' },
      { text: 'Britain governed every local decision directly', isCorrect: false, feedback: 'Salutary neglect left many decisions to colonists.' },
      { text: 'The king personally ran each colony', isCorrect: false, feedback: 'Colonies largely governed their own local affairs.' },
    ] },
  { externalKey: 'q-SS7CG12-022', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'Mayflower Compact (1620): "...covenant and combine ourselves together into a civil Body Politick... to enact... just and equal Laws..." This shows the signers agreed to —', options: [
      { text: 'govern themselves by laws they made together', isCorrect: true, feedback: 'Correct! They agreed to self-government through shared laws.' },
      { text: 'obey only the king of Spain', isCorrect: false, feedback: 'The compact is about self-government, not obeying Spain.' },
      { text: 'abolish all laws', isCorrect: false, feedback: 'They agreed to "enact just and equal Laws," not abolish law.' },
      { text: 'pay taxes to France', isCorrect: false, feedback: 'The compact concerns self-rule, not French taxes.' },
    ] },
  { externalKey: 'q-SS7CG12-023', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'A colonial charter grants settlers the right to elect representatives to make local laws. This document most directly supports the tradition of —', options: [
      { text: 'representative self-government', isCorrect: true, feedback: 'Correct! Electing representatives is representative self-government.' },
      { text: 'absolute monarchy', isCorrect: false, feedback: 'Electing local lawmakers limits, not absolutizes, royal power.' },
      { text: 'religious persecution', isCorrect: false, feedback: 'The charter is about elected lawmaking, not religion.' },
      { text: 'military dictatorship', isCorrect: false, feedback: 'Elected representatives are the opposite of military rule.' },
    ] },
  { externalKey: 'q-SS7CG12-024', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'Two colonists describe their government. Colonist A: "We vote in our town meeting." Colonist B: "Our assembly passes our laws." What do BOTH descriptions reveal about colonial government?', options: [
      { text: 'Colonists practiced self-government through both direct and representative forms', isCorrect: true, feedback: 'Correct! Town meetings (direct) and assemblies (representative) both show self-rule.' },
      { text: 'Colonists had no role in their own government', isCorrect: false, feedback: 'Both quotes show active colonial participation.' },
      { text: 'Only Britain made every colonial law', isCorrect: false, feedback: 'Both quotes describe colonial lawmaking.' },
      { text: 'The colonies banned all voting', isCorrect: false, feedback: 'Both describe voting and assemblies.' },
    ] },
  { externalKey: 'q-SS7CG12-025', benchmarkCode: 'SS.7.CG.1.2', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'A table lists colonial institutions:\n| Institution | Type of self-government |\n| House of Burgesses | elected assembly |\n| New England town meeting | ??? |\nWhich phrase best completes the table?', options: [
      { text: 'direct participation by residents', isCorrect: true, feedback: 'Correct! Town meetings were direct participation by townspeople.' },
      { text: 'rule by a single governor only', isCorrect: false, feedback: 'Town meetings were direct citizen participation, not one-person rule.' },
      { text: 'a royal court', isCorrect: false, feedback: 'Town meetings were local self-government, not royal courts.' },
      { text: 'a British tax office', isCorrect: false, feedback: 'They were governing meetings, not tax offices.' },
    ] },
  { externalKey: 'q-SS7CG12-026', benchmarkCode: 'SS.7.CG.1.2', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'A diagram shows colonists voting → electing representatives → representatives making laws. This best illustrates —', options: [
      { text: 'representative government', isCorrect: true, feedback: 'Correct! Voters electing lawmakers is representative government.' },
      { text: 'a monarchy', isCorrect: false, feedback: 'A monarchy is ruled by a king, not elected representatives.' },
      { text: 'salutary neglect', isCorrect: false, feedback: 'That is Britain\'s loose oversight, not this voting process.' },
      { text: 'a boycott', isCorrect: false, feedback: 'A boycott is refusing to buy goods, not electing lawmakers.' },
    ] },
  { externalKey: 'q-SS7CG12-027', benchmarkCode: 'SS.7.CG.1.2', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'Which statement about colonial government is CORRECT?', options: [
      { text: 'Colonies developed their own assemblies and traditions of self-rule before independence', isCorrect: true, feedback: 'Correct! Self-government grew in the colonies well before 1776.' },
      { text: 'Colonists had no experience governing before 1776', isCorrect: false, feedback: 'Colonists had decades of self-government experience.' },
      { text: 'The colonies were direct democracies with no representatives', isCorrect: false, feedback: 'They used both direct (town meetings) and representative (assemblies) forms.' },
      { text: 'Britain elected all colonial lawmakers', isCorrect: false, feedback: 'Colonists elected their own assembly members.' },
    ] },
  { externalKey: 'q-SS7CG12-028', benchmarkCode: 'SS.7.CG.1.2', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'A student says salutary neglect means Britain "carefully controlled every colonial law." Why is this wrong?', options: [
      { text: 'Salutary neglect was the opposite — loose enforcement that let colonies largely govern themselves', isCorrect: true, feedback: 'Correct! Salutary neglect was relaxed oversight, not tight control.' },
      { text: 'Salutary neglect meant Britain taxed every purchase', isCorrect: false, feedback: 'It refers to loose enforcement, not heavy taxation.' },
      { text: 'It means colonists could not govern at all', isCorrect: false, feedback: 'It actually allowed more colonial self-government.' },
      { text: 'It means colonies were independent countries', isCorrect: false, feedback: 'They were still British colonies, just loosely supervised.' },
    ] },
  { externalKey: 'q-SS7CG12-029', benchmarkCode: 'SS.7.CG.1.2', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'Which British tradition most directly shaped the American practice of relying on earlier court rulings as precedent?', options: [
      { text: 'Common law', isCorrect: true, feedback: 'Correct! Common law uses precedent from prior decisions.' },
      { text: 'Mercantilism', isCorrect: false, feedback: 'Mercantilism is an economic policy, not legal precedent.' },
      { text: 'The Stamp Act', isCorrect: false, feedback: 'The Stamp Act was a tax, not a legal tradition.' },
      { text: 'Divine right', isCorrect: false, feedback: 'Divine right concerns royal power, not court precedent.' },
    ] },
  { externalKey: 'q-SS7CG12-030', benchmarkCode: 'SS.7.CG.1.2', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'colonial-self-governance', remediationTag: 'remed-CG12-colonial-gov',
    prompt: 'How did colonial experiences with self-government MOST influence the later United States?', options: [
      { text: 'They gave Americans practical experience with representative institutions that shaped state and national governments', isCorrect: true, feedback: 'Correct! Colonial assemblies and town meetings modeled later American government.' },
      { text: 'They taught Americans to reject all forms of representation', isCorrect: false, feedback: 'They reinforced, not rejected, representative government.' },
      { text: 'They had no lasting influence', isCorrect: false, feedback: 'These traditions strongly shaped American government.' },
      { text: 'They convinced Americans to keep a king', isCorrect: false, feedback: 'They pushed toward representative self-rule, not monarchy.' },
    ] },
]

// ── SS.7.CG.1.3 — British Policies and Colonial Reactions ────────────────────
const SS7CG13: QuestionSeedDef[] = [
  { externalKey: 'q-SS7CG13-016', benchmarkCode: 'SS.7.CG.1.3', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'What was a "boycott" in the colonial period?', options: [
      { text: 'A refusal to buy British goods as a form of protest', isCorrect: true, feedback: 'Correct! Colonists boycotted (refused to buy) British goods to protest policies.' },
      { text: 'A British tax on tea', isCorrect: false, feedback: 'That is a tax; a boycott is refusing to buy goods.' },
      { text: 'A colonial army', isCorrect: false, feedback: 'A boycott is an economic protest, not an army.' },
      { text: 'A meeting of the king\'s advisors', isCorrect: false, feedback: 'A boycott is a refusal to purchase goods.' },
    ] },
  { externalKey: 'q-SS7CG13-017', benchmarkCode: 'SS.7.CG.1.3', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Why did Britain raise new taxes on the colonies after the French and Indian War?', options: [
      { text: 'To help pay off war debts', isCorrect: true, feedback: 'Correct! Britain taxed the colonies to recover the costs of the war.' },
      { text: 'To reward colonists for fighting', isCorrect: false, feedback: 'The taxes were to raise money, not reward colonists.' },
      { text: 'Because colonists asked to be taxed', isCorrect: false, feedback: 'Colonists opposed the new taxes.' },
      { text: 'To fund colonial schools', isCorrect: false, feedback: 'The taxes were mainly to pay war debts, not schools.' },
    ] },
  { externalKey: 'q-SS7CG13-018', benchmarkCode: 'SS.7.CG.1.3', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Parliament places a tax on printed materials in the colonies, but colonists have no representatives in Parliament. Colonists protest using the slogan —', options: [
      { text: '"No taxation without representation"', isCorrect: true, feedback: 'Correct! Colonists objected to being taxed without a voice in Parliament.' },
      { text: '"Give me liberty or give me a tax"', isCorrect: false, feedback: 'The actual protest slogan was "No taxation without representation."' },
      { text: '"Long live the king"', isCorrect: false, feedback: 'Colonists were protesting, not praising the king.' },
      { text: '"Salutary neglect forever"', isCorrect: false, feedback: 'That was a British policy, not a protest slogan.' },
    ] },
  { externalKey: 'q-SS7CG13-019', benchmarkCode: 'SS.7.CG.1.3', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Colonial merchants agree to stop importing British cloth until a tax is repealed. This action is an example of —', options: [
      { text: 'an economic boycott', isCorrect: true, feedback: 'Correct! Refusing to buy British goods is a boycott.' },
      { text: 'taxation without representation', isCorrect: false, feedback: 'That is the grievance; the boycott is the response.' },
      { text: 'a town meeting', isCorrect: false, feedback: 'This is an economic protest, not a meeting.' },
      { text: 'salutary neglect', isCorrect: false, feedback: 'Salutary neglect is a British policy, not a colonial protest.' },
    ] },
  { externalKey: 'q-SS7CG13-020', benchmarkCode: 'SS.7.CG.1.3', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Committees of correspondence sent letters among the colonies describing British actions. Why was this so important to the resistance?', options: [
      { text: 'It coordinated the colonies so they could respond to Britain together rather than separately', isCorrect: true, feedback: 'Correct! Shared information united the colonies\' resistance.' },
      { text: 'It collected taxes for Britain', isCorrect: false, feedback: 'The committees organized resistance, not tax collection.' },
      { text: 'It surrendered the colonies to Britain', isCorrect: false, feedback: 'They strengthened resistance, not surrender.' },
      { text: 'It had no effect on the colonies', isCorrect: false, feedback: 'They were crucial to coordinating colonial action.' },
    ] },
  { externalKey: 'q-SS7CG13-021', benchmarkCode: 'SS.7.CG.1.3', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'A colonist writes that the real problem with new taxes is not the cost but the principle. What principle is the colonist defending, and how does it connect to Enlightenment ideas?', options: [
      { text: 'That government may not tax people without their consent — reflecting the Enlightenment idea of consent of the governed', isCorrect: true, feedback: 'Correct! The objection was about consent, an Enlightenment principle.' },
      { text: 'That taxes should always be higher', isCorrect: false, feedback: 'Colonists opposed taxes imposed without consent.' },
      { text: 'That only the king should decide everything', isCorrect: false, feedback: 'The principle limits the ruler, the opposite of this.' },
      { text: 'That colonies wanted no government at all', isCorrect: false, feedback: 'They wanted consent and representation, not anarchy.' },
    ] },
  { externalKey: 'q-SS7CG13-022', benchmarkCode: 'SS.7.CG.1.3', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'A 1765 colonial resolution states: "...no taxes be imposed on them but with their own consent, given personally or by their representatives." This passage objects to the Stamp Act mainly because colonists —', options: [
      { text: 'had no representatives in Parliament to consent to the tax', isCorrect: true, feedback: 'Correct! The objection is the lack of representation/consent.' },
      { text: 'wanted to pay even higher taxes', isCorrect: false, feedback: 'They objected to the tax, not asked for more.' },
      { text: 'supported the king\'s unlimited power', isCorrect: false, feedback: 'They were limiting, not supporting, unchecked power.' },
      { text: 'wanted to join France', isCorrect: false, feedback: 'The passage is about consent to taxation, not France.' },
    ] },
  { externalKey: 'q-SS7CG13-023', benchmarkCode: 'SS.7.CG.1.3', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'A colonial pamphlet urges readers to "buy nothing of British make until the act is repealed." This is calling for a —', options: [
      { text: 'boycott', isCorrect: true, feedback: 'Correct! Refusing to buy British goods is a boycott.' },
      { text: 'tax', isCorrect: false, feedback: 'It is the opposite — refusing to buy to protest a tax.' },
      { text: 'royal decree', isCorrect: false, feedback: 'It is a colonial protest, not a royal order.' },
      { text: 'census', isCorrect: false, feedback: 'A census counts people; this calls for a boycott.' },
    ] },
  { externalKey: 'q-SS7CG13-024', benchmarkCode: 'SS.7.CG.1.3', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'A student claims, "Because colonists protested British taxes, those taxes must have been illegal." Evaluate this claim.', options: [
      { text: 'Incorrect — Parliament had legal authority to tax; colonists argued the taxes were unjust and violated their rights, not that they were technically illegal', isCorrect: true, feedback: 'Correct! The objection was to injustice and lack of consent, not legality.', misconceptionCode: 'M-OPLG-10' },
      { text: 'Correct — any tax people dislike is automatically illegal', isCorrect: false, feedback: 'Dislike does not make a law illegal.' },
      { text: 'Correct — Parliament had no government at all', isCorrect: false, feedback: 'Parliament was a lawmaking body with legal authority.' },
      { text: 'Incorrect — colonists actually supported the taxes', isCorrect: false, feedback: 'They opposed them, but on grounds of justice and consent.' },
    ] },
  { externalKey: 'q-SS7CG13-025', benchmarkCode: 'SS.7.CG.1.3', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'A table pairs British acts with what they taxed:\n| Act | Taxed/Regulated |\n| Stamp Act | printed materials |\n| Townshend Acts | ??? |\nWhich best completes the table?', options: [
      { text: 'imported goods like glass, paint, and tea', isCorrect: true, feedback: 'Correct! The Townshend Acts taxed imported goods such as glass, paint, and tea.' },
      { text: 'the right to vote', isCorrect: false, feedback: 'The Townshend Acts taxed imported goods, not voting.' },
      { text: 'town meetings', isCorrect: false, feedback: 'They taxed imports, not meetings.' },
      { text: 'church services', isCorrect: false, feedback: 'They taxed imported goods, not religious services.' },
    ] },
  { externalKey: 'q-SS7CG13-026', benchmarkCode: 'SS.7.CG.1.3', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'A flowchart shows: British tax → colonial protest → boycott → tax repealed. What does this flowchart best show?', options: [
      { text: 'Colonial resistance could pressure Britain to change policies', isCorrect: true, feedback: 'Correct! Organized protest and boycotts pressured Britain to repeal taxes.' },
      { text: 'Colonists always welcomed new taxes', isCorrect: false, feedback: 'The flowchart shows protest, not welcome.' },
      { text: 'Britain never changed any policy', isCorrect: false, feedback: 'The flowchart ends in repeal — a change.' },
      { text: 'Taxes had no effect on colonists', isCorrect: false, feedback: 'Taxes provoked strong colonial reactions.' },
    ] },
  { externalKey: 'q-SS7CG13-027', benchmarkCode: 'SS.7.CG.1.3', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Which statement about "no taxation without representation" is CORRECT?', options: [
      { text: 'Colonists objected because they had no elected representatives in Parliament to agree to the taxes', isCorrect: true, feedback: 'Correct! The grievance was about lacking representation/consent.' },
      { text: 'Colonists objected to paying any money for anything ever', isCorrect: false, feedback: 'They objected to taxes imposed without their consent, not all payments.' },
      { text: 'Colonists had many representatives in Parliament', isCorrect: false, feedback: 'They had none — that was the whole point.' },
      { text: 'It meant colonists wanted Britain to tax them more', isCorrect: false, feedback: 'They opposed taxes without representation.' },
    ] },
  { externalKey: 'q-SS7CG13-028', benchmarkCode: 'SS.7.CG.1.3', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Which response shows the BEST understanding of how colonists resisted British policies BEFORE the war began?', options: [
      { text: 'Through petitions, boycotts, and committees of correspondence — organized, mostly peaceful resistance', isCorrect: true, feedback: 'Correct! Early resistance was organized and largely non-violent.' },
      { text: 'By immediately declaring independence in 1765', isCorrect: false, feedback: 'Independence came later (1776); early resistance used petitions and boycotts.' },
      { text: 'By doing nothing at all', isCorrect: false, feedback: 'Colonists organized active resistance.' },
      { text: 'By voting in Parliament', isCorrect: false, feedback: 'They had no representatives in Parliament.' },
    ] },
  { externalKey: 'q-SS7CG13-029', benchmarkCode: 'SS.7.CG.1.3', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'Which British action is correctly paired with a colonial reaction?', options: [
      { text: 'Stamp Act → boycotts and protests against taxation without representation', isCorrect: true, feedback: 'Correct! The Stamp Act sparked boycotts and the "no taxation without representation" protest.' },
      { text: 'Stamp Act → colonists happily paid the tax', isCorrect: false, feedback: 'Colonists protested, they did not happily pay.' },
      { text: 'Salutary neglect → violent colonial rebellion', isCorrect: false, feedback: 'Salutary neglect was loose oversight that colonists liked.' },
      { text: 'Townshend Acts → colonists demanded higher taxes', isCorrect: false, feedback: 'Colonists protested, not demanded more taxes.' },
    ] },
  { externalKey: 'q-SS7CG13-030', benchmarkCode: 'SS.7.CG.1.3', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'british-policies', remediationTag: 'remed-CG13-british-policies',
    prompt: 'How did British policies after the French and Indian War MOST contribute to the movement toward independence?', options: [
      { text: 'New taxes and tighter control without colonial representation convinced many colonists that their rights were being violated', isCorrect: true, feedback: 'Correct! Policies imposed without consent fueled the independence movement.' },
      { text: 'They gave colonists full representation in Parliament', isCorrect: false, feedback: 'Colonists had no representation, which was the grievance.' },
      { text: 'They lowered all colonial taxes', isCorrect: false, feedback: 'The policies raised taxes.' },
      { text: 'They had no political effect', isCorrect: false, feedback: 'They were central to the move toward independence.' },
    ] },
]

// ── SS.7.CG.1.4 — Principles and Ideals of the Declaration of Independence ────
const SS7CG14: QuestionSeedDef[] = [
  { externalKey: 'q-SS7CG14-016', benchmarkCode: 'SS.7.CG.1.4', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'In the Declaration, what does "unalienable rights" mean?', options: [
      { text: 'Rights that cannot be taken away', isCorrect: true, feedback: 'Correct! Unalienable rights cannot be taken away or given up.' },
      { text: 'Rights only for foreigners', isCorrect: false, feedback: '"Unalienable" means rights that cannot be taken away, for everyone.' },
      { text: 'Rights that expire after a year', isCorrect: false, feedback: 'Unalienable rights are permanent, not temporary.' },
      { text: 'Rights granted by the king', isCorrect: false, feedback: 'They are natural rights, not granted by a king.' },
    ] },
  { externalKey: 'q-SS7CG14-017', benchmarkCode: 'SS.7.CG.1.4', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Who was the primary author of the Declaration of Independence?', options: [
      { text: 'Thomas Jefferson', isCorrect: true, feedback: 'Correct! Thomas Jefferson was the main drafter.' },
      { text: 'John Locke', isCorrect: false, feedback: 'Locke inspired the ideas but Jefferson wrote the Declaration.', misconceptionCode: 'M-OPLG-04' },
      { text: 'King George III', isCorrect: false, feedback: 'King George III was the British monarch it was written against.' },
      { text: 'George Washington', isCorrect: false, feedback: 'Washington led the army; Jefferson drafted the Declaration.' },
    ] },
  { externalKey: 'q-SS7CG14-018', benchmarkCode: 'SS.7.CG.1.4', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'A document argues that government gets its authority from the people and may be changed if it fails to protect their rights. This reflects which Declaration principle?', options: [
      { text: 'Consent of the governed and the right to alter government', isCorrect: true, feedback: 'Correct! The Declaration says governments rest on consent and may be changed.' },
      { text: 'Divine right of kings', isCorrect: false, feedback: 'The Declaration rejects rule by divine right.' },
      { text: 'Salutary neglect', isCorrect: false, feedback: 'That is a British policy, not a Declaration principle.' },
      { text: 'Mercantilism', isCorrect: false, feedback: 'That is economics, not a Declaration principle.' },
    ] },
  { externalKey: 'q-SS7CG14-019', benchmarkCode: 'SS.7.CG.1.4', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'A leader says, "All people are equal and have rights to life and liberty." Which part of the Declaration does this echo?', options: [
      { text: '"All men are created equal" with unalienable rights', isCorrect: true, feedback: 'Correct! This echoes the Declaration\'s statement of equality and rights.' },
      { text: 'The list of grievances against the king', isCorrect: false, feedback: 'That is the complaints section, not the statement of equality.' },
      { text: 'The signature page', isCorrect: false, feedback: 'This echoes the principles, not the signatures.' },
      { text: 'A tax law', isCorrect: false, feedback: 'The Declaration is not a tax law.' },
    ] },
  { externalKey: 'q-SS7CG14-020', benchmarkCode: 'SS.7.CG.1.4', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'A student treats every sentence of the Declaration as current U.S. law. Why is that a mistake?', options: [
      { text: 'The Declaration explains why the colonies separated; it is a statement of ideals, not a body of enforceable law like the Constitution', isCorrect: true, feedback: 'Correct! The Declaration states principles; the Constitution is the governing law.', misconceptionCode: 'M-OPLG-02' },
      { text: 'The Declaration was never actually written', isCorrect: false, feedback: 'It was written in 1776; it simply is not enforceable law.' },
      { text: 'The Declaration is the same as the Bill of Rights', isCorrect: false, feedback: 'They are different documents with different roles.' },
      { text: 'The Declaration created the three branches', isCorrect: false, feedback: 'The Constitution created the branches, not the Declaration.' },
    ] },
  { externalKey: 'q-SS7CG14-021', benchmarkCode: 'SS.7.CG.1.4', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'The Declaration lists specific complaints against King George III AND states universal principles like equality. Why did Jefferson include BOTH?', options: [
      { text: 'The principles justified independence in general, while the grievances proved the king had violated those principles in particular', isCorrect: true, feedback: 'Correct! Principles set the standard; grievances showed the king failed it.', misconceptionCode: 'M-OPLG-09' },
      { text: 'The grievances and principles say exactly the same thing', isCorrect: false, feedback: 'They serve different purposes — general ideals vs. specific complaints.' },
      { text: 'Jefferson included grievances by accident', isCorrect: false, feedback: 'The grievances were a deliberate, central part of the argument.' },
      { text: 'The principles were meant to praise the king', isCorrect: false, feedback: 'The document argues against the king, not praises him.' },
    ] },
  { externalKey: 'q-SS7CG14-022', benchmarkCode: 'SS.7.CG.1.4', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Declaration: "...they are endowed by their Creator with certain unalienable Rights... Life, Liberty and the pursuit of Happiness." This passage states that these rights —', options: [
      { text: 'belong to people naturally and cannot be taken away', isCorrect: true, feedback: 'Correct! The rights are natural and unalienable.' },
      { text: 'are granted by Parliament', isCorrect: false, feedback: 'The passage says they come from the Creator, not Parliament.' },
      { text: 'apply only to the king', isCorrect: false, feedback: 'The passage refers to all people.' },
      { text: 'can be removed by a vote', isCorrect: false, feedback: 'They are described as unalienable — not removable.' },
    ] },
  { externalKey: 'q-SS7CG14-023', benchmarkCode: 'SS.7.CG.1.4', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Declaration: "...Governments are instituted among Men, deriving their just powers from the consent of the governed." This sentence supports the principle of —', options: [
      { text: 'popular sovereignty / consent of the governed', isCorrect: true, feedback: 'Correct! Government power comes from the consent of the people.' },
      { text: 'absolute monarchy', isCorrect: false, feedback: 'Consent of the governed limits, not absolutizes, rulers.' },
      { text: 'taxation without representation', isCorrect: false, feedback: 'The passage is about consent, which opposes that practice.' },
      { text: 'mercantilism', isCorrect: false, feedback: 'That is economic policy, not the source of governing power.' },
    ] },
  { externalKey: 'q-SS7CG14-024', benchmarkCode: 'SS.7.CG.1.4', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Declaration: "...whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it..." A reader concludes this justifies the colonies\' break from Britain. Why is that conclusion well supported?', options: [
      { text: 'The text says people may change a government that fails to protect their rights, which is exactly what the colonists claimed Britain had done', isCorrect: true, feedback: 'Correct! The passage provides the principle the colonists used to justify independence.' },
      { text: 'The text says government can never be changed', isCorrect: false, feedback: 'It says the opposite — people may alter or abolish it.' },
      { text: 'The text forbids any resistance to rulers', isCorrect: false, feedback: 'It affirms a right to alter or abolish failed government.' },
      { text: 'The text is about taxation only', isCorrect: false, feedback: 'It is about the right to change government, broader than taxation.' },
    ] },
  { externalKey: 'q-SS7CG14-025', benchmarkCode: 'SS.7.CG.1.4', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'A table sorts parts of the Declaration:\n| Part | Purpose |\n| "All men are created equal..." | universal principle |\n| "He has refused his Assent to Laws..." | ??? |\nWhich best completes the table?', options: [
      { text: 'a specific grievance against the king', isCorrect: true, feedback: 'Correct! That line is a specific complaint against King George III.' },
      { text: 'a universal principle', isCorrect: false, feedback: 'That line is a specific grievance, not a general principle.' },
      { text: 'a tax rate', isCorrect: false, feedback: 'It is a grievance, not a tax.' },
      { text: 'a signature', isCorrect: false, feedback: 'It is a listed complaint, not a signature.' },
    ] },
  { externalKey: 'q-SS7CG14-026', benchmarkCode: 'SS.7.CG.1.4', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'A list shows three unalienable rights from the Declaration. Which set is correct?', options: [
      { text: 'Life, Liberty, and the pursuit of Happiness', isCorrect: true, feedback: 'Correct! The Declaration names life, liberty, and the pursuit of happiness.' },
      { text: 'Life, liberty, and property', isCorrect: false, feedback: 'That is Locke\'s phrasing; the Declaration says "pursuit of Happiness."' },
      { text: 'Food, shelter, and money', isCorrect: false, feedback: 'Those are not the rights named in the Declaration.' },
      { text: 'Voting, taxes, and trade', isCorrect: false, feedback: 'Those are not the unalienable rights listed.' },
    ] },
  { externalKey: 'q-SS7CG14-027', benchmarkCode: 'SS.7.CG.1.4', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Which statement about the Declaration of Independence is CORRECT?', options: [
      { text: 'It explained the reasons for separating from Britain and stated democratic ideals', isCorrect: true, feedback: 'Correct! It justified independence and stated ideals.' },
      { text: 'It is the supreme law that courts use today', isCorrect: false, feedback: 'The Constitution is the supreme law; the Declaration states ideals.', misconceptionCode: 'M-OPLG-02' },
      { text: 'It created the three branches of government', isCorrect: false, feedback: 'The Constitution created the branches.' },
      { text: 'It was written by King George III', isCorrect: false, feedback: 'It was written against the king, mainly by Jefferson.' },
    ] },
  { externalKey: 'q-SS7CG14-028', benchmarkCode: 'SS.7.CG.1.4', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'A student says John Locke wrote the Declaration of Independence. What is the BEST correction?', options: [
      { text: 'Jefferson wrote it; Locke\'s ideas influenced it but he was not the author', isCorrect: true, feedback: 'Correct! Jefferson authored it, drawing on Locke\'s ideas.', misconceptionCode: 'M-OPLG-04' },
      { text: 'Actually the king wrote it', isCorrect: false, feedback: 'It was written against the king, by Jefferson.' },
      { text: 'No one wrote it', isCorrect: false, feedback: 'Jefferson was the principal author.' },
      { text: 'Montesquieu wrote it', isCorrect: false, feedback: 'Jefferson wrote it; Montesquieu influenced other ideas.' },
    ] },
  { externalKey: 'q-SS7CG14-029', benchmarkCode: 'SS.7.CG.1.4', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Which idea from the Declaration of Independence came most directly from John Locke?', options: [
      { text: 'People have natural rights and government should protect them', isCorrect: true, feedback: 'Correct! Locke\'s natural-rights idea shaped the Declaration.' },
      { text: 'Kings rule by divine right', isCorrect: false, feedback: 'The Declaration rejects divine right.' },
      { text: 'Colonies should remain British forever', isCorrect: false, feedback: 'The Declaration argues for independence.' },
      { text: 'Trade should be controlled by Britain', isCorrect: false, feedback: 'That is mercantilism, not a Lockean Declaration idea.' },
    ] },
  { externalKey: 'q-SS7CG14-030', benchmarkCode: 'SS.7.CG.1.4', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'declaration-principles', remediationTag: 'remed-CG14-declaration',
    prompt: 'Why is the Declaration of Independence historically significant BEYOND announcing a break from Britain?', options: [
      { text: 'It stated lasting democratic ideals — equality, natural rights, and government by consent — that continued to shape American government', isCorrect: true, feedback: 'Correct! Its ideals influenced American government long after 1776.' },
      { text: 'It served as the country\'s detailed legal code', isCorrect: false, feedback: 'The Constitution, not the Declaration, is the legal framework.' },
      { text: 'It was quickly forgotten and had no influence', isCorrect: false, feedback: 'Its ideals had lasting influence.' },
      { text: 'It established the Electoral College', isCorrect: false, feedback: 'The Constitution did that, not the Declaration.' },
    ] },
]

// ── SS.7.CG.1.5 — Strengths and Weaknesses of the Articles of Confederation ───
const SS7CG15: QuestionSeedDef[] = [
  { externalKey: 'q-SS7CG15-016', benchmarkCode: 'SS.7.CG.1.5', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'What was the Articles of Confederation?', options: [
      { text: 'The first plan of government for the United States', isCorrect: true, feedback: 'Correct! The Articles were the first U.S. national government plan.' },
      { text: 'A British tax law', isCorrect: false, feedback: 'The Articles were an American government plan, not a British tax.' },
      { text: 'The current U.S. Constitution', isCorrect: false, feedback: 'The Constitution replaced the Articles.', misconceptionCode: 'M-OPLG-01' },
      { text: 'A peace treaty with France', isCorrect: false, feedback: 'The Articles were a plan of government, not a treaty.' },
    ] },
  { externalKey: 'q-SS7CG15-017', benchmarkCode: 'SS.7.CG.1.5', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'Under the Articles of Confederation, the national government could NOT —', options: [
      { text: 'collect taxes from the states', isCorrect: true, feedback: 'Correct! Congress could not tax under the Articles.' },
      { text: 'declare independence', isCorrect: false, feedback: 'Independence was already declared in 1776; the issue was the power to tax.' },
      { text: 'name the country', isCorrect: false, feedback: 'The weakness was the inability to tax and enforce laws.' },
      { text: 'write letters', isCorrect: false, feedback: 'The key weakness was no power to tax.' },
    ] },
  { externalKey: 'q-SS7CG15-018', benchmarkCode: 'SS.7.CG.1.5', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'The national government needs money to pay soldiers but cannot force states to contribute. Which weakness of the Articles does this show?', options: [
      { text: 'Congress had no power to tax', isCorrect: true, feedback: 'Correct! Without the power to tax, the government could not reliably raise money.' },
      { text: 'There were too many courts', isCorrect: false, feedback: 'There were no national courts; and the issue here is taxing power.' },
      { text: 'The president had too much power', isCorrect: false, feedback: 'There was no executive branch at all.' },
      { text: 'States had no votes', isCorrect: false, feedback: 'Each state had a vote; the problem was no taxing power.' },
    ] },
  { externalKey: 'q-SS7CG15-019', benchmarkCode: 'SS.7.CG.1.5', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A dispute breaks out between two states, but there is no national court to settle it. Which weakness of the Articles does this reveal?', options: [
      { text: 'There was no national judicial branch', isCorrect: true, feedback: 'Correct! The Articles created no national courts to resolve disputes.' },
      { text: 'Congress taxed too heavily', isCorrect: false, feedback: 'Congress could not tax at all; the issue here is the lack of courts.' },
      { text: 'The president vetoed the states', isCorrect: false, feedback: 'There was no president under the Articles.' },
      { text: 'There were too many amendments', isCorrect: false, feedback: 'Amendments were nearly impossible; the issue here is no courts.' },
    ] },
  { externalKey: 'q-SS7CG15-020', benchmarkCode: 'SS.7.CG.1.5', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'Changing the Articles required all 13 states to agree. Why was this such a serious problem?', options: [
      { text: 'A single state could block any change, making it nearly impossible to fix the government\'s flaws', isCorrect: true, feedback: 'Correct! Unanimity meant one state could veto needed reforms.' },
      { text: 'It made changes too easy and frequent', isCorrect: false, feedback: 'It made changes almost impossible, not easy.' },
      { text: 'It gave the president too much power', isCorrect: false, feedback: 'There was no president under the Articles.' },
      { text: 'It created too many national courts', isCorrect: false, feedback: 'There were no national courts at all.' },
    ] },
  { externalKey: 'q-SS7CG15-021', benchmarkCode: 'SS.7.CG.1.5', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'Shays\' Rebellion showed farmers attacking courts while the national government could not raise a force to respond. What did this event most clearly demonstrate?', options: [
      { text: 'The national government was too weak to maintain order, showing the Articles needed to be replaced', isCorrect: true, feedback: 'Correct! The government\'s inability to respond exposed the Articles\' weakness.' },
      { text: 'The Articles gave the government too much military power', isCorrect: false, feedback: 'The problem was too little power to respond.' },
      { text: 'Taxes under the Articles were too high', isCorrect: false, feedback: 'Congress could not even levy national taxes.' },
      { text: 'The president acted too forcefully', isCorrect: false, feedback: 'There was no president under the Articles.' },
    ] },
  { externalKey: 'q-SS7CG15-022', benchmarkCode: 'SS.7.CG.1.5', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A 1786 letter complains: "Congress may make requests for money, but cannot compel the states to pay." This describes the Articles\' weakness of —', options: [
      { text: 'no power to tax or enforce payment', isCorrect: true, feedback: 'Correct! Congress could only request, not compel, payment.' },
      { text: 'too strong an executive', isCorrect: false, feedback: 'There was no executive under the Articles.' },
      { text: 'too many courts', isCorrect: false, feedback: 'There were no national courts.' },
      { text: 'unlimited taxation', isCorrect: false, feedback: 'The problem was no taxing power, not too much.' },
    ] },
  { externalKey: 'q-SS7CG15-023', benchmarkCode: 'SS.7.CG.1.5', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A delegate writes: "We have no national court and no executive to carry out our laws." These complaints point to the Articles\' lack of —', options: [
      { text: 'a judicial branch and an executive branch', isCorrect: true, feedback: 'Correct! The Articles had no national courts and no executive.' },
      { text: 'a legislature', isCorrect: false, feedback: 'There WAS a Congress; the missing parts were courts and an executive.' },
      { text: 'any states', isCorrect: false, feedback: 'There were 13 states; the missing parts were branches of government.' },
      { text: 'a national flag', isCorrect: false, feedback: 'The complaint is about missing branches, not a flag.' },
    ] },
  { externalKey: 'q-SS7CG15-024', benchmarkCode: 'SS.7.CG.1.5', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A student reads that the Articles "successfully guided the nation through the Revolution and set up the Northwest Territory." How should this be balanced against the Articles\' failures?', options: [
      { text: 'The Articles had real strengths but also fatal weaknesses (no tax or enforcement power), so leaders chose to replace rather than keep them', isCorrect: true, feedback: 'Correct! The Articles had strengths yet critical weaknesses that led to replacement.' },
      { text: 'The Articles had no strengths whatsoever', isCorrect: false, feedback: 'They did have strengths, such as the Northwest Ordinance.' },
      { text: 'The Articles were perfect and never replaced', isCorrect: false, feedback: 'They were replaced by the Constitution.' },
      { text: 'The Articles created a strong executive', isCorrect: false, feedback: 'They created no executive at all.' },
    ] },
  { externalKey: 'q-SS7CG15-025', benchmarkCode: 'SS.7.CG.1.5', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A table lists Articles weaknesses:\n| Weakness | Result |\n| No power to tax | government short of money |\n| No executive branch | ??? |\nWhich best completes the table?', options: [
      { text: 'no one to enforce or carry out national laws', isCorrect: true, feedback: 'Correct! Without an executive, no one enforced national laws.' },
      { text: 'too many presidents', isCorrect: false, feedback: 'There were no presidents under the Articles.' },
      { text: 'unlimited national taxes', isCorrect: false, feedback: 'Congress could not tax at all.' },
      { text: 'a powerful Supreme Court', isCorrect: false, feedback: 'There were no national courts.' },
    ] },
  { externalKey: 'q-SS7CG15-026', benchmarkCode: 'SS.7.CG.1.5', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A diagram shows Congress with no executive and no courts beneath it. What does the diagram best illustrate?', options: [
      { text: 'The Articles created only a legislature, with no executive or judicial branch', isCorrect: true, feedback: 'Correct! The Articles had a Congress but no executive or judicial branch.' },
      { text: 'The Articles had all three branches', isCorrect: false, feedback: 'They had only a legislature.' },
      { text: 'The Articles had a strong president', isCorrect: false, feedback: 'There was no executive at all.' },
      { text: 'The Articles created the Supreme Court', isCorrect: false, feedback: 'No national courts existed under the Articles.' },
    ] },
  { externalKey: 'q-SS7CG15-027', benchmarkCode: 'SS.7.CG.1.5', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'Which statement correctly distinguishes the Articles of Confederation from the Constitution?', options: [
      { text: 'The Articles were the weak first government; the Constitution replaced them with a stronger national government', isCorrect: true, feedback: 'Correct! The Constitution replaced the weaker Articles.', misconceptionCode: 'M-OPLG-01' },
      { text: 'They are two names for the same document', isCorrect: false, feedback: 'They are different documents; the Constitution replaced the Articles.' },
      { text: 'The Constitution came first, then the Articles', isCorrect: false, feedback: 'The Articles came first (1781); the Constitution replaced them (1787).' },
      { text: 'The Articles created three strong branches', isCorrect: false, feedback: 'The Articles had only a weak Congress.' },
    ] },
  { externalKey: 'q-SS7CG15-028', benchmarkCode: 'SS.7.CG.1.5', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'A student says the Articles failed because the national government was "too powerful." Why is this incorrect?', options: [
      { text: 'The Articles failed because the national government was too WEAK — it could not tax, enforce laws, or maintain order', isCorrect: true, feedback: 'Correct! The Articles\' problem was weakness, not too much power.' },
      { text: 'The government taxed people too heavily', isCorrect: false, feedback: 'It could not tax at all.' },
      { text: 'The president had unlimited power', isCorrect: false, feedback: 'There was no president under the Articles.' },
      { text: 'The courts were too strong', isCorrect: false, feedback: 'There were no national courts.' },
    ] },
  { externalKey: 'q-SS7CG15-029', benchmarkCode: 'SS.7.CG.1.5', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'Which weakness of the Articles is correctly described?', options: [
      { text: 'Congress could not tax, so the government struggled to pay its debts', isCorrect: true, feedback: 'Correct! No taxing power left the government short of funds.' },
      { text: 'The president had veto power over Congress', isCorrect: false, feedback: 'There was no president under the Articles.' },
      { text: 'The Supreme Court overturned state laws', isCorrect: false, feedback: 'There were no national courts.' },
      { text: 'Amendments passed with a simple majority', isCorrect: false, feedback: 'Amendments required unanimous agreement.' },
    ] },
  { externalKey: 'q-SS7CG15-030', benchmarkCode: 'SS.7.CG.1.5', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'articles-weaknesses', remediationTag: 'remed-CG15-articles',
    prompt: 'Why did the weaknesses of the Articles of Confederation lead leaders to call the Constitutional Convention?', options: [
      { text: 'Repeated failures — no taxing power, no enforcement, and events like Shays\' Rebellion — convinced leaders the government had to be redesigned', isCorrect: true, feedback: 'Correct! The Articles\' failures motivated a stronger new framework.' },
      { text: 'The Articles worked perfectly, so no change was needed', isCorrect: false, feedback: 'Their failures are exactly why the Convention was called.' },
      { text: 'Britain ordered the colonies to write a new plan', isCorrect: false, feedback: 'Americans, not Britain, chose to replace the Articles.' },
      { text: 'The national government was too strong', isCorrect: false, feedback: 'It was too weak, which is why reform was needed.' },
    ] },
]

// ── SS.7.CG.1.6 — Creating the Constitution ──────────────────────────────────
const SS7CG16: QuestionSeedDef[] = [
  { externalKey: 'q-SS7CG16-016', benchmarkCode: 'SS.7.CG.1.6', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'What is a "compromise"?', options: [
      { text: 'An agreement in which each side gives up something to settle a dispute', isCorrect: true, feedback: 'Correct! A compromise means each side gives up part of what it wants.' },
      { text: 'A complete victory for one side', isCorrect: false, feedback: 'A compromise involves both sides giving something up, not total victory.' },
      { text: 'A British tax', isCorrect: false, feedback: 'A compromise is an agreement, not a tax.' },
      { text: 'A type of court', isCorrect: false, feedback: 'A compromise is an agreement to settle differences.' },
    ] },
  { externalKey: 'q-SS7CG16-017', benchmarkCode: 'SS.7.CG.1.6', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'The Great Compromise created a Congress with —', options: [
      { text: 'two houses: equal representation in the Senate and representation by population in the House', isCorrect: true, feedback: 'Correct! The Great Compromise created a bicameral Congress.' },
      { text: 'only one house with one vote per state', isCorrect: false, feedback: 'That was the Articles\' setup; the Great Compromise created two houses.' },
      { text: 'no legislature at all', isCorrect: false, feedback: 'It created a two-house Congress.' },
      { text: 'a single king', isCorrect: false, feedback: 'It created a legislature, not a monarchy.' },
    ] },
  { externalKey: 'q-SS7CG16-018', benchmarkCode: 'SS.7.CG.1.6', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'Small states fear large states will dominate Congress; large states want representation by population. The solution gives each state equal Senate seats but population-based House seats. This is the —', options: [
      { text: 'Great Compromise', isCorrect: true, feedback: 'Correct! The Great Compromise balanced large and small state interests.' },
      { text: 'Three-Fifths Compromise', isCorrect: false, feedback: 'That dealt with counting enslaved persons, not Senate/House structure.' },
      { text: 'Bill of Rights', isCorrect: false, feedback: 'The Bill of Rights protects individual rights, not representation structure.' },
      { text: 'Declaration of Independence', isCorrect: false, feedback: 'That is a 1776 document, not a Convention compromise.' },
    ] },
  { externalKey: 'q-SS7CG16-019', benchmarkCode: 'SS.7.CG.1.6', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'Delegates disagree about how to count enslaved people for representation and taxation. The agreement to count three-fifths of them is the —', options: [
      { text: 'Three-Fifths Compromise', isCorrect: true, feedback: 'Correct! The Three-Fifths Compromise counted three-fifths of enslaved persons.' },
      { text: 'Great Compromise', isCorrect: false, feedback: 'The Great Compromise dealt with Senate/House structure.' },
      { text: 'Mayflower Compact', isCorrect: false, feedback: 'That is a 1620 self-government agreement.' },
      { text: 'Stamp Act', isCorrect: false, feedback: 'That was a British tax, not a Convention compromise.' },
    ] },
  { externalKey: 'q-SS7CG16-020', benchmarkCode: 'SS.7.CG.1.6', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'A delegate refuses to support the Constitution unless individual rights are guaranteed in writing. This concern was most directly resolved by —', options: [
      { text: 'the promise to add a Bill of Rights', isCorrect: true, feedback: 'Correct! The promise of a Bill of Rights helped win ratification.' },
      { text: 'the Three-Fifths Compromise', isCorrect: false, feedback: 'That addressed representation, not individual rights.' },
      { text: 'the Great Compromise', isCorrect: false, feedback: 'That addressed state representation, not a rights guarantee.' },
      { text: 'salutary neglect', isCorrect: false, feedback: 'That is a British policy, unrelated to ratification.' },
    ] },
  { externalKey: 'q-SS7CG16-021', benchmarkCode: 'SS.7.CG.1.6', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'A historian argues the Constitution succeeded because the framers were willing to compromise. Which pair of examples BEST supports this claim?', options: [
      { text: 'The Great Compromise (large vs. small states) and the Three-Fifths Compromise (representation disputes)', isCorrect: true, feedback: 'Correct! Both were key compromises that made agreement possible.' },
      { text: 'The Stamp Act and the Townshend Acts', isCorrect: false, feedback: 'Those were British taxes, not Convention compromises.' },
      { text: 'The Magna Carta and the Mayflower Compact', isCorrect: false, feedback: 'Those are earlier documents, not 1787 Convention compromises.' },
      { text: 'Shays\' Rebellion and salutary neglect', isCorrect: false, feedback: 'Those are events/policies, not Convention compromises.' },
    ] },
  { externalKey: 'q-SS7CG16-022', benchmarkCode: 'SS.7.CG.1.6', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'A Federalist writes: "A firm Union will be of the utmost moment to the peace and liberty of the States." The author is arguing for —', options: [
      { text: 'ratifying the Constitution to create a stronger national union', isCorrect: true, feedback: 'Correct! Federalists argued a stronger union would protect peace and liberty.' },
      { text: 'keeping the weak Articles of Confederation', isCorrect: false, feedback: 'Federalists wanted to replace the Articles with a stronger union.' },
      { text: 'returning to British rule', isCorrect: false, feedback: 'They argued for an American union, not British rule.' },
      { text: 'abolishing all government', isCorrect: false, feedback: 'They argued for a firmer union, not no government.' },
    ] },
  { externalKey: 'q-SS7CG16-023', benchmarkCode: 'SS.7.CG.1.6', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'An Anti-Federalist warns: "Without a bill of rights, the new government may trample the liberties of the people." This argument was used to demand —', options: [
      { text: 'adding a Bill of Rights to the Constitution', isCorrect: true, feedback: 'Correct! Anti-Federalists demanded explicit protections for rights.' },
      { text: 'removing Congress entirely', isCorrect: false, feedback: 'They wanted rights protections, not to remove Congress.' },
      { text: 'keeping the king', isCorrect: false, feedback: 'They wanted a bill of rights, not a monarchy.' },
      { text: 'raising taxes', isCorrect: false, feedback: 'Their concern was protecting liberties, not taxes.' },
    ] },
  { externalKey: 'q-SS7CG16-024', benchmarkCode: 'SS.7.CG.1.6', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'Two excerpts: a Federalist praises a "strong national government," while an Anti-Federalist fears "too much power far from the people." What core disagreement do these reveal?', options: [
      { text: 'How much power the national government should have versus the states and the people', isCorrect: true, feedback: 'Correct! The debate centered on the strength of national vs. state/people power.', misconceptionCode: 'M-OPLG-12' },
      { text: 'Whether to declare independence from Britain', isCorrect: false, feedback: 'Independence was already won; this was about the Constitution.' },
      { text: 'Whether to keep the Mayflower Compact', isCorrect: false, feedback: 'The debate was about the new Constitution, not the Compact.' },
      { text: 'Whether taxes should exist at all', isCorrect: false, feedback: 'The core issue was the balance of national power.' },
    ] },
  { externalKey: 'q-SS7CG16-025', benchmarkCode: 'SS.7.CG.1.6', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'A table compares the two sides:\n| Group | Position |\n| Federalists | support the Constitution / stronger national government |\n| Anti-Federalists | ??? |\nWhich best completes the table?', options: [
      { text: 'oppose without a bill of rights / fear too much central power', isCorrect: true, feedback: 'Correct! Anti-Federalists feared central power and demanded a bill of rights.' },
      { text: 'support unlimited royal power', isCorrect: false, feedback: 'Anti-Federalists feared concentrated power, not supported monarchy.' },
      { text: 'want to keep British rule', isCorrect: false, feedback: 'Both sides were American; neither wanted British rule.' },
      { text: 'demand no government at all', isCorrect: false, feedback: 'They wanted protections and limits, not no government.' },
    ] },
  { externalKey: 'q-SS7CG16-026', benchmarkCode: 'SS.7.CG.1.6', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'A flowchart shows: Convention debate → compromises → Constitution → promise of Bill of Rights → ratification. What does it best show?', options: [
      { text: 'Compromise and the promise of rights helped the Constitution get ratified', isCorrect: true, feedback: 'Correct! Compromises and the Bill of Rights promise led to ratification.' },
      { text: 'The Constitution was ratified with no disagreement', isCorrect: false, feedback: 'The flowchart shows debate and compromise.' },
      { text: 'The Articles were never replaced', isCorrect: false, feedback: 'The Constitution replaced the Articles.' },
      { text: 'Britain wrote the Constitution', isCorrect: false, feedback: 'Americans wrote it at the Convention.' },
    ] },
  { externalKey: 'q-SS7CG16-027', benchmarkCode: 'SS.7.CG.1.6', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'Which statement about the Constitutional Convention is CORRECT?', options: [
      { text: 'Delegates reached major compromises, like the Great Compromise, to create a workable government', isCorrect: true, feedback: 'Correct! Compromise made the new government possible.' },
      { text: 'All the Founders agreed on everything immediately', isCorrect: false, feedback: 'There were major disagreements requiring compromise.', misconceptionCode: 'M-OPLG-12' },
      { text: 'The Convention kept the Articles unchanged', isCorrect: false, feedback: 'It produced a new Constitution.' },
      { text: 'The Convention was run by the British king', isCorrect: false, feedback: 'American delegates ran the Convention.' },
    ] },
  { externalKey: 'q-SS7CG16-028', benchmarkCode: 'SS.7.CG.1.6', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'A student says the Constitution and the Articles of Confederation are the same thing. What is the BEST correction?', options: [
      { text: 'They are different: the Constitution replaced the weaker Articles with a stronger framework of three branches', isCorrect: true, feedback: 'Correct! The Constitution replaced the Articles.', misconceptionCode: 'M-OPLG-01' },
      { text: 'They are identical documents', isCorrect: false, feedback: 'They are distinct; the Constitution replaced the Articles.' },
      { text: 'The Articles came after the Constitution', isCorrect: false, feedback: 'The Articles came first, then the Constitution.' },
      { text: 'Both created a king', isCorrect: false, feedback: 'Neither created a king; the Constitution created three branches.' },
    ] },
  { externalKey: 'q-SS7CG16-029', benchmarkCode: 'SS.7.CG.1.6', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'How did the Constitution fix a key weakness of the Articles of Confederation?', options: [
      { text: 'It gave Congress the power to tax and created executive and judicial branches', isCorrect: true, feedback: 'Correct! The Constitution added taxing power and the missing branches.' },
      { text: 'It removed Congress entirely', isCorrect: false, feedback: 'It strengthened Congress and added branches.' },
      { text: 'It required all states to agree to every law', isCorrect: false, feedback: 'That unanimity was an Articles weakness the Constitution fixed.' },
      { text: 'It kept the government from collecting any taxes', isCorrect: false, feedback: 'It gave the government the power to tax.' },
    ] },
  { externalKey: 'q-SS7CG16-030', benchmarkCode: 'SS.7.CG.1.6', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'constitutional-convention', remediationTag: 'remed-CG16-constitution',
    prompt: 'Why were the compromises at the Constitutional Convention essential to creating the new government?', options: [
      { text: 'Without them, states with competing interests (large vs. small, different regions) could not have agreed on a single framework', isCorrect: true, feedback: 'Correct! Compromise reconciled competing interests so the framework could be adopted.' },
      { text: 'They were unnecessary because everyone already agreed', isCorrect: false, feedback: 'Deep disagreements made compromise essential.' },
      { text: 'They were forced on the colonies by Britain', isCorrect: false, feedback: 'Americans negotiated them, not Britain.' },
      { text: 'They weakened the government back to the Articles', isCorrect: false, feedback: 'They produced a stronger government than the Articles.' },
    ] },
]

// ── Aggregation ──────────────────────────────────────────────────────────────

export const UNIT1_BACKFILL_BY_BENCHMARK: Record<string, QuestionSeedDef[]> = {
  'SS.7.CG.1.1': SS7CG11,
  'SS.7.CG.1.2': SS7CG12,
  'SS.7.CG.1.3': SS7CG13,
  'SS.7.CG.1.4': SS7CG14,
  'SS.7.CG.1.5': SS7CG15,
  'SS.7.CG.1.6': SS7CG16,
}

/** Unit 1 benchmarks now at the full 30 (15 original APPROVED + 15 backfill). */
export const UNIT1_COMPLETE_BENCHMARKS: string[] = Object.keys(UNIT1_BACKFILL_BY_BENCHMARK)

const ALL_BACKFILL: QuestionSeedDef[] = Object.values(UNIT1_BACKFILL_BY_BENCHMARK).flat()

export async function seedUnit1Backfill(prisma: PrismaClient): Promise<void> {
  const count = await seedQuestionDefs(prisma, ALL_BACKFILL, {
    sourceTier: 'C',
    approvalStatus: 'NEEDS_REVIEW',
  })
  console.log(`  ✓ Unit 1 backfill seeded (${count} questions → 30/benchmark, Tier C / NEEDS_REVIEW)`)
}
