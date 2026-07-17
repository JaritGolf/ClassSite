/**
 * Seed: INTERIM banks for official SS.7.CG.1.1 and SS.7.CG.1.2 (ADR 0017).
 *
 * The 2026-07-16 standards realignment repurposed two benchmark rows to the
 * official meanings of 1.1 (ancient Greece / Rome / Judeo-Christian influences)
 * and 1.2 (founding principles of law and government) — codes that previously
 * carried different content and therefore had NO bank under their official
 * meaning. These 30-question banks were authored so numeric mission order works
 * immediately (an empty first mission would block sequential unlock).
 *
 * ⚠ INTERIM CONTENT — the owner has flagged both blocks for a FULL content
 * build (questions, lesson, media, stimuli) in a later wave; tracked in the
 * CLAUDE.md backlog. Authored against the verbatim official statements in
 * seed/official_standards.ts.
 *
 * externalKeys use the `R` (realigned) infix — `q-SS7CG11R-*` / `q-SS7CG12R-*` —
 * because the plain `q-SS7CG11-*` / `q-SS7CG12-*` sequences are FROZEN on the
 * rows they were authored for (now coded 1.4 / 1.3).
 *
 * Approval: APPROVED / Tier D per ADR 0013 (owner-directed — Unit 1 is a
 * completed unit and must stay turnkey).
 *
 * Per-benchmark targets (= seed/questions/unit2.ts template, 30 questions):
 *   §13.2 categories : vocabulary 4 · basic 4 · scenario 8 · source 4 · chart 3 ·
 *                      misconception 3 · eoc-mixed 4
 *   Reading-load     : level-1 ×9 · level-2 ×15 · level-3 ×6
 *   Complexity       : LOW ×6 · MODERATE ×17 · HIGH ×7
 */

import type { PrismaClient } from '@prisma/client'
import { seedQuestionDefs, type QuestionSeedDef } from './_seeder'
import { CONTENT_APPROVAL } from '../approval_mode'

// ── SS.7.CG.1.1 — Ancient Greece, Rome, and the Judeo-Christian Tradition ────
// Skill tag: ancient-influences  |  Remediation: remed-CG11-ancient-influences

const SS7CG11R: QuestionSeedDef[] = [
  // vocabulary ×4
  { externalKey: 'q-SS7CG11R-001', benchmarkCode: 'SS.7.CG.1.1', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'What is a republic?', options: [
      { text: 'A government in which citizens elect representatives to make laws for them', isCorrect: true, feedback: 'Correct! In a republic, the people hold the power but exercise it through elected representatives — an idea the United States took from ancient Rome.' },
      { text: 'A government in which all citizens vote directly on every law', isCorrect: false, feedback: 'That is a direct democracy, like ancient Athens. A republic works through elected representatives.', misconceptionCode: 'M-OPLG-06' },
      { text: 'A government ruled by a king or queen', isCorrect: false, feedback: 'That is a monarchy. A republic has no hereditary ruler — leaders are chosen by the people.' },
      { text: 'A government run by religious leaders', isCorrect: false, feedback: 'That is a theocracy. In a republic, power comes from the citizens through elections.' },
    ] },
  { externalKey: 'q-SS7CG11R-002', benchmarkCode: 'SS.7.CG.1.1', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'What is a direct democracy?', options: [
      { text: 'A government in which citizens vote on laws and decisions themselves, without representatives', isCorrect: true, feedback: 'Correct! In a direct democracy — practiced in ancient Athens — citizens gathered and voted on the laws personally.' },
      { text: 'A government in which citizens elect lawmakers to decide for them', isCorrect: false, feedback: 'That is a republic (representative democracy). In a DIRECT democracy, citizens vote on the laws themselves.' },
      { text: 'A government in which the strongest leader makes all decisions', isCorrect: false, feedback: 'That is an autocracy. Direct democracy puts decisions in the hands of the citizens.' },
      { text: 'A government in which judges write the laws', isCorrect: false, feedback: 'Judges interpret laws. In a direct democracy, citizens themselves vote on the laws.' },
    ] },
  { externalKey: 'q-SS7CG11R-003', benchmarkCode: 'SS.7.CG.1.1', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'What is civic virtue?', options: [
      { text: 'Putting the good of the community above your own personal interests', isCorrect: true, feedback: 'Correct! Civic virtue — an ideal the founders admired in the Roman Republic — means serving the common good, not just yourself.' },
      { text: 'Obeying only the laws you agree with', isCorrect: false, feedback: 'Civic virtue means serving the whole community — including following laws you may personally dislike.' },
      { text: 'Winning as much political power as possible', isCorrect: false, feedback: 'The opposite — civic virtue means using power for the community and giving it up when your service is done.' },
      { text: 'Keeping your opinions about government private', isCorrect: false, feedback: 'Civic virtue is active — participating, serving, and contributing to the community.' },
    ] },
  { externalKey: 'q-SS7CG11R-004', benchmarkCode: 'SS.7.CG.1.1', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'In ancient Athens, what did it mean to be a "citizen"?', options: [
      { text: 'A member of the community with the right to take part in government', isCorrect: true, feedback: 'Correct! Athenian citizens could speak and vote in the assembly. (In Athens the right was limited to free adult men — far narrower than citizenship today.)' },
      { text: 'Anyone who lived inside the city walls', isCorrect: false, feedback: 'Many residents of Athens — women, enslaved people, foreigners — were not citizens. Citizenship meant the right to participate in government.' },
      { text: 'A soldier serving in the army', isCorrect: false, feedback: 'Citizens often served as soldiers, but citizenship itself meant membership and participation in the government of the community.' },
      { text: 'A person who paid taxes to the king', isCorrect: false, feedback: 'Athens had no king during its democracy. Citizenship meant participating in government, not paying tribute.' },
    ] },
  // basic_concept ×4
  { externalKey: 'q-SS7CG11R-005', benchmarkCode: 'SS.7.CG.1.1', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Which ancient civilization is known for practicing direct democracy?', options: [
      { text: 'Ancient Greece (Athens)', isCorrect: true, feedback: 'Correct! Athenian citizens gathered in the assembly to debate and vote on laws directly.' },
      { text: 'Ancient Rome', isCorrect: false, feedback: 'Rome was a republic — citizens elected representatives such as senators and consuls.' },
      { text: 'Ancient Egypt', isCorrect: false, feedback: 'Egypt was ruled by pharaohs. Direct democracy was practiced in Athens.' },
      { text: 'The Persian Empire', isCorrect: false, feedback: 'Persia was ruled by emperors. Direct democracy was practiced in Athens.' },
    ] },
  { externalKey: 'q-SS7CG11R-006', benchmarkCode: 'SS.7.CG.1.1', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Which idea did the United States take most directly from ancient Rome?', options: [
      { text: 'A republic in which citizens elect representatives to govern', isCorrect: true, feedback: 'Correct! The Roman Republic — with its elected senate and officials — was the founders\' model for American representative government.' },
      { text: 'Citizens voting directly on every law', isCorrect: false, feedback: 'That was Athens\' direct democracy. Rome contributed the republic — government through elected representatives.', misconceptionCode: 'M-OPLG-06' },
      { text: 'Rule by a royal family', isCorrect: false, feedback: 'The Roman Republic overthrew its kings — that rejection of monarchy is part of what inspired the founders.' },
      { text: 'Government controlled by priests', isCorrect: false, feedback: 'Rome\'s republic was governed by elected officials and the senate, not by priests.' },
    ] },
  { externalKey: 'q-SS7CG11R-007', benchmarkCode: 'SS.7.CG.1.1', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Why were Rome\'s Twelve Tables important to the development of law?', options: [
      { text: 'They wrote the laws down and displayed them publicly, so every citizen could know the law', isCorrect: true, feedback: 'Correct! Written, public law meant rules could not be changed secretly by the powerful — an ancestor of the American idea of a written constitution.' },
      { text: 'They gave the emperor unlimited power to make laws', isCorrect: false, feedback: 'The Twelve Tables did the opposite — writing laws down LIMITED what the powerful could claim the law said.' },
      { text: 'They were the first laws to allow direct democracy', isCorrect: false, feedback: 'The Twelve Tables were about making Roman law written and public, not about direct democracy (that was Athens).' },
      { text: 'They banned ordinary citizens from reading the law', isCorrect: false, feedback: 'The opposite — the tables were posted publicly precisely so ordinary citizens could know the law.' },
    ] },
  { externalKey: 'q-SS7CG11R-008', benchmarkCode: 'SS.7.CG.1.1', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Which ideas did the Judeo-Christian tradition contribute to America\'s constitutional republic?', options: [
      { text: 'A moral law that stands above every ruler, and the equal worth of every individual', isCorrect: true, feedback: 'Correct! The idea that even kings answer to a higher law, and that every person has worth, shaped American beliefs about rule of law and individual rights.' },
      { text: 'The election of senators and consuls', isCorrect: false, feedback: 'Elected officials came from the Roman Republic. The Judeo-Christian contribution was moral: a law above rulers and the worth of each person.' },
      { text: 'Citizens voting directly in an assembly', isCorrect: false, feedback: 'That practice came from Athens. The Judeo-Christian tradition contributed ideas about moral law and human worth.' },
      { text: 'The requirement that leaders be religious officials', isCorrect: false, feedback: 'The American founders separated church offices from government offices. The tradition\'s influence was its moral ideas, not religious rule.' },
    ] },
  // scenario ×8
  { externalKey: 'q-SS7CG11R-009', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Every citizen of a small town gathers in the gym to debate and vote directly on whether to build a new park. This process is MOST similar to government in —', options: [
      { text: 'ancient Athens, where citizens voted on laws themselves', isCorrect: true, feedback: 'Correct! Voting directly on decisions — not through representatives — is the Athenian model of direct democracy.' },
      { text: 'ancient Rome, where citizens elected senators to decide', isCorrect: false, feedback: 'Rome\'s republic worked through elected representatives. Voting directly on the decision itself is the Athenian model.' },
      { text: 'a monarchy, where the ruler decides for everyone', isCorrect: false, feedback: 'No single ruler is deciding here — all citizens are voting directly, like in Athens.' },
      { text: 'the Judeo-Christian tradition of moral law', isCorrect: false, feedback: 'That tradition contributed ideas about law and human worth — the town-meeting vote reflects Athenian direct democracy.' },
    ] },
  { externalKey: 'q-SS7CG11R-010', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Voters in a Florida district elect a state representative to write and vote on laws for them in Tallahassee. This practice traces MOST directly to —', options: [
      { text: 'the Roman Republic, where citizens elected officials to govern on their behalf', isCorrect: true, feedback: 'Correct! Electing representatives to govern for you is the republican model the founders took from Rome.' },
      { text: 'Athenian direct democracy, where citizens voted on each law', isCorrect: false, feedback: 'In Athens citizens voted on laws directly. Electing a representative to vote FOR you is the Roman republican model.', misconceptionCode: 'M-OPLG-06' },
      { text: 'the rule of the pharaohs in ancient Egypt', isCorrect: false, feedback: 'Pharaohs ruled without elections. Elected representatives come from the Roman republican tradition.' },
      { text: 'the divine right of kings in medieval Europe', isCorrect: false, feedback: 'Divine right claimed power came from God to the king. Electing representatives reflects the Roman Republic.' },
    ] },
  { externalKey: 'q-SS7CG11R-011', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'A governor argues she cannot be investigated because she leads the state. A judge replies that no leader is above the law, because law rests on a moral standard that binds everyone equally. The judge\'s reasoning reflects which ancient influence?', options: [
      { text: 'The Judeo-Christian idea of a higher moral law that applies even to rulers', isCorrect: true, feedback: 'Correct! The tradition that rulers answer to a law above themselves fed directly into the American rule of law.' },
      { text: 'The Athenian practice of choosing officials by lottery', isCorrect: false, feedback: 'Athens\' lottery selected officials — it doesn\'t explain why a leader must obey the law. That idea reflects a higher moral law binding rulers.' },
      { text: 'The Roman practice of electing two consuls', isCorrect: false, feedback: 'Divided executive power is a Roman structural idea. A moral law standing above every ruler reflects the Judeo-Christian tradition.' },
      { text: 'The Greek tradition of trial by jury', isCorrect: false, feedback: 'Juries decide cases — the judge\'s point is that a higher law binds even leaders, an idea from the Judeo-Christian tradition.' },
    ] },
  { externalKey: 'q-SS7CG11R-012', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'The framers admired Athenian democracy but chose a republic for the United States. Considering that the new nation had nearly four million people spread across thirteen states, which reasoning BEST explains their choice?', options: [
      { text: 'Direct democracy requires citizens to gather and vote personally, which is impractical for a large nation — representatives can act for citizens across great distances', isCorrect: true, feedback: 'Correct! Athens was a single city; the United States was a vast country. A republic scales — representatives carry the people\'s voice where the people cannot gather.' },
      { text: 'The framers believed ordinary citizens should have no voice in government at all', isCorrect: false, feedback: 'The republic still rests on the people\'s voice — citizens choose the representatives. The founders rejected pure direct democracy\'s practicality, not popular government.' },
      { text: 'Rome had conquered Greece, proving republics always defeat democracies', isCorrect: false, feedback: 'Military history wasn\'t the reasoning — the practical impossibility of gathering millions of citizens to vote on every law was.' },
      { text: 'Direct democracy was forbidden by the king of England', isCorrect: false, feedback: 'The United States had already broken from the king. The choice of a republic was about scale and stability, not British rules.' },
    ] },
  { externalKey: 'q-SS7CG11R-013', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Rome carved its laws onto twelve bronze tables and posted them in the public forum for all to read. Which feature of American government MOST directly echoes this practice?', options: [
      { text: 'A written Constitution and published laws that everyone can read and hold the government to', isCorrect: true, feedback: 'Correct! Written, public law — from the Twelve Tables to the U.S. Constitution — lets citizens know the rules and hold officials to them.' },
      { text: 'Secret ballots in presidential elections', isCorrect: false, feedback: 'Secret ballots protect voter privacy. The Twelve Tables were about making the LAW itself public and written.' },
      { text: 'The president\'s power to veto bills', isCorrect: false, feedback: 'The veto is a check between branches. The Twelve Tables\' legacy is written, publicly known law.' },
      { text: 'Congress meeting behind closed doors', isCorrect: false, feedback: 'Closed sessions are the opposite of the Twelve Tables\' lesson — law and lawmaking open to the public.' },
    ] },
  { externalKey: 'q-SS7CG11R-014', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'The Roman leader Cincinnatus was given emergency power to save Rome, defeated the threat in sixteen days, then immediately gave up power and returned to his farm. George Washington was often compared to him. What ideal does this story celebrate?', options: [
      { text: 'Civic virtue — serving the community and giving up power when the service is done', isCorrect: true, feedback: 'Correct! Cincinnatus (and Washington, who stepped down after two terms) modeled civic virtue: power held for the common good, not for oneself.' },
      { text: 'Direct democracy — letting all citizens vote on every decision', isCorrect: false, feedback: 'The story is about a leader\'s character, not a voting system. Giving up power for the common good is civic virtue.' },
      { text: 'Divine right — rulers receiving their power from the gods', isCorrect: false, feedback: 'Cincinnatus\' power came from the republic and he returned it — the opposite of a divine, permanent claim to rule.' },
      { text: 'Hereditary monarchy — passing power to your children', isCorrect: false, feedback: 'Cincinnatus gave power back to the republic instead of keeping or passing it on — that\'s civic virtue.' },
    ] },
  { externalKey: 'q-SS7CG11R-015', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'A student is building a chart of Roman influences on the U.S. government. Which feature belongs on the chart?', options: [
      { text: 'The Senate — an assembly of elected representatives', isCorrect: true, feedback: 'Correct! The U.S. Senate even takes its name from the Roman Senate — Rome\'s model of governing through elected representatives.' },
      { text: 'Trial by a jury of ordinary citizens drawn by lot, invented in Athens', isCorrect: false, feedback: 'Citizen juries trace to Athens, not Rome. The Senate is the Roman contribution.' },
      { text: 'The requirement that presidents be born in the United States', isCorrect: false, feedback: 'That qualification is an American constitutional rule, not a Roman institution.' },
      { text: 'The Electoral College', isCorrect: false, feedback: 'The Electoral College was an American invention. Rome\'s clearest legacy is the elected Senate.' },
    ] },
  { externalKey: 'q-SS7CG11R-016', benchmarkCode: 'SS.7.CG.1.1', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'John Adams, Thomas Jefferson, and James Madison studied the histories of Athens and Rome intensely before designing the U.S. government. Which statement BEST explains why?', options: [
      { text: 'They wanted to learn why earlier democracies and republics had succeeded or collapsed, so the new nation could copy the strengths and avoid the failures', isCorrect: true, feedback: 'Correct! The founders treated Athens and Rome as case studies — Madison\'s notes for the Constitutional Convention are full of lessons drawn from ancient governments\' failures.' },
      { text: 'They planned to restore the ancient Roman Empire in North America', isCorrect: false, feedback: 'The founders studied Rome\'s REPUBLIC as a model and its fall into empire as a warning — they weren\'t recreating an empire.' },
      { text: 'Ancient history was required reading for all colonial lawyers, so they had no choice', isCorrect: false, feedback: 'They chose these studies deliberately — hunting for design lessons about what makes free government last.' },
      { text: 'They believed ancient governments were perfect and should be copied exactly', isCorrect: false, feedback: 'They saw serious flaws in both Athens and Rome — that\'s exactly why they studied them: to improve on the ancient designs.' },
    ] },
  // source_analysis ×4
  { externalKey: 'q-SS7CG11R-017', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'The Athenian leader Pericles said: "Our constitution is called a democracy because power is in the hands not of a minority but of the whole people." Which feature of Athens does this quote describe?', options: [
      { text: 'Citizens participating directly in the decisions of government', isCorrect: true, feedback: 'Correct! Pericles is celebrating direct democracy — power exercised by the whole body of citizens, not a small ruling group.' },
      { text: 'A senate of elected representatives making the laws', isCorrect: false, feedback: 'An elected senate was Rome\'s model. Pericles describes power in the hands of the whole people — direct democracy.' },
      { text: 'A king sharing some power with nobles', isCorrect: false, feedback: 'Pericles says power belongs to the whole people — not to a king or nobles at all.' },
      { text: 'Judges chosen for life by religious leaders', isCorrect: false, feedback: 'The quote is about the people holding power — Athens\' direct democracy.' },
    ] },
  { externalKey: 'q-SS7CG11R-018', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'The Greek historian Polybius wrote that Rome\'s government succeeded because power was divided among the consuls, the Senate, and the people, so that "no single part can outweigh the others." Which American constitutional principle most clearly grew from this observation?', options: [
      { text: 'Separating government power among branches that balance one another', isCorrect: true, feedback: 'Correct! Polybius\' description of Rome\'s mixed, balanced government is an ancestor of American separation of powers and checks and balances.' },
      { text: 'Guaranteeing every citizen a jury trial', isCorrect: false, feedback: 'Jury trials have other roots. Polybius is describing divided and balanced POWER — the ancestor of separation of powers.' },
      { text: 'Requiring elections every two years', isCorrect: false, feedback: 'Election schedules aren\'t the point of the passage — the division of power among parts that check each other is.' },
      { text: 'Letting states keep powers not given to the national government', isCorrect: false, feedback: 'That is federalism, a different kind of division. Polybius describes balancing power among parts of ONE government — like the three branches.' },
    ] },
  { externalKey: 'q-SS7CG11R-019', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'An ancient Hebrew law commands judges: "You shall not pervert justice; you shall not show partiality... justice, and only justice, you shall follow." Which American ideal does this MOST directly foreshadow?', options: [
      { text: 'Equal justice under law — the same law applied fairly to every person', isCorrect: true, feedback: 'Correct! The command that judges treat every person alike under the law feeds the American ideals of equal justice and the rule of law.' },
      { text: 'The right to vote in free elections', isCorrect: false, feedback: 'The passage is about fair judging, not voting — its legacy is equal justice under law.' },
      { text: 'Freedom of speech and press', isCorrect: false, feedback: 'The command addresses judges applying the law equally — the root of equal justice, not expression rights.' },
      { text: 'The separation of church and state', isCorrect: false, feedback: 'The passage\'s legacy is its standard of impartial, equal justice — an idea the founders built into the rule of law.' },
    ] },
  { externalKey: 'q-SS7CG11R-020', benchmarkCode: 'SS.7.CG.1.1', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Source A (Athens): "The people themselves debate and decide the laws in assembly." Source B (Rome): "The citizens choose magistrates and senators, who deliberate and decide on the people\'s behalf." What key difference do these sources reveal?', options: [
      { text: 'Athens practiced direct democracy while Rome governed through elected representatives', isCorrect: true, feedback: 'Correct! Both systems rest on citizen power — but Athens exercised it directly, while Rome exercised it through chosen representatives. The United States followed Rome\'s representative model.' },
      { text: 'Athens was ruled by kings while Rome was ruled by the people', isCorrect: false, feedback: 'Both sources describe citizen-powered governments — the difference is direct versus representative decision-making.' },
      { text: 'Rome allowed all residents to vote while Athens allowed none', isCorrect: false, feedback: 'Both limited who counted as a citizen. The sources contrast HOW citizens exercised power: directly (Athens) versus through representatives (Rome).' },
      { text: 'Athens had written laws while Rome\'s laws were secret', isCorrect: false, feedback: 'Rome famously wrote its laws on the public Twelve Tables. The contrast here is direct versus representative government.' },
    ] },
  // chart_visual ×3
  { externalKey: 'q-SS7CG11R-021', benchmarkCode: 'SS.7.CG.1.1', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'A table lists ancient influences:\n| Source | Contribution |\n| Ancient Greece | direct democracy — citizens vote themselves |\n| Ancient Rome | ??? |\nWhich best completes the table?', options: [
      { text: 'A republic — citizens elect representatives to govern', isCorrect: true, feedback: 'Correct! Rome\'s contribution was the republic: government through elected representatives.' },
      { text: 'Rule by pharaohs', isCorrect: false, feedback: 'Pharaohs ruled Egypt. Rome contributed the republic.' },
      { text: 'A moral law above all rulers', isCorrect: false, feedback: 'That is the Judeo-Christian tradition\'s contribution. Rome contributed the republic.' },
      { text: 'Trial by combat', isCorrect: false, feedback: 'Rome\'s lasting contribution to American government was the republic — elected representative government.' },
    ] },
  { externalKey: 'q-SS7CG11R-022', benchmarkCode: 'SS.7.CG.1.1', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'A flowchart reads: Greek democracy + Roman republic + Judeo-Christian moral law → colonists\' ideas about government → U.S. constitutional republic. What does the flowchart best show?', options: [
      { text: 'America\'s constitutional republic was built on ideas inherited from ancient civilizations and traditions', isCorrect: true, feedback: 'Correct! The chart traces how ancient ideas flowed into the founders\' thinking and finally into the design of American government.' },
      { text: 'The United States copied one ancient government exactly', isCorrect: false, feedback: 'The chart shows MULTIPLE sources combining — the founders blended Greek, Roman, and Judeo-Christian ideas into something new.' },
      { text: 'Ancient governments still rule America today', isCorrect: false, feedback: 'The arrows show influence over time, not ancient civilizations governing today.' },
      { text: 'The colonists invented all their ideas about government from scratch', isCorrect: false, feedback: 'The chart shows the opposite — the colonists inherited and adapted much older ideas.' },
    ] },
  { externalKey: 'q-SS7CG11R-023', benchmarkCode: 'SS.7.CG.1.1', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'A Venn diagram compares direct democracy and a republic. Which statement belongs in the OVERLAP (true of both)?', options: [
      { text: 'Government power comes from the citizens', isCorrect: true, feedback: 'Correct! Both systems rest on the people\'s authority — they differ in whether citizens decide directly or through representatives.' },
      { text: 'Citizens vote personally on every law', isCorrect: false, feedback: 'That belongs only on the direct-democracy side.' },
      { text: 'Elected representatives make the laws', isCorrect: false, feedback: 'That belongs only on the republic side.' },
      { text: 'A hereditary ruler holds final power', isCorrect: false, feedback: 'Neither system has a hereditary ruler — that belongs outside both circles.' },
    ] },
  // misconception_check ×3
  { externalKey: 'q-SS7CG11R-024', benchmarkCode: 'SS.7.CG.1.1', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences', misconceptionCode: 'M-OPLG-06',
    prompt: 'A student says: "The United States is a direct democracy, just like ancient Athens." What is the BEST correction?', options: [
      { text: 'The United States is a constitutional republic — citizens elect representatives rather than voting directly on every law, following Rome\'s model more than Athens\'s', isCorrect: true, feedback: 'Correct! The founders deliberately chose a representative republic. Citizens hold the power, but they exercise most of it through elected representatives.' },
      { text: 'The student is right — Americans vote directly on all national laws', isCorrect: false, feedback: 'Americans elect representatives who vote on national laws — the United States is a republic, not a direct democracy.', misconceptionCode: 'M-OPLG-06' },
      { text: 'The United States is a monarchy because the president serves like a king', isCorrect: false, feedback: 'The president is elected and limited by the Constitution — nothing like a hereditary king. The right correction is that the U.S. is a constitutional republic.' },
      { text: 'Athens actually had no democracy, so the comparison is meaningless', isCorrect: false, feedback: 'Athens genuinely practiced direct democracy. The correction is about the United States, which chose the representative (republican) model instead.' },
    ] },
  { externalKey: 'q-SS7CG11R-025', benchmarkCode: 'SS.7.CG.1.1', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'A student claims: "The founders invented the idea of a republic completely from scratch." What is the BEST correction?', options: [
      { text: 'The republic was an ancient Roman idea — the founders studied it and adapted it for the United States', isCorrect: true, feedback: 'Correct! The founders were borrowers and improvers: Rome supplied the republican model, which they adapted with new safeguards.' },
      { text: 'The student is right — no republic existed before 1776', isCorrect: false, feedback: 'The Roman Republic governed for nearly 500 years before the United States existed.' },
      { text: 'The republic was invented by ancient Athens', isCorrect: false, feedback: 'Athens practiced DIRECT democracy. The republic — representative government — was Rome\'s model.', misconceptionCode: 'M-OPLG-06' },
      { text: 'The republic was invented by the British king', isCorrect: false, feedback: 'Britain was a monarchy. The republican model the founders adapted came from ancient Rome.' },
    ] },
  { externalKey: 'q-SS7CG11R-026', benchmarkCode: 'SS.7.CG.1.1', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Which statement about the ancient influences on American government is CORRECT?', options: [
      { text: 'The founders combined Greek, Roman, and Judeo-Christian ideas rather than copying any single ancient model', isCorrect: true, feedback: 'Correct! Direct participation (Greece), representative institutions (Rome), and a moral law above rulers (Judeo-Christian tradition) were blended into a new design.' },
      { text: 'The United States government is an exact copy of the Roman Republic', isCorrect: false, feedback: 'The founders borrowed from Rome but changed a great deal — adding a written constitution, federalism, and stronger checks.' },
      { text: 'Ancient Greece contributed the idea of electing senators', isCorrect: false, feedback: 'The Senate is a Roman institution. Greece\'s contribution was direct citizen participation.', misconceptionCode: 'M-OPLG-06' },
      { text: 'The Judeo-Christian tradition contributed the practice of voting by ballot', isCorrect: false, feedback: 'Its contribution was moral — a higher law binding rulers and the worth of every person — not voting mechanics.' },
    ] },
  // eoc_mixed ×4
  { externalKey: 'q-SS7CG11R-027', benchmarkCode: 'SS.7.CG.1.1', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Which pairing of an ancient source with its influence on America\'s constitutional republic is correct?', options: [
      { text: 'Ancient Rome — a republic governed by elected representatives', isCorrect: true, feedback: 'Correct! Rome modeled representative government; Greece modeled direct participation; the Judeo-Christian tradition contributed moral law and individual worth.' },
      { text: 'Ancient Greece — the first written national constitution', isCorrect: false, feedback: 'Athens contributed direct democracy. The written-constitution idea drew on Rome\'s written Twelve Tables and later English documents.' },
      { text: 'The Judeo-Christian tradition — the two-consul executive', isCorrect: false, feedback: 'Divided executive offices were Roman. The Judeo-Christian tradition contributed the higher moral law and equal worth of persons.' },
      { text: 'Ancient Rome — citizens voting directly on all laws', isCorrect: false, feedback: 'Direct voting was Athens. Rome governed through elected representatives.', misconceptionCode: 'M-OPLG-06' },
    ] },
  { externalKey: 'q-SS7CG11R-028', benchmarkCode: 'SS.7.CG.1.1', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'The founders especially admired the Roman Republic over other ancient governments. Which combination of Roman features BEST explains that admiration?', options: [
      { text: 'Elected representatives, written public law, and leaders expected to serve with civic virtue', isCorrect: true, feedback: 'Correct! Representation, written law (the Twelve Tables), and the ideal of civic virtue were exactly the features the founders built into the American republic.' },
      { text: 'A permanent emperor, a large army, and conquest of neighbors', isCorrect: false, feedback: 'Those describe the later Roman EMPIRE — the era the founders treated as a warning, not a model.' },
      { text: 'Rule by priests interpreting the will of the gods', isCorrect: false, feedback: 'The Roman Republic was governed by elected officials and the Senate, not priests — and that civil, elected structure is what the founders admired.' },
      { text: 'Every citizen voting directly on every law in the forum', isCorrect: false, feedback: 'That describes Athenian direct democracy. Rome\'s appeal was representative government under written law.', misconceptionCode: 'M-OPLG-06' },
    ] },
  { externalKey: 'q-SS7CG11R-029', benchmarkCode: 'SS.7.CG.1.1', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'The American belief that every person has equal worth and deserves equal justice under the law traces MOST directly to which influence?', options: [
      { text: 'The Judeo-Christian tradition', isCorrect: true, feedback: 'Correct! The tradition\'s teachings on the worth of every individual and impartial justice shaped American ideals of equal justice under law.' },
      { text: 'The Athenian assembly', isCorrect: false, feedback: 'Athens contributed direct democratic participation. The equal worth of every person traces to the Judeo-Christian tradition.' },
      { text: 'The Roman army', isCorrect: false, feedback: 'Rome\'s governmental legacy was the republic; the equal-worth ideal traces to the Judeo-Christian tradition.' },
      { text: 'The Egyptian pharaohs', isCorrect: false, feedback: 'Pharaohs claimed god-like status above the people — the opposite of equal worth under a shared law.' },
    ] },
  { externalKey: 'q-SS7CG11R-030', benchmarkCode: 'SS.7.CG.1.1', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'ancient-influences', remediationTag: 'remed-CG11-ancient-influences',
    prompt: 'Which statement BEST explains why ancient Greece, ancient Rome, and the Judeo-Christian tradition still matter to American government today?', options: [
      { text: 'Core features of the Constitution — citizen participation, representation, written law, and equal justice — are adaptations of ideas those sources developed', isCorrect: true, feedback: 'Correct! American government is not ancient government, but its foundations — participation, representation, written law, a law above rulers — were quarried from these older traditions.' },
      { text: 'American courts still enforce the original laws of Athens and Rome', isCorrect: false, feedback: 'American courts enforce American law. The ancient influence lives in the DESIGN of our institutions, not in ancient statutes.' },
      { text: 'The Constitution requires officials to study Greek and Latin', isCorrect: false, feedback: 'No such requirement exists. The influence is in the ideas built into our institutions.' },
      { text: 'They matter only to historians, since the founders ignored ancient examples', isCorrect: false, feedback: 'The founders studied ancient governments closely and borrowed deliberately — the influence is real and structural.' },
    ] },
]

// ── SS.7.CG.1.2 — Founding Principles of American Law and Government ─────────
// Skill tag: founding-principles  |  Remediation: remed-CG12-founding-principles

const SS7CG12R: QuestionSeedDef[] = [
  // vocabulary ×4
  { externalKey: 'q-SS7CG12R-001', benchmarkCode: 'SS.7.CG.1.2', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What are natural rights?', options: [
      { text: 'Rights every person is born with, which government does not grant and cannot rightly take away', isCorrect: true, feedback: 'Correct! Natural rights — like life and liberty — belong to people by nature. Government\'s job is to protect them.' },
      { text: 'Rights the government gives to citizens who earn them', isCorrect: false, feedback: 'Rights granted by government are civil rights. NATURAL rights belong to every person from birth.', misconceptionCode: 'M-OPLG-05' },
      { text: 'Rights that apply only in natural places like parks and forests', isCorrect: false, feedback: '"Natural" describes where the rights come from — human nature — not where they apply.' },
      { text: 'Rights that only elected officials have', isCorrect: false, feedback: 'Natural rights belong to every person, not just officials.' },
    ] },
  { externalKey: 'q-SS7CG12R-002', benchmarkCode: 'SS.7.CG.1.2', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What is popular sovereignty?', options: [
      { text: 'The idea that government\'s power comes from the people', isCorrect: true, feedback: 'Correct! "Popular" means the people, "sovereignty" means supreme power — the people are the source of government\'s authority.' },
      { text: 'The idea that the most popular leader should rule for life', isCorrect: false, feedback: 'Popular sovereignty is about the PEOPLE holding power, not about popularity contests or lifetime rule.' },
      { text: 'The right of kings to rule by birth', isCorrect: false, feedback: 'That is hereditary monarchy — the opposite of power flowing from the people.' },
      { text: 'A government\'s power to tax its people', isCorrect: false, feedback: 'Taxing is something governments do; popular sovereignty explains where their authority to act comes from — the people.' },
    ] },
  { externalKey: 'q-SS7CG12R-003', benchmarkCode: 'SS.7.CG.1.2', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What is limited government?', options: [
      { text: 'A government that may only use the powers the people have given it, usually written in a constitution', isCorrect: true, feedback: 'Correct! Limited government means the government itself is bound by rules — it cannot do whatever it wants.' },
      { text: 'A government with a small number of employees', isCorrect: false, feedback: '"Limited" refers to limited POWERS, not limited size or staff.' },
      { text: 'A government that only serves for a limited number of years', isCorrect: false, feedback: 'Term limits apply to officials. Limited government means the government\'s POWERS are restricted.' },
      { text: 'A government that limits what citizens may think', isCorrect: false, feedback: 'Backwards — limited government restricts the GOVERNMENT to protect the people\'s freedom.' },
    ] },
  { externalKey: 'q-SS7CG12R-004', benchmarkCode: 'SS.7.CG.1.2', category: 'vocabulary', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What is republicanism as a founding principle?', options: [
      { text: 'The belief that government should be run by representatives the people elect', isCorrect: true, feedback: 'Correct! Republicanism (small "r") is the principle of representative government — the people rule through those they choose.' },
      { text: 'Loyalty to a particular political party', isCorrect: false, feedback: 'The founding principle is about the FORM of government — elected representatives — not any political party.' },
      { text: 'The belief that a republic needs a king to lead it', isCorrect: false, feedback: 'A republic has no king — its leaders are elected by the people.' },
      { text: 'The idea that only wealthy citizens should vote', isCorrect: false, feedback: 'Republicanism is about representation of the people, not restricting power to the wealthy.' },
    ] },
  // basic_concept ×4
  { externalKey: 'q-SS7CG12R-005', benchmarkCode: 'SS.7.CG.1.2', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What does "consent of the governed" mean?', options: [
      { text: 'Government is legitimate only when the people agree to be governed by it', isCorrect: true, feedback: 'Correct! Rulers govern rightfully only with the people\'s agreement — expressed through elections and representation.' },
      { text: 'Citizens must ask the government for permission to speak', isCorrect: false, feedback: 'Backwards — it is the GOVERNMENT that needs the people\'s consent, not the other way around.' },
      { text: 'Every single citizen must approve every law', isCorrect: false, feedback: 'Consent works through majorities and elected representatives — it does not require unanimous agreement.', misconceptionCode: 'M-OPLG-08' },
      { text: 'Only landowners may vote in elections', isCorrect: false, feedback: 'Consent of the governed is about all the people being the source of authority, not property rules.' },
    ] },
  { externalKey: 'q-SS7CG12R-006', benchmarkCode: 'SS.7.CG.1.2', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What is the social contract?', options: [
      { text: 'An agreement in which people give government some authority in exchange for protection of their rights', isCorrect: true, feedback: 'Correct! The social contract is the deal behind government: people accept laws and give up some freedom of action; government protects their rights in return.' },
      { text: 'A written document every citizen signs at age 18', isCorrect: false, feedback: 'The social contract is an IDEA about the relationship between people and government — not a literal signed paper.', misconceptionCode: 'M-OPLG-07' },
      { text: 'A contract between businesses and their workers', isCorrect: false, feedback: 'That is an employment contract. The SOCIAL contract is between the people and their government.' },
      { text: 'A promise by the government to provide free services', isCorrect: false, feedback: 'The heart of the social contract is protection of rights in exchange for authority — not free services.' },
    ] },
  { externalKey: 'q-SS7CG12R-007', benchmarkCode: 'SS.7.CG.1.2', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'What does the rule of law require?', options: [
      { text: 'Everyone — including government leaders — must follow the law', isCorrect: true, feedback: 'Correct! Under the rule of law, no one is above the law; the same rules bind citizens and officials alike.' },
      { text: 'Only citizens must follow the law; leaders are exempt', isCorrect: false, feedback: 'The rule of law exists precisely to bind LEADERS as well as citizens.' },
      { text: 'Judges may change any law they dislike', isCorrect: false, feedback: 'Judges apply and interpret law; the rule of law binds them to it too.' },
      { text: 'Laws apply only during emergencies', isCorrect: false, feedback: 'The rule of law applies at all times — that constancy is what makes it a foundation of free government.' },
    ] },
  { externalKey: 'q-SS7CG12R-008', benchmarkCode: 'SS.7.CG.1.2', category: 'basic_concept', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'Where did America\'s founding principles come from?', options: [
      { text: 'Many sources over centuries — ancient Greece and Rome, English legal tradition, and Enlightenment thinkers', isCorrect: true, feedback: 'Correct! The founders traced and combined ideas from ancient governments, English documents like the Magna Carta, and philosophers like Locke and Montesquieu.' },
      { text: 'They were invented entirely by the delegates in Philadelphia in 1787', isCorrect: false, feedback: 'The delegates ADAPTED much older ideas — the principles have roots reaching back thousands of years.' },
      { text: 'They were copied word-for-word from the British monarchy', isCorrect: false, feedback: 'The founders rejected monarchy — though they did inherit English legal traditions like the rule of law.' },
      { text: 'They came from a single book written by John Locke', isCorrect: false, feedback: 'Locke was one important source among many — ancient history, English documents, and other thinkers all contributed.', misconceptionCode: 'M-OPLG-11' },
    ] },
  // scenario ×8
  { externalKey: 'q-SS7CG12R-009', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A city\'s voters become unhappy with their mayor and vote her out of office in the next election. Which founding principle does this event BEST illustrate?', options: [
      { text: 'Popular sovereignty — the people are the source of government power and can change their leaders', isCorrect: true, feedback: 'Correct! The people gave the mayor her authority, and the people took it back — power flows from the governed.' },
      { text: 'Rule of law — everyone must obey the law', isCorrect: false, feedback: 'No law-breaking is described. Voters replacing a leader shows power flowing from the people — popular sovereignty.' },
      { text: 'Natural rights — rights people are born with', isCorrect: false, feedback: 'The scenario is about where government power comes from — the people — which is popular sovereignty.' },
      { text: 'Limited government — government may only use granted powers', isCorrect: false, feedback: 'The scenario shows the PEOPLE exercising their power over leaders — popular sovereignty in action.' },
    ] },
  { externalKey: 'q-SS7CG12R-010', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A state constitution lists exactly which powers the state government has — and says any power not listed stays with the people. Which principle is this?', options: [
      { text: 'Limited government', isCorrect: true, feedback: 'Correct! Spelling out what government MAY do — and reserving everything else to the people — is limited government in its purest form.' },
      { text: 'Direct democracy', isCorrect: false, feedback: 'Nothing here is about citizens voting on laws directly — it\'s about restricting government to listed powers: limited government.' },
      { text: 'Civic virtue', isCorrect: false, feedback: 'Civic virtue is about citizens serving the common good. Restricting government to listed powers is limited government.' },
      { text: 'Hereditary rule', isCorrect: false, feedback: 'No inherited power is involved. A government confined to listed powers is a LIMITED government.' },
    ] },
  { externalKey: 'q-SS7CG12R-011', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A state senator is caught speeding and must pay the same fine as any other driver. Which founding principle does this event illustrate?', options: [
      { text: 'Rule of law — the law applies equally to leaders and citizens', isCorrect: true, feedback: 'Correct! No one is above the law — a senator pays the same speeding fine as anyone else.' },
      { text: 'Popular sovereignty — power comes from the people', isCorrect: false, feedback: 'The scenario shows the LAW binding an official — that\'s the rule of law.' },
      { text: 'Social contract — trading some freedom for protection', isCorrect: false, feedback: 'The focus is the law applying equally to an official — the rule of law.' },
      { text: 'Republicanism — electing representatives', isCorrect: false, feedback: 'The senator\'s election isn\'t the point — her equal treatment under the law is. That\'s the rule of law.' },
    ] },
  { externalKey: 'q-SS7CG12R-012', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'Citizens agree to obey traffic laws, pay taxes, and accept court decisions; in return, their government protects their safety, property, and freedoms. This ongoing exchange BEST illustrates —', options: [
      { text: 'the social contract', isCorrect: true, feedback: 'Correct! People accept limits and duties; government protects their rights — that exchange is the social contract.' },
      { text: 'a business partnership', isCorrect: false, feedback: 'The exchange between a people and their government is the SOCIAL contract — the founding-era idea from Locke.' },
      { text: 'divine right of kings', isCorrect: false, feedback: 'Divine right claims power comes from God to a king — the social contract says it comes from an agreement among the people.' },
      { text: 'salutary neglect', isCorrect: false, feedback: 'Salutary neglect was Britain\'s loose enforcement of colonial laws — not the citizens-government exchange described here.' },
    ] },
  { externalKey: 'q-SS7CG12R-013', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles', misconceptionCode: 'M-OPLG-05',
    prompt: 'A student argues: "Freedom of thought belongs to me simply because I\'m human — no government gave it to me, and none can rightly take it." The student is describing —', options: [
      { text: 'a natural right', isCorrect: true, feedback: 'Correct! Rights that belong to people by nature — not granted by government — are natural rights, the foundation Locke and the Declaration built on.' },
      { text: 'a civil right created by legislation', isCorrect: false, feedback: 'Rights created by laws are civil rights. A right belonging to every human BY NATURE is a natural right.', misconceptionCode: 'M-OPLG-05' },
      { text: 'a privilege granted by the school', isCorrect: false, feedback: 'A privilege can be granted and revoked. The student describes a right no authority grants — a natural right.' },
      { text: 'a responsibility of citizenship', isCorrect: false, feedback: 'Responsibilities are things citizens owe. The student describes a right inherent in being human — a natural right.' },
    ] },
  { externalKey: 'q-SS7CG12R-014', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'Rather than voting on every proposed law themselves, Floridians elect legislators to study, debate, and vote on laws for them. Which founding principle is at work?', options: [
      { text: 'Republicanism — government through elected representatives', isCorrect: true, feedback: 'Correct! Governing through representatives the people choose is republicanism — the structure the founders chose for the United States.' },
      { text: 'Direct democracy — citizens deciding every law', isCorrect: false, feedback: 'The citizens here are NOT voting on laws directly — they elect representatives to do it. That is republicanism.', misconceptionCode: 'M-OPLG-06' },
      { text: 'Monarchy — rule by a single sovereign', isCorrect: false, feedback: 'Elected legislators are the opposite of a hereditary ruler — this is republicanism.' },
      { text: 'Salutary neglect — loose enforcement of laws', isCorrect: false, feedback: 'Salutary neglect describes British colonial policy, not representative lawmaking.' },
    ] },
  { externalKey: 'q-SS7CG12R-015', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'The Constitution opens with "We the People of the United States... do ordain and establish this Constitution." A student asks why the framers began with those particular words. Which answer shows the strongest understanding?', options: [
      { text: 'The opening declares popular sovereignty — the Constitution\'s authority comes from the people themselves, not from a king, the states, or Congress', isCorrect: true, feedback: 'Correct! "We the People... do ordain and establish" makes the people the AUTHORS of the government — the principle of popular sovereignty in seven words.' },
      { text: 'The framers wanted a dramatic opening to attract readers', isCorrect: false, feedback: 'The words carry legal and philosophical weight — they identify the PEOPLE as the source of the Constitution\'s authority.' },
      { text: 'The phrase was required by British legal tradition', isCorrect: false, feedback: 'British documents spoke in the name of the Crown. Beginning with the people was a deliberate break — declaring popular sovereignty.' },
      { text: 'It meant only that the delegates personally approved the document', isCorrect: false, feedback: 'The phrase claims authority from the whole people — which is why ratification went to conventions of the people, not just the delegates.' },
    ] },
  { externalKey: 'q-SS7CG12R-016', benchmarkCode: 'SS.7.CG.1.2', category: 'scenario', itemType: 'SCENARIO_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A new nation is writing its first constitution and wants to follow America\'s founding principles. Which set of design choices BEST reflects those principles?', options: [
      { text: 'Power flows from the people through elections; the government\'s powers are listed and limited; every official is bound by the law', isCorrect: true, feedback: 'Correct! Popular sovereignty, republicanism, limited government, and the rule of law — the core founding principles working together.' },
      { text: 'A wise ruler holds all power for life so decisions are quick and consistent', isCorrect: false, feedback: 'Concentrated, lifetime power violates popular sovereignty, limited government, and consent of the governed.' },
      { text: 'The government may claim any power a majority of officials thinks useful', isCorrect: false, feedback: 'Unlisted, unlimited powers contradict limited government — the founders bound government to granted powers.' },
      { text: 'Laws bind ordinary citizens but exempt officials so government can act freely', isCorrect: false, feedback: 'Exempting officials violates the rule of law — the principle that NO ONE is above the law.' },
    ] },
  // source_analysis ×4
  { externalKey: 'q-SS7CG12R-017', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'The Declaration of Independence states that all men "are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness." Which founding principle is this?', options: [
      { text: 'Natural rights — rights people are born with that cannot rightly be taken away', isCorrect: true, feedback: 'Correct! "Unalienable" means the rights cannot be surrendered or taken — they belong to people by nature, not by government grant.' },
      { text: 'Limited government — government confined to listed powers', isCorrect: false, feedback: 'The passage names rights people are BORN with — natural (unalienable) rights.' },
      { text: 'Republicanism — electing representatives', isCorrect: false, feedback: 'No elections are described — the passage declares natural rights.' },
      { text: 'Federalism — dividing power between levels of government', isCorrect: false, feedback: 'The passage is about rights every person is born with — natural rights.' },
    ] },
  { externalKey: 'q-SS7CG12R-018', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'The Declaration of Independence says governments derive "their just powers from the consent of the governed." According to this passage, what makes a government\'s power legitimate?', options: [
      { text: 'The agreement of the people it governs', isCorrect: true, feedback: 'Correct! Just power flows from the people\'s consent — expressed through elections and representation, not unanimous agreement on every act.' },
      { text: 'The approval of every single citizen for each law', isCorrect: false, feedback: 'Consent works through majorities and chosen representatives — the Declaration does not demand unanimity.', misconceptionCode: 'M-OPLG-08' },
      { text: 'The blessing of religious authorities', isCorrect: false, feedback: 'The Declaration locates legitimacy in the CONSENT OF THE GOVERNED — the people themselves.' },
      { text: 'The size and strength of its army', isCorrect: false, feedback: 'Force can impose power but cannot make it JUST — the Declaration says just power comes from consent.' },
    ] },
  { externalKey: 'q-SS7CG12R-019', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'John Locke wrote that people form governments "for the mutual preservation of their lives, liberties and estates." Which founding principle did this idea become?', options: [
      { text: 'The social contract — people create government to protect their rights', isCorrect: true, feedback: 'Correct! Locke\'s account of why people form government — to protect life, liberty, and property — is the social contract, echoed in the Declaration of Independence.' },
      { text: 'Salutary neglect — leaving colonies to govern themselves', isCorrect: false, feedback: 'Locke is explaining why people CREATE government — the social contract.' },
      { text: 'Checks and balances — branches limiting each other', isCorrect: false, feedback: 'That structural idea came largely from Montesquieu. Locke\'s passage describes the social contract.' },
      { text: 'Judicial review — courts striking down laws', isCorrect: false, feedback: 'Judicial review came much later (Marbury v. Madison). Locke describes the social contract.' },
    ] },
  { externalKey: 'q-SS7CG12R-020', benchmarkCode: 'SS.7.CG.1.2', category: 'source_analysis', itemType: 'SOURCE_MC', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles', misconceptionCode: 'M-OPLG-04',
    prompt: 'Source A (Locke, 1689): "Men being by nature all free, equal, and independent, no one can be subjected to the political power of another without his own consent." Source B (Declaration of Independence, 1776): "All men are created equal... deriving their just powers from the consent of the governed." What is the BEST description of the relationship between these sources?', options: [
      { text: 'Jefferson drew on Locke\'s principles of equality and consent when drafting the Declaration', isCorrect: true, feedback: 'Correct! The Declaration restates Locke\'s natural equality and consent almost idea-for-idea — the founders TRACED their principles from Enlightenment sources.' },
      { text: 'Locke copied his ideas from the Declaration of Independence', isCorrect: false, feedback: 'Locke wrote almost 90 years BEFORE the Declaration — the influence runs from Locke to Jefferson.' },
      { text: 'Locke personally wrote the Declaration of Independence', isCorrect: false, feedback: 'Locke died in 1704. Jefferson drafted the Declaration — INFLUENCED by Locke\'s ideas, not authored by him.', misconceptionCode: 'M-OPLG-04' },
      { text: 'The two sources disagree about where government power comes from', isCorrect: false, feedback: 'They agree completely: power comes from the consent of free and equal people.' },
    ] },
  // chart_visual ×3
  { externalKey: 'q-SS7CG12R-021', benchmarkCode: 'SS.7.CG.1.2', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 1, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A table pairs principles with meanings:\n| Principle | Meaning |\n| Popular sovereignty | power comes from the people |\n| Rule of law | ??? |\nWhich best completes the table?', options: [
      { text: 'Everyone, including leaders, must follow the law', isCorrect: true, feedback: 'Correct! The rule of law binds officials and citizens alike — no one is above it.' },
      { text: 'The people elect representatives', isCorrect: false, feedback: 'That is republicanism. The rule of law means everyone — including leaders — must follow the law.' },
      { text: 'Government power is divided among three branches', isCorrect: false, feedback: 'That is separation of powers. The rule of law means the law binds everyone equally.' },
      { text: 'Rights belong to people from birth', isCorrect: false, feedback: 'That describes natural rights. The rule of law means the law applies to everyone, even leaders.' },
    ] },
  { externalKey: 'q-SS7CG12R-022', benchmarkCode: 'SS.7.CG.1.2', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A flowchart reads: ancient Greece & Rome → English documents (Magna Carta, English Bill of Rights) → Enlightenment thinkers → Declaration of Independence & U.S. Constitution. What does the flowchart show?', options: [
      { text: 'America\'s founding principles were traced and inherited through centuries of earlier ideas and documents', isCorrect: true, feedback: 'Correct! The founding principles have a family tree — ancient governments, English law, and Enlightenment philosophy all feed the founding documents.' },
      { text: 'The Constitution was written before the Magna Carta', isCorrect: false, feedback: 'The arrows run forward in time — the Magna Carta (1215) came more than 500 years before the Constitution (1787).' },
      { text: 'Each source replaced and erased the ones before it', isCorrect: false, feedback: 'The chart shows ideas ACCUMULATING and flowing forward, not being erased.' },
      { text: 'American principles came from a single source', isCorrect: false, feedback: 'The chart shows multiple streams — ancient, English, and Enlightenment — joining in the founding documents.' },
    ] },
  { externalKey: 'q-SS7CG12R-023', benchmarkCode: 'SS.7.CG.1.2', category: 'chart_visual', itemType: 'IMAGE_MC', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'A matching chart pairs each principle with an example. Which pairing is CORRECT?', options: [
      { text: 'Limited government — the Constitution lists what powers Congress has', isCorrect: true, feedback: 'Correct! Enumerating (listing) the government\'s powers is limited government in action.' },
      { text: 'Natural rights — citizens elect a governor every four years', isCorrect: false, feedback: 'Elections illustrate popular sovereignty/republicanism. Natural rights are rights people are born with.' },
      { text: 'Rule of law — the president may ignore court rulings', isCorrect: false, feedback: 'The rule of law means the OPPOSITE — even the president must obey the law and court rulings.' },
      { text: 'Social contract — a king inherits his throne from his father', isCorrect: false, feedback: 'Hereditary rule has nothing to do with the social contract, which grounds government in the people\'s agreement.' },
    ] },
  // misconception_check ×3
  { externalKey: 'q-SS7CG12R-024', benchmarkCode: 'SS.7.CG.1.2', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles', misconceptionCode: 'M-OPLG-07',
    prompt: 'A student says: "The social contract is a real document in the National Archives that all Americans signed." What is the BEST correction?', options: [
      { text: 'The social contract is an idea, not a physical document — it describes the understanding between people and their government', isCorrect: true, feedback: 'Correct! "Contract" is a metaphor. The idea — people trade some freedom of action for protection of their rights — shaped real documents like the Constitution, but is not itself a signed paper.' },
      { text: 'The student is right, but the document is kept in England', isCorrect: false, feedback: 'There is no signed social contract anywhere — it is a philosophical idea about the basis of government.', misconceptionCode: 'M-OPLG-07' },
      { text: 'The social contract is another name for the Bill of Rights', isCorrect: false, feedback: 'The Bill of Rights is a real set of amendments; the social contract is the underlying IDEA that government rests on the people\'s agreement.' },
      { text: 'Only government officials sign the social contract', isCorrect: false, feedback: 'No one signs it — the social contract is a concept, not a paper.', misconceptionCode: 'M-OPLG-07' },
    ] },
  { externalKey: 'q-SS7CG12R-025', benchmarkCode: 'SS.7.CG.1.2', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles', misconceptionCode: 'M-OPLG-08',
    prompt: 'A student argues: "Since our government rests on the consent of the governed, any law is illegitimate unless every citizen agrees to it." What is the BEST correction?', options: [
      { text: 'Consent is given through elections and representation — a law made by the people\'s chosen representatives has the governed\'s consent even when some citizens disagree', isCorrect: true, feedback: 'Correct! Consent of the governed works through the SYSTEM the people agreed to — majority rule and representation — not through unanimous approval of each law.' },
      { text: 'The student is right — any citizen\'s objection makes a law invalid', isCorrect: false, feedback: 'If unanimity were required, no law could ever pass. Consent operates through elections and representation.', misconceptionCode: 'M-OPLG-08' },
      { text: 'Consent of the governed only applied during the founding era', isCorrect: false, feedback: 'The principle is permanent — it still operates through every election. The correction is about HOW consent is expressed.' },
      { text: 'Laws don\'t need consent because the government is in charge', isCorrect: false, feedback: 'That abandons the principle entirely. Government legitimacy DOES rest on consent — expressed through representation.' },
    ] },
  { externalKey: 'q-SS7CG12R-026', benchmarkCode: 'SS.7.CG.1.2', category: 'misconception_check', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles', misconceptionCode: 'M-OPLG-11',
    prompt: 'Which statement about America\'s founding principles is CORRECT?', options: [
      { text: 'The founders traced principles like natural rights and consent from earlier sources and built them into the founding documents', isCorrect: true, feedback: 'Correct! The principles were inherited, traced, and deliberately embedded — from ancient and English roots through Enlightenment thought into the Declaration and Constitution.' },
      { text: 'John Locke wrote the U.S. Constitution', isCorrect: false, feedback: 'Locke died in 1704 — decades before the Constitution. His IDEAS influenced its authors.', misconceptionCode: 'M-OPLG-11' },
      { text: 'Natural rights are rights the government grants to well-behaved citizens', isCorrect: false, feedback: 'Natural rights belong to people from birth — no government grants them.', misconceptionCode: 'M-OPLG-05' },
      { text: 'The rule of law means judges may rule however they wish', isCorrect: false, feedback: 'The rule of law binds judges too — the law, not any official\'s wishes, governs.' },
    ] },
  // eoc_mixed ×4
  { externalKey: 'q-SS7CG12R-027', benchmarkCode: 'SS.7.CG.1.2', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'Which pairing of a founding principle with its definition is correct?', options: [
      { text: 'Popular sovereignty — government power comes from the people', isCorrect: true, feedback: 'Correct! The people are the sovereign — the ultimate source of government authority.' },
      { text: 'Natural rights — rights granted by the Bill of Rights', isCorrect: false, feedback: 'The Bill of Rights PROTECTS rights; natural rights exist by birth, before any document.', misconceptionCode: 'M-OPLG-05' },
      { text: 'Rule of law — the ruler\'s word is the law', isCorrect: false, feedback: 'Backwards — the rule of law means even rulers are bound by the law.' },
      { text: 'Social contract — an agreement between two nations', isCorrect: false, feedback: 'The social contract is between a people and their government, not between nations.' },
    ] },
  { externalKey: 'q-SS7CG12R-028', benchmarkCode: 'SS.7.CG.1.2', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'Why does a WRITTEN constitution strengthen the rule of law more than unwritten tradition alone?', options: [
      { text: 'Written rules are fixed and public, so officials cannot quietly redefine their own powers, and citizens can point to the exact text that limits government', isCorrect: true, feedback: 'Correct! From Rome\'s Twelve Tables to the U.S. Constitution, writing the law down makes it a public standard that binds the powerful.' },
      { text: 'Written constitutions can never be changed', isCorrect: false, feedback: 'The Constitution CAN be amended — the strength of writing is publicity and fixity, not unchangeability.' },
      { text: 'Unwritten traditions carry no influence in any government', isCorrect: false, feedback: 'Traditions matter (Britain governs largely by them) — but writing gives citizens a fixed, public text to hold government to.' },
      { text: 'Written documents allow leaders to hide the law from citizens', isCorrect: false, feedback: 'The opposite — written, published law is visible to every citizen.' },
    ] },
  { externalKey: 'q-SS7CG12R-029', benchmarkCode: 'SS.7.CG.1.2', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'MODERATE', readingLoadLevel: 2, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'Which founding principle MOST directly explains why American governments hold regular elections?', options: [
      { text: 'Popular sovereignty — since power comes from the people, the people must regularly choose who exercises it', isCorrect: true, feedback: 'Correct! Regular elections are how the sovereign people grant, renew, or withdraw the authority they lend to their representatives.' },
      { text: 'Natural rights — people are born with the right to life', isCorrect: false, feedback: 'Natural rights explain what government must protect; POPULAR SOVEREIGNTY explains why the people keep choosing their governors.' },
      { text: 'Rule of law — everyone must obey the law', isCorrect: false, feedback: 'The rule of law binds everyone to the law; regular elections flow from the people being the source of power.' },
      { text: 'The social contract — trading freedom for anarchy', isCorrect: false, feedback: 'The social contract trades some freedom for PROTECTION. Elections express popular sovereignty.' },
    ] },
  { externalKey: 'q-SS7CG12R-030', benchmarkCode: 'SS.7.CG.1.2', category: 'eoc_mixed', itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'HIGH', readingLoadLevel: 3, skillTag: 'founding-principles', remediationTag: 'remed-CG12-founding-principles',
    prompt: 'How do the founding principles of limited government, rule of law, and consent of the governed work TOGETHER to prevent tyranny?', options: [
      { text: 'Consent makes the people the source of power, limits confine government to granted powers, and the rule of law binds every official to those limits', isCorrect: true, feedback: 'Correct! The principles interlock: power flows up from the people, is confined by written limits, and the law holds every official inside them — leaving no room for a tyrant.' },
      { text: 'They let a strong leader act quickly without interference', isCorrect: false, feedback: 'The principles exist to PREVENT unchecked power, not to enable it.' },
      { text: 'They ensure that government never changes in any way', isCorrect: false, feedback: 'The principles allow change — through elections and amendments — while preventing any one person from seizing power.' },
      { text: 'They give judges complete control over the other branches', isCorrect: false, feedback: 'No branch gets complete control — the principles bind judges to the law just like everyone else.' },
    ] },
]

// ── Aggregation ──────────────────────────────────────────────────────────────

export const UNIT1_INTERIM_BY_BENCHMARK: Record<string, QuestionSeedDef[]> = {
  'SS.7.CG.1.1': SS7CG11R,
  'SS.7.CG.1.2': SS7CG12R,
}

/** Interim banks at the full 30 — audit drivers may iterate over this set. */
export const UNIT1_INTERIM_BENCHMARKS: string[] = Object.keys(UNIT1_INTERIM_BY_BENCHMARK)

const ALL_INTERIM: QuestionSeedDef[] = Object.values(UNIT1_INTERIM_BY_BENCHMARK).flat()

export async function seedUnit1Interim(prisma: PrismaClient): Promise<void> {
  const count = await seedQuestionDefs(prisma, ALL_INTERIM, CONTENT_APPROVAL)
  console.log(
    `  ✓ Unit 1 interim banks seeded (official 1.1/1.2 — ${count} questions, ${CONTENT_APPROVAL.sourceTier} / ${CONTENT_APPROVAL.approvalStatus} per ADR 0013/0017)`
  )
}
