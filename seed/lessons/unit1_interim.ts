/**
 * Seed: INTERIM lessons for official SS.7.CG.1.1 and SS.7.CG.1.2 (ADR 0017).
 *
 * The 2026-07-16 standards realignment left the official 1.1 (ancient Greece /
 * Rome / Judeo-Christian influences) and 1.2 (founding principles) with no
 * lesson under their official meanings. These two text-first lessons make the
 * missions playable so numeric mission order works immediately.
 *
 * ⚠ INTERIM CONTENT BLOCK — flagged `interim: true`:
 *   - No media steps (VIDEO/IMAGE/DIAGRAM/INFOGRAPHIC). A concurrent session
 *     owns lesson media (ADR 0015); these lessons receive their media pass in
 *     the owner-flagged FULL content build tracked in the CLAUDE.md backlog.
 *   - The lesson-bank shape test exempts `interim` lessons from the media-step
 *     requirement only; every other template guarantee (≥14 steps, ≥4 checks,
 *     timeline organizer, worked example, source analysis) is enforced.
 *
 * Approval: APPROVED / Tier D per ADR 0013 (owner-directed — Unit 1 turnkey).
 */

import type { LessonSeedDef } from './_seeder'
import type {
  InteractiveCheckContent,
  SourceAnalysisContent,
  TimelineContent,
  WorkedExampleContent,
} from '../../src/lib/lesson-content'

const check = (c: InteractiveCheckContent): string => JSON.stringify(c)
const worked = (c: WorkedExampleContent): string => JSON.stringify(c)
const source = (c: SourceAnalysisContent): string => JSON.stringify(c)
const timeline = (c: TimelineContent): string => JSON.stringify(c)

export const UNIT1_INTERIM_LESSONS: LessonSeedDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.1 — Ancient Roots: Greece, Rome, and the Judeo-Christian Tradition
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.1',
    idKey: 'SS.7.CG.1.1R', // distinct id space — lesson-SS7CG11 belongs to the carried Enlightenment lesson
    interim: true,
    title: 'Ancient Roots of the Republic',
    studentFriendlyTarget:
      'I can explain how ancient Greece, ancient Rome, and the Judeo-Christian tradition shaped American government.',
    body:
      'The United States is a young country built on very old ideas. More than two thousand years before 1776, the citizens of Athens gathered on a hillside to vote on their own laws. The Romans elected senators, wrote their laws on bronze tables for all to see, and honored leaders who gave power back when their work was done. And an even older tradition taught that there is a law above every ruler — and that every single person has worth.\n\n' +
      'In this mission you\'ll trace how these three ancient sources — Greece, Rome, and the Judeo-Christian tradition — supplied the raw material the American founders used to build a constitutional republic. Learn them well: when you meet the Constitution later, you\'ll recognize the ancient fingerprints all over it.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: Old Ideas, New Nation',
        content:
          'When the American founders sat down to design a government, they did not start from a blank page. They were students of history — men like James Madison spent months studying every republic and democracy that had ever existed, hunting for what worked and what failed.\n\n' +
          'Three ancient sources gave them their most important materials:\n\n' +
          '1. ANCIENT GREECE (especially the city of Athens) showed that ordinary citizens could govern themselves.\n' +
          '2. ANCIENT ROME showed how a large state could be governed by elected representatives under written law.\n' +
          '3. THE JUDEO-CHRISTIAN TRADITION taught that a moral law stands above every ruler, and that every person has worth.\n\n' +
          'This mission walks through each source and connects it to the government you live under today.',
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words You Need',
        content:
          'direct democracy — a government in which citizens vote on laws and decisions themselves, without representatives. Practiced in ancient Athens.\n\n' +
          'republic — a government in which citizens elect representatives to make laws for them. Practiced in ancient Rome; the model for the United States.\n\n' +
          'civic virtue — putting the good of the community above your own personal interests. The Romans considered it the fuel that keeps a republic running.\n\n' +
          'citizen — a member of a political community with the right to participate in its government.\n\n' +
          'Twelve Tables — Rome\'s first written law code (about 450 BC), posted publicly so every citizen could know the law.',
      },
      {
        stepType: 'NOTE',
        title: 'Athens: The People Govern Themselves',
        content:
          'Around 500 BC, the Greek city of Athens tried something radical: instead of obeying a king, its citizens governed themselves. Thousands of Athenian citizens met about 40 times a year in an open-air assembly on a hill called the Pnyx. They debated, argued, and voted — directly — on wars, taxes, and laws.\n\n' +
          'This is called DIRECT democracy: the citizens themselves are the lawmakers. There were no senators or representatives voting for them.\n\n' +
          'Athens\' democracy had serious limits by our standards — only free adult men born to Athenian parents counted as citizens; women, enslaved people, and foreigners had no voice. But the core idea was revolutionary and never forgotten: ordinary people are capable of governing themselves.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Athens',
        content: check({
          question: 'What made Athens a DIRECT democracy?',
          options: [
            {
              text: 'Citizens gathered in an assembly and voted on the laws themselves',
              correct: true,
              feedback:
                'Right! No representatives voted for them — Athenian citizens debated and decided the laws directly.',
            },
            {
              text: 'Citizens elected senators to write laws for them',
              correct: false,
              feedback: 'That describes a republic, like Rome. Athens\' citizens voted on the laws personally.',
            },
            {
              text: 'A wise king made all decisions for the people',
              correct: false,
              feedback: 'Athens\' democracy replaced rule by kings — the citizens themselves decided.',
            },
            {
              text: 'Judges chosen by priests wrote the laws',
              correct: false,
              feedback: 'The Athenian assembly of citizens — not judges or priests — voted the laws in.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Rome: A Republic of Representatives and Written Law',
        content:
          'In 509 BC, the Romans overthrew their king and swore never to be ruled by one again. But Rome was far too large for every citizen to gather and vote like Athens. Their solution: a REPUBLIC. Citizens elected officials — senators, consuls, tribunes — to govern on their behalf.\n\n' +
          'Rome added two more ideas the American founders treasured:\n\n' +
          'WRITTEN, PUBLIC LAW. Around 450 BC, Rome carved its laws onto twelve bronze tables and posted them in the public forum. When the law is written down where everyone can read it, the powerful cannot quietly change the rules.\n\n' +
          'CIVIC VIRTUE. Romans honored leaders like Cincinnatus, a farmer given emergency power to save the city — who won the war and then gave the power back and returned to his plow. Serving the republic, then letting go of power, was the Roman ideal. (Two thousand years later, George Washington was called "the American Cincinnatus" for doing the same thing.)',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Rome',
        content: check({
          question: 'Which TWO-part combination is Rome\'s biggest contribution to American government?',
          options: [
            {
              text: 'Elected representatives governing under written, public law',
              correct: true,
              feedback:
                'Exactly! The republic (elected representatives) plus the Twelve Tables (written public law) — both became cornerstones of the U.S. Constitution.',
            },
            {
              text: 'Direct voting by all citizens on every law',
              correct: false,
              feedback: 'That was Athens. Rome governed through ELECTED representatives.',
            },
            {
              text: 'A permanent emperor commanding a great army',
              correct: false,
              feedback:
                'Emperors came later, when the republic collapsed — the founders treated that as a warning, not a model.',
            },
            {
              text: 'Secret laws known only to the senators',
              correct: false,
              feedback:
                'The opposite! Rome POSTED its laws publicly on the Twelve Tables so every citizen could know them.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Timeline: From Ancient Ideas to American Government',
        content: timeline({
          kind: 'timeline',
          intro: 'Watch how far back the roots of American government reach:',
          connector: 'line',
          events: [
            { marker: '~1000 BC', label: 'Hebrew law teaches a moral law above rulers', detail: 'Kings and judges are bound by the same law as everyone else — and every person has worth.' },
            { marker: '~508 BC', label: 'Athens begins direct democracy', detail: 'Citizens vote on laws themselves in the assembly.' },
            { marker: '~450 BC', label: 'Rome posts the Twelve Tables', detail: 'Written law, displayed publicly, that even the powerful must follow.' },
            { marker: '509–27 BC', label: 'The Roman Republic', detail: 'Citizens elect senators and consuls to govern on their behalf.' },
            { marker: 'AD 1776', label: 'The Declaration of Independence', detail: 'Equal worth of persons; government by consent.' },
            { marker: 'AD 1787', label: 'The U.S. Constitution', detail: 'A written plan for a republic — ancient ideas, new design.' },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'The Judeo-Christian Tradition: A Law Above Every Ruler',
        content:
          'The third ancient source is not a government at all — it is a moral tradition. The Hebrew scriptures (and later Christian teaching built on them) contributed two ideas that shaped American government deeply:\n\n' +
          'A HIGHER LAW BINDS EVERY RULER. In most ancient kingdoms, the king\'s word WAS the law. The Hebrew tradition said otherwise: kings and judges answer to a moral law they did not write and cannot change. Judges were commanded to show no favoritism — the same justice for the powerful and the weak. This idea grew into the American RULE OF LAW: no president, governor, or judge is above the law.\n\n' +
          'EVERY PERSON HAS WORTH. The tradition taught that every human being matters — not just kings, nobles, or citizens of one city. You can hear the echo in the Declaration of Independence: "all men are created equal."',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: The Judeo-Christian Tradition',
        content: check({
          question: 'A judge tells a governor: "You must follow the law like everyone else." Which ancient influence does this idea trace back to?',
          options: [
            {
              text: 'The Judeo-Christian teaching that a moral law stands above every ruler',
              correct: true,
              feedback:
                'Right! The tradition that even kings answer to a higher law became the American rule of law — no official is above it.',
            },
            {
              text: 'The Athenian assembly voting on laws',
              correct: false,
              feedback:
                'Athens contributed direct participation. The idea that rulers are BOUND by a higher law traces to the Judeo-Christian tradition.',
            },
            {
              text: 'Rome\'s practice of electing two consuls',
              correct: false,
              feedback:
                'Divided offices are a Roman structure. A moral law binding every ruler comes from the Judeo-Christian tradition.',
            },
            {
              text: 'The Egyptian belief that pharaohs were gods',
              correct: false,
              feedback:
                'That belief put rulers ABOVE the law — exactly the idea the Judeo-Christian tradition rejected.',
            },
          ],
        }),
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'Think Like a Test-Taker: Matching Influences',
        content: worked({
          problem:
            'EOC-style question: "The United States Senate is an assembly of elected officials who make laws on behalf of citizens. This feature of American government MOST directly reflects the influence of — (A) Athenian direct democracy, (B) the Roman Republic, (C) the Egyptian pharaohs, (D) the Judeo-Christian tradition."',
          thinkAloud: [
            'First, I name the feature in my own words: ELECTED officials making laws FOR the citizens — that\'s representation, not citizens voting directly.',
            'Now I test each source. Athens? Athenians voted on laws THEMSELVES — no representatives. So (A) doesn\'t match.',
            'Rome? Rome\'s republic elected senators to govern on citizens\' behalf — and our Senate even takes its NAME from Rome\'s. Strong match.',
            'Pharaohs ruled without elections, and the Judeo-Christian tradition contributed moral ideas (higher law, human worth), not an elected assembly. (C) and (D) are out.',
          ],
          answer: '(B) the Roman Republic.',
          whyItWorks:
            'Match the FEATURE to the FUNCTION each ancient source contributed: Athens = direct participation, Rome = elected representatives + written law, Judeo-Christian tradition = higher law + human worth. Most ancient-influence questions are solved by this three-way sort.',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Sort the Sources',
        content: check({
          question: 'Which pairing of source → contribution is CORRECT?',
          options: [
            {
              text: 'Ancient Greece → citizens participating directly in government',
              correct: true,
              feedback: 'Correct! Athens modeled direct citizen participation. Rome gave representation; the Judeo-Christian tradition gave the higher moral law.',
            },
            {
              text: 'Ancient Rome → citizens voting directly on every law',
              correct: false,
              feedback: 'Rome was a republic — citizens ELECTED representatives. Direct voting was Athens.',
            },
            {
              text: 'Judeo-Christian tradition → the elected Senate',
              correct: false,
              feedback: 'The Senate is Roman. The Judeo-Christian tradition contributed the moral law above rulers and the worth of every person.',
            },
            {
              text: 'Ancient Greece → the first written national constitution',
              correct: false,
              feedback: 'Athens\' contribution was direct participation. Written public law was Rome\'s Twelve Tables.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: Pericles Praises Athenian Democracy',
        content: source({
          sourceTitle: 'Pericles\' Funeral Oration (as recorded by Thucydides)',
          sourceAttribution: 'Pericles, Athens, ~431 BC (public domain)',
          passage:
            'Our constitution is called a democracy because power is in the hands not of a minority but of the whole people. When it is a question of settling private disputes, everyone is equal before the law... No one, so long as he has it in him to be of service to the state, is kept in political obscurity because of poverty.',
          guidingQuestions: [
            {
              question: 'According to Pericles, why is Athens called a democracy?',
              options: [
                {
                  text: 'Because power belongs to the whole people, not a small group',
                  correct: true,
                  feedback: 'Right — "power is in the hands not of a minority but of the whole people."',
                },
                {
                  text: 'Because a wise minority governs for everyone',
                  correct: false,
                  feedback: 'Pericles says the opposite — power is NOT in the hands of a minority.',
                },
                {
                  text: 'Because the king shares power with the assembly',
                  correct: false,
                  feedback: 'No king appears in the passage — the whole people hold the power.',
                },
              ],
            },
            {
              question: 'Which American ideal most clearly echoes "everyone is equal before the law"?',
              options: [
                {
                  text: 'Equal justice under the rule of law',
                  correct: true,
                  feedback: 'Yes — the same law applied equally to every person, an ideal America also drew from the Judeo-Christian tradition of impartial justice.',
                },
                {
                  text: 'The Electoral College',
                  correct: false,
                  feedback: 'The Electoral College is a presidential-election mechanism — the quote is about equal treatment under law.',
                },
                {
                  text: 'The president\'s veto power',
                  correct: false,
                  feedback: 'The veto is a check between branches — the quote describes equality before the law.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Why the Founders Chose Rome\'s Model (Mostly)',
        content:
          'If Athens proved people could govern themselves, why isn\'t the United States a direct democracy?\n\n' +
          'SCALE. Athens was one city; the United States in 1787 stretched across thirteen states with nearly four million people. Citizens cannot gather on a hillside from Georgia to New Hampshire. Representatives can.\n\n' +
          'STABILITY. The founders had read how Athenian assemblies could be swept by emotion into disastrous decisions — and how Rome\'s republic balanced power among consuls, Senate, and citizen assemblies so no single group could dominate. Madison called the Athenian problem "the tyranny of the majority" and designed against it.\n\n' +
          'So the founders built a REPUBLIC on the Roman pattern — but improved it with a written Constitution (a lesson from the Twelve Tables, made stronger), regular elections (consent of the governed), and the rule of law (the higher-law tradition). Ancient materials; new architecture.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Why a Republic?',
        content: check({
          question: 'Why did the founders choose a republic instead of an Athens-style direct democracy?',
          options: [
            {
              text: 'A large nation cannot gather its citizens to vote on every law — representatives can act for citizens across great distances',
              correct: true,
              feedback:
                'Correct! Scale (and the stability of balanced, representative institutions) drove the choice — the people still rule, but through those they elect.',
            },
            {
              text: 'The founders believed citizens should have no role in government',
              correct: false,
              feedback:
                'Citizens are the FOUNDATION of the republic — they choose the representatives. The issue was practicality at scale, not distrust of popular government.',
            },
            {
              text: 'Direct democracy was against British law',
              correct: false,
              feedback: 'America had already broken from Britain. The reasons were scale and stability.',
            },
            {
              text: 'Athens had never actually practiced democracy',
              correct: false,
              feedback: 'Athens genuinely practiced direct democracy — it just couldn\'t work for a nation of millions.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief',
        content:
          'You traced America\'s constitutional republic back to its three ancient sources:\n\n' +
          '• ANCIENT GREECE (Athens) — direct democracy: ordinary citizens are capable of governing themselves. America keeps the participation, but through elections.\n\n' +
          '• ANCIENT ROME — the republic: elected representatives (our Senate takes Rome\'s name), written public law (Twelve Tables → written Constitution), and civic virtue (Cincinnatus → Washington).\n\n' +
          '• THE JUDEO-CHRISTIAN TRADITION — a moral law above every ruler (→ the rule of law) and the equal worth of every person (→ "all men are created equal").\n\n' +
          'Remember the three-way sort: participation from Greece, representation and written law from Rome, higher law and human worth from the Judeo-Christian tradition. The Mastery Challenge will ask you to match features of American government to these sources — sort them and you\'ll win.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.2 — Founding Principles of American Law and Government
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.2',
    idKey: 'SS.7.CG.1.2R', // distinct id space — lesson-SS7CG12 belongs to the carried Documents lesson
    interim: true,
    title: 'The Principles Beneath It All',
    studentFriendlyTarget:
      'I can trace the principles underlying America\'s founding ideas on law and government.',
    body:
      'Underneath the Declaration of Independence, the Constitution, and every American election lies a small set of powerful principles: natural rights, popular sovereignty, consent of the governed, the social contract, limited government, republicanism, and the rule of law.\n\n' +
      'These ideas were not invented in 1776 — they were traced, collected, and sharpened over centuries, from ancient Greece and Rome, through English documents like the Magna Carta, to Enlightenment thinkers like John Locke. In this mission you\'ll learn each principle, where it came from, and where to spot it in the founding documents. Master these seven ideas and the rest of civics gets easier — everything else is built on them.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: Ideas Before Documents',
        content:
          'Documents like the Constitution are the visible part of American government. But documents are built out of IDEAS — and the founders were very clear about which ideas they were building with.\n\n' +
          'Think of the founding principles as the beams inside a building\'s walls. You don\'t see them directly, but they hold everything up:\n\n' +
          '• Natural rights — what government exists to protect\n' +
          '• Popular sovereignty & consent of the governed — where government\'s power comes from\n' +
          '• The social contract — the deal between people and government\n' +
          '• Limited government & the rule of law — how government is kept from abusing its power\n' +
          '• Republicanism — how the people exercise their power in practice\n\n' +
          'This mission takes them one at a time.',
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words You Need',
        content:
          'natural rights — rights every person is born with, which government does not grant and cannot rightly take away. Locke named life, liberty, and property.\n\n' +
          'popular sovereignty — the idea that government\'s power comes from the people.\n\n' +
          'consent of the governed — government is legitimate only when the people agree to be governed by it.\n\n' +
          'social contract — the agreement in which people give government some authority in exchange for protection of their rights.\n\n' +
          'limited government — government may use only the powers the people have given it, usually written in a constitution.\n\n' +
          'republicanism — the principle that the people govern through representatives they elect.\n\n' +
          'rule of law — everyone, including government leaders, must follow the law.',
      },
      {
        stepType: 'NOTE',
        title: 'Natural Rights: What Government Is FOR',
        content:
          'Start with the deepest principle. John Locke argued that people are born free and equal, with rights that belong to them BY NATURE — not because a king or a law granted them. He named life, liberty, and property; the Declaration of Independence made it "Life, Liberty and the pursuit of Happiness."\n\n' +
          'Two things follow from natural rights, and both changed history:\n\n' +
          '1. Government does not CREATE your basic rights — you walk in the door with them.\n' +
          '2. Government\'s whole JOB is to protect those rights. A government that attacks the rights it exists to protect has broken its purpose — and, said Locke and Jefferson, the people may alter or abolish it.\n\n' +
          'Be careful on the EOC: natural rights (born with them) are different from civil rights that laws create, like the right to vote at 18. Mixing those up is one of the most common test traps.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Natural Rights',
        content: check({
          question: 'What makes a right a NATURAL right?',
          options: [
            {
              text: 'You are born with it — no government grants it, and none can rightly take it away',
              correct: true,
              feedback: 'Correct! Natural rights belong to every person by nature. Government\'s job is to protect them.',
            },
            {
              text: 'The government awards it to citizens who earn it',
              correct: false,
              feedback: 'Rights that government creates or grants are civil rights. NATURAL rights come with being human.',
            },
            {
              text: 'It only exists while a law says it does',
              correct: false,
              feedback: 'That describes a legal (civil) right. Natural rights exist before and above any law.',
            },
            {
              text: 'Only elected officials have it',
              correct: false,
              feedback: 'Natural rights belong to EVERY person equally — that\'s the whole point.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Popular Sovereignty and Consent: Where Power Comes From',
        content:
          'If people are born free and equal, then no one is born with the right to rule anyone else. So where can government power legitimately come from? Only one place: THE PEOPLE THEMSELVES.\n\n' +
          'POPULAR SOVEREIGNTY means the people are the sovereign — the highest authority. Government borrows its power from them. The Constitution announces this in its first seven words: "We the People of the United States..." Not "I the King." Not "We the States." The people ordain and establish the government.\n\n' +
          'CONSENT OF THE GOVERNED is the same idea in action: a government is legitimate only while the people agree to be governed by it. The Declaration says governments derive "their just powers from the consent of the governed."\n\n' +
          'Important: consent does NOT mean every citizen must approve every law. The people consent to a SYSTEM — elections, representation, majority rule — and express their ongoing consent every time they vote.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Consent of the Governed',
        content: check({
          question: 'A student says a law is illegitimate "unless every citizen agrees to it." What does consent of the governed ACTUALLY require?',
          options: [
            {
              text: 'The people consent through elections and representation — a law passed by their chosen representatives carries their consent even if some disagree',
              correct: true,
              feedback: 'Exactly! Consent operates through the system the people agreed to — not unanimous approval of each law (nothing would ever pass).',
            },
            {
              text: 'Unanimous agreement of all citizens on every law',
              correct: false,
              feedback: 'If consent meant unanimity, no law could ever exist. Consent works through elections and representation.',
            },
            {
              text: 'The approval of the president alone',
              correct: false,
              feedback: 'One official\'s approval is not the people\'s consent — consent flows from the governed through elections.',
            },
            {
              text: 'Nothing — governments don\'t need the people\'s agreement',
              correct: false,
              feedback: 'That rejects the principle entirely. The Declaration says just powers come FROM the consent of the governed.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Timeline: Tracing the Principles Through Time',
        content: timeline({
          kind: 'timeline',
          intro: 'The founding principles were collected over more than two thousand years:',
          connector: 'line',
          events: [
            { marker: 'Ancient', label: 'Greece, Rome, and Hebrew law', detail: 'Citizen participation, representation, written law, and a moral law above rulers.' },
            { marker: '1215', label: 'Magna Carta', detail: 'Even the king is under the law — an early seed of limited government and rule of law.' },
            { marker: '1689', label: 'English Bill of Rights & Locke\'s Two Treatises', detail: 'Parliament limits the monarch; Locke articulates natural rights and the social contract.' },
            { marker: '1776', label: 'Declaration of Independence', detail: 'Natural rights, equality, and consent of the governed declared to the world.' },
            { marker: '1787', label: 'U.S. Constitution', detail: '"We the People" — popular sovereignty, limited government, republicanism, and rule of law built into a working design.' },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'The Social Contract: The Deal Behind Government',
        content:
          'Put natural rights and consent together and you get the SOCIAL CONTRACT — the founders\' explanation of why government exists at all.\n\n' +
          'The idea (from Locke, building on earlier thinkers): imagine life with no government. Your rights exist, but nothing protects them except your own strength. So free people strike a deal: each person gives up some freedom of action — agrees to follow laws, pay taxes, accept courts — and in exchange, government protects everyone\'s life, liberty, and property.\n\n' +
          'Two test-trap warnings:\n\n' +
          '1. The social contract is an IDEA, not a physical document. Nobody ever signed it. (Real documents like the Mayflower Compact and the Constitution put the idea into practice.)\n\n' +
          '2. The deal has two sides. If government stops protecting rights and starts attacking them, it has broken the contract — which is exactly the argument the Declaration of Independence makes against the king.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: The Social Contract',
        content: check({
          question: 'Which situation BEST illustrates the social contract?',
          options: [
            {
              text: 'Citizens obey laws and pay taxes; in return, government protects their rights and safety',
              correct: true,
              feedback: 'Correct! That two-way exchange — some freedom given up, rights protected in return — IS the social contract.',
            },
            {
              text: 'Every citizen signs a document at city hall when they turn 18',
              correct: false,
              feedback: 'The social contract is an idea about the relationship between people and government — not a literal signed paper.',
            },
            {
              text: 'A king grants his people whatever rights he chooses',
              correct: false,
              feedback: 'That\'s rule from above. The social contract starts with free people CREATING government to protect rights they already have.',
            },
            {
              text: 'Two companies agree to trade goods',
              correct: false,
              feedback: 'That\'s a business contract. The SOCIAL contract is the agreement underlying government itself.',
            },
          ],
        }),
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'Think Like a Test-Taker: Name That Principle',
        content: worked({
          problem:
            'EOC-style question: "A city\'s charter lists exactly which powers the city government may use and states that all other powers remain with the people. Which founding principle does the charter reflect? (A) natural rights (B) limited government (C) direct democracy (D) civic virtue"',
          thinkAloud: [
            'I describe the scenario in my own words first: the government\'s powers are LISTED, and everything not listed stays with the people. The focus is on restricting what government may do.',
            'Now I match to definitions. Natural rights are rights people are born with — the charter is about POWERS, not rights. Not (A).',
            'Limited government means government may use only the powers the people granted it — usually written down. That is exactly a charter listing the government\'s powers. Strong match for (B).',
            'Direct democracy is citizens voting on laws themselves — not mentioned. Civic virtue is serving the common good — also not the focus. (C) and (D) are out.',
          ],
          answer: '(B) limited government.',
          whyItWorks:
            'Principle questions are definition-matching in disguise. Restate the scenario in your own words, then match it to the ONE principle whose definition fits — the wrong answers usually fit a different principle, so knowing all seven definitions cold is the strategy.',
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Limited Government, Republicanism, and the Rule of Law',
        content:
          'The last three principles answer the question: "Once the people create a government, how do they keep it from becoming a tyrant?"\n\n' +
          'LIMITED GOVERNMENT — the government gets only the powers the people grant it, written into a constitution. If a power isn\'t granted, the government doesn\'t have it. (Roots: the Magna Carta first forced an English king to accept limits in 1215.)\n\n' +
          'REPUBLICANISM — the people don\'t vote on every law themselves; they elect representatives and hold them accountable at the next election. (Roots: the Roman Republic.)\n\n' +
          'THE RULE OF LAW — every person, from a new citizen to the president, is bound by the same law. Nobody is above it. (Roots: the Judeo-Christian higher-law tradition and English common law.)\n\n' +
          'Notice how the principles interlock: consent gives government its power, limits define the power, republicanism operates the power, and the rule of law polices everyone who holds it.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Interlocking Principles',
        content: check({
          question: 'A state senator caught speeding pays the same fine as any other driver. Which principle is this?',
          options: [
            {
              text: 'Rule of law — the law applies equally to leaders and citizens',
              correct: true,
              feedback: 'Correct! No one is above the law — that equal application to officials is the rule of law in action.',
            },
            {
              text: 'Popular sovereignty — power comes from the people',
              correct: false,
              feedback: 'Popular sovereignty is about the SOURCE of power. An official bound by the same law as everyone shows the RULE OF LAW.',
            },
            {
              text: 'Natural rights — rights people are born with',
              correct: false,
              feedback: 'No inborn right is at issue — the scenario shows the law binding an official equally: rule of law.',
            },
            {
              text: 'Republicanism — governing through elected representatives',
              correct: false,
              feedback: 'The senator\'s office isn\'t the point — her equal treatment under the law is. That\'s the rule of law.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: Locke and the Declaration, Side by Side',
        content: source({
          sourceTitle: 'Two Voices, One Idea',
          sourceAttribution:
            'John Locke, Second Treatise of Government, 1689; Declaration of Independence, 1776 (both public domain)',
          passage:
            'LOCKE (1689): "Men being, as has been said, by nature, all free, equal, and independent, no one can be put out of this estate, and subjected to the political power of another, without his own consent."\n\n' +
            'DECLARATION (1776): "We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights... That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed."',
          guidingQuestions: [
            {
              question: 'Which TWO principles appear in BOTH passages?',
              options: [
                {
                  text: 'Natural equality/rights and consent of the governed',
                  correct: true,
                  feedback: 'Right! Both declare people naturally free and equal, and both make consent the only legitimate source of political power.',
                },
                {
                  text: 'Federalism and judicial review',
                  correct: false,
                  feedback: 'Neither passage mentions dividing power between levels of government or courts striking down laws.',
                },
                {
                  text: 'The Electoral College and term limits',
                  correct: false,
                  feedback: 'Those are constitutional mechanisms from later — the passages state natural equality and consent.',
                },
              ],
            },
            {
              question: 'What does the 87-year gap between the passages show?',
              options: [
                {
                  text: 'The founders traced and inherited their principles from earlier thinkers like Locke',
                  correct: true,
                  feedback: 'Exactly — Jefferson built the Declaration out of principles Locke had articulated nearly a century earlier. Ideas first, documents second.',
                },
                {
                  text: 'Locke copied the Declaration of Independence',
                  correct: false,
                  feedback: 'Locke wrote in 1689 — 87 years BEFORE the Declaration. The influence flows from Locke forward.',
                },
                {
                  text: 'The two passages are unrelated coincidences',
                  correct: false,
                  feedback: 'Jefferson knew Locke\'s work well — the near-identical language is inheritance, not coincidence.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Check: Spot the Principle in the Text',
        content: check({
          question: 'The Constitution begins: "We the People of the United States... do ordain and establish this Constitution." Which principle do these words declare?',
          options: [
            {
              text: 'Popular sovereignty — the people themselves are the source of the government\'s authority',
              correct: true,
              feedback: 'Correct! The PEOPLE ordain and establish — not a king, not the states. Popular sovereignty in seven words.',
            },
            {
              text: 'Rule of law — everyone must obey the law',
              correct: false,
              feedback: 'The rule of law lives elsewhere in the design. The opening words name the AUTHOR of the government: the people — popular sovereignty.',
            },
            {
              text: 'Natural rights — rights people are born with',
              correct: false,
              feedback: 'Natural rights headline the DECLARATION. "We the People... do ordain and establish" declares popular sovereignty.',
            },
            {
              text: 'Salutary neglect — loose enforcement of laws',
              correct: false,
              feedback: 'Salutary neglect was a British colonial policy — nothing to do with the Preamble\'s declaration of popular sovereignty.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief',
        content:
          'You traced the seven principles beneath American law and government:\n\n' +
          '• NATURAL RIGHTS — born with them; government exists to protect them (Locke → Declaration).\n' +
          '• POPULAR SOVEREIGNTY — power comes from the people ("We the People").\n' +
          '• CONSENT OF THE GOVERNED — legitimate government rests on the people\'s agreement, expressed through elections.\n' +
          '• SOCIAL CONTRACT — the deal: some freedom given up, rights protected in return. An idea, not a signed paper.\n' +
          '• LIMITED GOVERNMENT — only the powers the people granted, written down (Magna Carta → Constitution).\n' +
          '• REPUBLICANISM — the people govern through representatives they elect (Rome → Congress).\n' +
          '• RULE OF LAW — everyone, including leaders, bound by the same law.\n\n' +
          'Test strategy: principle questions are definition-matching. Restate the scenario in your own words, then find the one principle whose definition fits exactly. You\'ll see these seven ideas again in every unit — they are the foundation the whole course is built on.',
      },
    ],
  },
]
