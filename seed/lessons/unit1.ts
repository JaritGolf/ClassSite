/**
 * Seed: Unit 1 Lessons — SS.7.CG.1.1–1.6 (ADR 0013).
 *
 * Six guided lessons, one per benchmark, each ~8 steps (~10–15 min):
 *   NOTE (big picture) → VOCABULARY (terms in context) → NOTE (core concept) →
 *   WORKED_EXAMPLE (EOC-style think-aloud, §18) → INTERACTIVE_CHECK →
 *   NOTE (core concept 2) → INTERACTIVE_CHECK → SOURCE_ANALYSIS (§10.4 Source Quest).
 *
 * Source-analysis passages reuse the level-2 texts from seed/stimuli_unit1.ts so
 * students meet the same sources in training that they'll see on assessments.
 * Structured steps store JSON per the src/lib/lesson-content contracts —
 * validated by tests/unit/seed/lesson-bank-shape.test.ts.
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

export const UNIT1_LESSONS: LessonSeedDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.1 — Enlightenment and European Influences
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.1',
    title: 'Where American Government Got Its Ideas',
    studentFriendlyTarget:
      'I can explain how Enlightenment thinkers and key English documents shaped American ideas about government.',
    body:
      'Before the United States existed, a bold idea was spreading through Europe: what if government power came from the people instead of a king? Thinkers of the Enlightenment argued that every person is born with rights no ruler can take away, and that government is a deal — a contract — between the people and their leaders.\n\n' +
      'In this mission you\'ll meet the thinkers (John Locke, Montesquieu, Rousseau) and the English documents (Magna Carta, English Bill of Rights, Mayflower Compact) that first put limits on royal power. Their ideas became the blueprint the American Founders used. Learn them well — you\'ll see them again in the Declaration of Independence and the Constitution.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: An Age of New Ideas',
        content:
          'In the 1600s and 1700s, most of Europe was ruled by kings and queens who claimed God had given them the right to rule. Ordinary people had little say in the laws they had to obey.\n\n' +
          'Then came the Enlightenment — a movement of writers and philosophers who said people should use REASON (careful thinking and evidence) to figure out how the world should work, instead of just accepting tradition. When they turned that reasoning toward government, they asked dangerous questions: Where does a ruler\'s power really come from? What is government actually FOR? What happens when a government treats its people badly?\n\n' +
          'Their answers — that power comes from the people, that government exists to protect rights, and that unfair governments can be changed — crossed the Atlantic Ocean and landed in the American colonies. In 1776, the Founders used those exact ideas to justify breaking away from Britain. This lesson is where the American story really begins.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Big Picture',
        content: check({
          question: 'Why were Enlightenment ideas so threatening to the kings of Europe?',
          options: [
            {
              text: 'They argued a ruler\'s power comes from the people, not from God',
              correct: true,
              feedback:
                'Exactly. If power comes from the people, a king who mistreats them can lose it — which is why these ideas eventually fueled a revolution.',
            },
            {
              text: 'They demanded all kings be replaced by scientists',
              correct: false,
              feedback:
                'Not quite — the Enlightenment prized reason, but it never proposed scientist-kings. Its dangerous idea was about WHERE power comes from.',
            },
            {
              text: 'They proved the divine right of kings was written into law',
              correct: false,
              feedback:
                'Backwards — divine right was the OLD belief. Enlightenment thinkers challenged it with reason.',
            },
            {
              text: 'They called for an end to all government',
              correct: false,
              feedback:
                'No — thinkers like Locke wanted BETTER government (one that protects rights), not no government at all.',
            },
          ],
        }),
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words of the Enlightenment',
        content:
          'natural rights — Rights every person is born with that government cannot take away. "Locke argued that life, liberty, and property are natural rights that belong to you no matter who rules."\n\n' +
          'social contract — An agreement in which people give up some freedom to a government in exchange for protection of their rights. "By obeying traffic laws, citizens hold up their end of the social contract while the government keeps roads safe."\n\n' +
          'popular sovereignty — The idea that political power belongs to the people, who give it to the government. "The words “We the People” express popular sovereignty — power flows up from citizens, not down from a king."\n\n' +
          'consent of the governed — A government is legitimate only if the people agree to be ruled by it. "Colonists argued Parliament could not tax them without their consent, because they elected no one in Parliament."\n\n' +
          'rule of law — Everyone, including the government itself, must follow the law. "The Magna Carta planted the rule of law by forcing even the king to obey legal limits."',
      },
      {
        stepType: 'NOTE',
        title: 'Three Thinkers You Must Know',
        content:
          'JOHN LOCKE (England) wrote that all people are born free and equal, with natural rights to life, liberty, and property. Government, he said, is a social contract: the people agree to be governed, and in return the government must protect their rights. Here\'s the revolutionary part — if a government breaks that deal, the people have the right to change or REPLACE it. Thomas Jefferson borrowed this idea almost word-for-word in the Declaration of Independence.\n\n' +
          'BARON DE MONTESQUIEU (France) studied governments across history and concluded that when one person or group holds all the power, liberty dies. His fix: SEPARATION OF POWERS — divide government into branches that make laws, carry out laws, and judge laws, so each can stop the others from grabbing too much power. Sound familiar? That\'s the three-branch design of the U.S. Constitution.\n\n' +
          'JEAN-JACQUES ROUSSEAU (France/Geneva) pushed popular sovereignty furthest: a government is only legitimate when it follows the will of the people. His book was literally titled "The Social Contract."\n\n' +
          'Study tip: keep the thinkers straight by their signature idea. Locke = natural rights & social contract. Montesquieu = separation of powers. Rousseau = popular sovereignty.',
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'How to Answer a "Which Thinker?" Question',
        content: worked({
          problem:
            'A civics test asks: "Which Enlightenment idea is MOST directly reflected in this statement from the Declaration of Independence: ‘Governments are instituted among Men, deriving their just powers from the consent of the governed’?"\n\nA. Separation of powers\nB. Social contract\nC. Judicial review\nD. Federalism',
          thinkAloud: [
            'First, I read the quote slowly and put it in my own words: "governments get their power because the people agree to be governed."',
            'Now I match that meaning to each option. Separation of powers (A) is about DIVIDING government into branches — the quote says nothing about branches, so A is out.',
            'Judicial review (C) is about courts striking down laws — that idea comes later (Marbury v. Madison), not from this quote. Out.',
            'Federalism (D) is about sharing power between national and state governments — again, not what the quote describes. Out.',
            'Social contract (B) is the agreement where people consent to be governed in exchange for protection of their rights. "Deriving their just powers from the consent of the governed" IS that agreement in action.',
          ],
          answer: 'B. Social contract',
          whyItWorks:
            'EOC questions often hide the answer inside the quote itself. Translate the quote into everyday words FIRST, then eliminate options that describe a different idea. If you can restate the quote and an answer choice in the same sentence without changing the meaning, that\'s your match.',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Natural Rights',
        content: check({
          question: 'According to John Locke, what should happen if a government fails to protect the people\'s natural rights?',
          options: [
            {
              text: 'The people have the right to change or replace the government',
              correct: true,
              feedback:
                'Correct! Locke said government is a contract — if it breaks its promise to protect rights, the people may alter or replace it. The Declaration of Independence makes this exact argument.',
            },
            {
              text: 'The king may choose new advisors to fix the problem',
              correct: false,
              feedback:
                'Not quite. Locke\'s idea puts the power in the PEOPLE\'s hands, not the ruler\'s. The people — not the king — decide when the contract is broken.',
            },
            {
              text: 'The people must obey and wait for conditions to improve',
              correct: false,
              feedback:
                'That\'s the OPPOSITE of Locke\'s point. He rejected the idea that people must simply endure a government that violates their rights.',
            },
            {
              text: 'The courts declare the government\'s actions unconstitutional',
              correct: false,
              feedback:
                'Careful — judicial review is an American constitutional practice from much later. Locke wrote before any of that existed; his answer was the people themselves.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'England\'s Paper Trail: Three Documents That Limited Power',
        content:
          'Enlightenment ideas didn\'t appear from nowhere — England had been slowly putting rulers under the law for centuries. Three documents matter most:\n\n' +
          'MAGNA CARTA (1215). English nobles forced King John to sign a charter agreeing that even the KING must obey the law. It protected against losing life, liberty, or property without lawful judgment. This planted two seeds that grew into American government: rule of law and limited government.\n\n' +
          'ENGLISH BILL OF RIGHTS (1689). After Parliament removed one king and invited in new monarchs, it made them accept written limits: no taxes without Parliament\'s consent, no cruel and unusual punishment, the right to petition the government. Notice how similar that list sounds to the U.S. Bill of Rights — exactly 100 years later.\n\n' +
          'MAYFLOWER COMPACT (1620). Before landing at Plymouth, the Pilgrim colonists signed an agreement to form a government and obey "just and equal laws" they made THEMSELVES. It was self-government by consent — a social contract written by ordinary people 70 years before Locke published his.\n\n' +
          'Watch out for a common mix-up: Magna Carta limited the KING in 1215; the English Bill of Rights limited the MONARCHY and empowered PARLIAMENT in 1689. Keep the dates 1215 → 1620 → 1689 in order and you\'ll never confuse them.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The English Documents',
        content: check({
          question: 'What key principle did the Magna Carta (1215) establish that later influenced American government?',
          options: [
            {
              text: 'Even the ruler must obey the law',
              correct: true,
              feedback:
                'Correct! Magna Carta forced King John under the law — the beginning of rule of law and limited government, both foundations of the U.S. Constitution.',
            },
            {
              text: 'All adult citizens have the right to vote',
              correct: false,
              feedback:
                'Not this one. Magna Carta protected nobles from the king; voting rights for ordinary people came many centuries later.',
            },
            {
              text: 'The colonies may govern themselves independently',
              correct: false,
              feedback:
                'Magna Carta is from 1215 — more than 350 years before English colonies in America existed. You may be thinking of colonial charters or the Mayflower Compact.',
            },
            {
              text: 'Government power should be split into three branches',
              correct: false,
              feedback:
                'Separation of powers is Montesquieu\'s idea from the 1700s, not Magna Carta. Magna Carta\'s contribution was putting the king UNDER the law.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'See It: The Road of Ideas, 1215 to 1776',
        content: timeline({
          kind: 'timeline',
          intro: 'Watch how each step limits rulers a little more — and hands power to the people.',
          connector: 'line',
          events: [
            { marker: '1215', label: 'Magna Carta', detail: 'Even the king must obey the law.' },
            { marker: '1620', label: 'Mayflower Compact', detail: 'Colonists agree in writing to govern themselves by consent.' },
            { marker: '1689', label: 'English Bill of Rights', detail: 'Parliament sets written limits on the monarchy.' },
            { marker: '1689', label: 'Locke\'s Two Treatises', detail: 'Natural rights and the social contract are published.' },
            { marker: '1776', label: 'Declaration of Independence', detail: 'The colonies use these ideas to justify a revolution.' },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Keep the Order Straight',
        content: check({
          question: 'Which document came FIRST — and started the tradition that even rulers must follow the law?',
          options: [
            {
              text: 'Magna Carta (1215)',
              correct: true,
              feedback:
                'Right! Magna Carta is the oldest — 1215, more than four centuries before Locke. Keep the order: 1215 → 1620 → 1689 → 1776.',
            },
            {
              text: 'The English Bill of Rights (1689)',
              correct: false,
              feedback:
                'The English Bill of Rights came in 1689 — more than 450 years AFTER the document you\'re looking for.',
            },
            {
              text: 'The Declaration of Independence (1776)',
              correct: false,
              feedback:
                'The Declaration is the END of this road, not the start — it used ideas that had been growing since 1215.',
            },
            {
              text: 'The Mayflower Compact (1620)',
              correct: false,
              feedback:
                'The Compact was an important early agreement, but another document put limits on a king 400 years earlier.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: Reading Locke for Yourself',
        content: source({
          sourceTitle: 'John Locke on Natural Rights',
          sourceAttribution: 'Adapted from John Locke, Two Treatises of Government, 1689',
          passage:
            'John Locke believed that all people are born free and equal. He wrote that no one can lose their freedom unless they agree to it. Locke said the purpose of government is to protect these natural rights — rights that belong to every person by nature, not given by rulers.\n\nLocke argued that if a government fails to protect people\'s rights, the people have the right to change or replace that government.',
          guidingQuestions: [
            {
              question: 'According to the passage, where do natural rights come from?',
              options: [
                {
                  text: 'People are born with them — they belong to every person by nature',
                  correct: true,
                  feedback:
                    'Correct! The passage says these rights "belong to every person by nature, not given by rulers." That\'s what makes them NATURAL rights.',
                },
                {
                  text: 'The government grants them to loyal citizens',
                  correct: false,
                  feedback:
                    'Re-read the passage: rights are "not given by rulers." If a government granted rights, it could also take them away — Locke\'s whole point is that it can\'t.',
                },
                {
                  text: 'They are earned by owning property',
                  correct: false,
                  feedback:
                    'Property is one of the rights Locke names elsewhere, but the passage says rights come from being born a person — not from wealth.',
                },
              ],
            },
            {
              question: 'Which later American document most directly used Locke\'s argument in this passage?',
              options: [
                {
                  text: 'The Declaration of Independence',
                  correct: true,
                  feedback:
                    'Correct! The Declaration repeats Locke almost exactly: unalienable rights, consent of the governed, and the right of the people to alter or abolish a destructive government.',
                },
                {
                  text: 'The Mayflower Compact',
                  correct: false,
                  feedback:
                    'The Mayflower Compact (1620) was written 69 years BEFORE Locke published this. It shows self-government by agreement, but it couldn\'t have borrowed from Locke.',
                },
                {
                  text: 'The Magna Carta',
                  correct: false,
                  feedback:
                    'Magna Carta came in 1215 — centuries before Locke. Influence flows the other way: Magna Carta helped inspire Locke.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief: What You Learned',
        content:
          'You made it through the ideas that built America. Lock these in:\n\n' +
          '• Natural rights (Locke): people are born with rights to life, liberty, and property — no government can take them away.\n' +
          '• Social contract: people accept government IN EXCHANGE for protection of their rights; break the deal and the people may replace it.\n' +
          '• Separation of powers (Montesquieu): split power into branches so no one holds it all.\n' +
          '• Popular sovereignty: power flows UP from the people.\n' +
          '• The English paper trail: Magna Carta (1215) → Mayflower Compact (1620) → English Bill of Rights (1689) — each put more limits on rulers.\n\n' +
          'Next up: a quick practice round, then the Readiness Check. You\'ve got this.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.2 — Colonial and British Governmental Traditions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.2',
    title: 'Colonists Learn to Govern Themselves',
    studentFriendlyTarget:
      'I can describe how colonial assemblies, town meetings, and British traditions built American habits of self-government.',
    body:
      'Imagine your parents moved 3,000 miles away and could only send you instructions by ship — letters that took two months to arrive. You\'d start making your own decisions pretty quickly, right?\n\n' +
      'That\'s exactly what happened in the American colonies. The king was an ocean away, so colonists built their own assemblies, held town meetings, and elected representatives — over 150 YEARS of practice governing themselves before anyone dreamed of independence. In this mission you\'ll see where American self-government was really born: not in 1776, but in places like Jamestown in 1619.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: Practice Makes Self-Government',
        content:
          'By the time the American Revolution began, colonists weren\'t beginners at government — they were experienced. Every colony had some form of elected assembly making local laws about taxes, roads, and courts. Farmers and shopkeepers voted, debated, and served in office.\n\n' +
          'This matters for one huge reason: when the colonies finally broke from Britain, they didn\'t have to invent self-government from scratch. They had been rehearsing it for a century and a half.\n\n' +
          'Two traditions fed this experience. First, colonists brought BRITISH traditions with them — the rights of Englishmen, trial by jury, and common law. Second, distance forced them to develop their OWN institutions: elected assemblies in the South, town meetings in New England, and written agreements like the Mayflower Compact. Keep both threads in mind as you train — EOC questions love to ask which tradition influenced what.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Big Picture',
        content: check({
          question: 'What is the BEST definition of self-government?',
          options: [
            {
              text: 'The people who live under the laws help make the laws',
              correct: true,
              feedback:
                'That\'s it — whether directly (town meetings) or through elected representatives (House of Burgesses), the governed do the governing.',
            },
            {
              text: 'A government with no laws at all',
              correct: false,
              feedback:
                'Self-government has plenty of laws — the point is WHO makes them: the people themselves.',
            },
            {
              text: 'A king who governs his own kingdom personally',
              correct: false,
              feedback:
                'A king ruling alone is the opposite — self-government means the PEOPLE governing themselves.',
            },
            {
              text: 'A governor appointed to rule a colony',
              correct: false,
              feedback:
                'Appointed governors answered to the king, not to the colonists — that\'s outside control, not self-government.',
            },
          ],
        }),
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words of Colonial Government',
        content:
          'colonial assembly — An elected lawmaking body in a colony. "The colonial assembly voted on local taxes without waiting for orders from London."\n\n' +
          'House of Burgesses — The first elected assembly in colonial America, created in Virginia in 1619. "A tobacco farmer could be elected a burgess and help write Virginia\'s laws."\n\n' +
          'town meeting — A New England gathering where community members debated and voted directly on local issues. "At the town meeting, villagers voted on where to build the new school — direct democracy in action."\n\n' +
          'common law — Law built up from judges\' decisions and customs over time, rather than written all at once. "English common law traditions like trial by jury crossed the ocean with the colonists."\n\n' +
          'salutary neglect — Britain\'s hands-off policy of loosely enforcing rules on the colonies. "Under salutary neglect, colonists grew used to running their own affairs — and resented it when Britain suddenly tightened control."',
      },
      {
        stepType: 'NOTE',
        title: 'America\'s First Self-Government: 1619 and 1620',
        content:
          'Two events, one year apart, started American self-government.\n\n' +
          'VIRGINIA HOUSE OF BURGESSES (1619). Virginia\'s colonists elected representatives — called burgesses — to a lawmaking assembly at Jamestown. It was the FIRST elected legislature in the American colonies. The principle it established: colonists expect a voice in the laws that govern them.\n\n' +
          'MAYFLOWER COMPACT (1620). Before the Pilgrims even stepped off their ship, 41 men signed an agreement to form a government and obey "just and equal laws" made for the good of the colony. It was government by CONSENT — the people themselves creating their own authority with a signature, not a king\'s command.\n\n' +
          'NEW ENGLAND TOWN MEETINGS. In towns across Massachusetts and Connecticut, colonists gathered to debate and vote directly on local matters — schools, roads, taxes. This was direct democracy: not electing someone to decide, but deciding yourself.\n\n' +
          'Memory anchor: 1619 = first ELECTED assembly (representative democracy). 1620 = first written agreement to SELF-GOVERN (consent). Town meetings = DIRECT democracy. Three different flavors of the same idea: people governing themselves.',
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'How to Handle a "Why Did It Matter?" Question',
        content: worked({
          problem:
            'A practice item asks: "Why was the Virginia House of Burgesses significant to the development of American government?"\n\nA. It declared Virginia independent from Great Britain\nB. It established the tradition of elected representative government in the colonies\nC. It gave every colonist, including women, the right to vote\nD. It created the first written constitution in North America',
          thinkAloud: [
            'The question asks about SIGNIFICANCE — why it mattered long-term — not just what it was.',
            'Option A: independence didn\'t come until 1776, more than 150 years after 1619. A confuses eras. Out.',
            'Option C: voting in colonial Virginia was limited to certain men, mostly property owners. "Every colonist, including women" is historically false. Out.',
            'Option D: "first written constitution" is bait — historians give that label to Connecticut\'s Fundamental Orders (1639), and the House of Burgesses was an assembly, not a document. Out.',
            'Option B: the House of Burgesses was the FIRST elected lawmaking assembly in the colonies, starting the tradition of representative government that leads straight to Congress. That\'s a significance statement, and it\'s accurate.',
          ],
          answer: 'B. It established the tradition of elected representative government in the colonies',
          whyItWorks:
            'On "significance" questions, wrong answers usually fail one of two tests: they\'re from the WRONG TIME (like A), or they OVERSTATE what happened (like C). Check each option against time and scale before choosing.',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Colonial Assemblies',
        content: check({
          question: 'How were New England town meetings DIFFERENT from the Virginia House of Burgesses?',
          options: [
            {
              text: 'Town meetings let citizens vote directly on issues; the House of Burgesses used elected representatives',
              correct: true,
              feedback:
                'Correct! Town meetings = direct democracy (citizens decide themselves). House of Burgesses = representative democracy (citizens elect burgesses to decide). Both are self-government, different methods.',
            },
            {
              text: 'Town meetings were run by the king\'s governors; the House of Burgesses was fully independent',
              correct: false,
              feedback:
                'Actually neither is right here — town meetings were run by local townspeople, and the House of Burgesses still operated under a royal colony\'s rules.',
            },
            {
              text: 'Town meetings made laws for all thirteen colonies at once',
              correct: false,
              feedback:
                'Town meetings were LOCAL — one town at a time. No colonial body made laws for all thirteen colonies until much later.',
            },
            {
              text: 'There was no real difference; both used elected representatives',
              correct: false,
              feedback:
                'There\'s a key difference: town meetings skipped representatives entirely. Citizens debated and voted in person — that\'s what makes them DIRECT democracy.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'British Habits the Colonists Kept (and One British Habit That Helped by Accident)',
        content:
          'The colonists thought of themselves as ENGLISH — and they claimed English rights.\n\n' +
          'COMMON LAW. England\'s legal system was built from centuries of judges\' rulings and customs: trial by jury, the idea that you can\'t be punished except by lawful judgment, precedent guiding future cases. Colonists carried this legal DNA into every colonial courtroom, and it still shapes American law today.\n\n' +
          'RIGHTS OF ENGLISHMEN. From Magna Carta and the English Bill of Rights, colonists inherited the belief that they had guaranteed rights — including no taxation without their consent through representatives. Remember this: it becomes the colonists\' battle cry in the 1760s.\n\n' +
          'SALUTARY NEGLECT. For decades, Britain barely enforced its trade laws and let colonial assemblies run local affairs. Why? Distance made enforcement expensive, and the colonies were profitable anyway. This "healthy neglect" wasn\'t a written policy — it was a habit. But it had a massive unintended consequence: colonists got USED to governing themselves. When Britain suddenly ended the neglect after 1763 (new taxes, real enforcement), colonists experienced it as losing rights they already owned.\n\n' +
          'That collision — self-governing habits meeting renewed British control — is exactly where the next mission begins.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Salutary Neglect',
        content: check({
          question: 'What was the most important EFFECT of Britain\'s policy of salutary neglect on the American colonies?',
          options: [
            {
              text: 'Colonists developed strong traditions of governing themselves',
              correct: true,
              feedback:
                'Correct! With Britain rarely interfering, colonial assemblies handled taxes, courts, and local laws for decades — building the self-government experience that made independence thinkable.',
            },
            {
              text: 'The colonies became too weak to survive without British support',
              correct: false,
              feedback:
                'The opposite happened — less British control made colonial governments STRONGER and more experienced, not weaker.',
            },
            {
              text: 'Colonists immediately declared independence from Britain',
              correct: false,
              feedback:
                'Salutary neglect kept colonists fairly content for decades. Independence only became popular AFTER Britain ended the neglect and tightened control in the 1760s.',
            },
            {
              text: 'Britain collected more tax money from the colonies than ever before',
              correct: false,
              feedback:
                'Neglect meant Britain collected LESS — trade laws went loosely enforced. Britain\'s later attempt to finally collect taxes is what sparked the conflict.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'See It: Self-Government Takes Root',
        content: timeline({
          kind: 'timeline',
          intro: 'A century and a half of practice — long before anyone imagined independence.',
          connector: 'line',
          events: [
            { marker: '1607', label: 'Jamestown founded', detail: 'England\'s first permanent colony in America.' },
            { marker: '1619', label: 'House of Burgesses', detail: 'The first elected assembly in the colonies.' },
            { marker: '1620', label: 'Mayflower Compact', detail: 'Pilgrims agree in writing to govern themselves.' },
            { marker: '1630s', label: 'Town meetings spread', detail: 'New England citizens vote directly on local issues.' },
            { marker: '1700s', label: 'Salutary neglect', detail: 'Britain looks away; colonial self-rule grows strong.' },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Common Thread',
        content: check({
          question: 'What do the House of Burgesses, the Mayflower Compact, and town meetings all have in common?',
          options: [
            {
              text: 'They were all ways colonists governed themselves',
              correct: true,
              feedback:
                'Exactly — one through elected representatives, one through a written agreement, one through direct votes. Three flavors of the same idea: self-government.',
            },
            {
              text: 'They were all created by order of the king',
              correct: false,
              feedback:
                'None were royal creations — each grew from colonists organizing their OWN government.',
            },
            {
              text: 'They all collected taxes for Parliament',
              correct: false,
              feedback:
                'Parliament isn\'t in this story — these institutions handled LOCAL affairs and were chosen by colonists.',
            },
            {
              text: 'They all existed only in Virginia',
              correct: false,
              feedback:
                'Virginia had the Burgesses, but the Compact was Plymouth and town meetings ran across New England.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: The House of Burgesses',
        content: source({
          sourceTitle: 'The Virginia House of Burgesses',
          sourceAttribution: 'Adapted from the Virginia Company\'s instructions establishing the assembly, 1619',
          passage:
            'In 1619, Virginia created the House of Burgesses — the first elected assembly in the American colonies. Representatives called burgesses were chosen by the colonists to make local laws.\n\nThe House of Burgesses was important because it showed that colonists expected a say in their own government. This idea — that the people should choose their leaders — became a key principle of American democracy.',
          guidingQuestions: [
            {
              question: 'What claim does the passage make about the House of Burgesses, and what evidence supports it?',
              options: [
                {
                  text: 'It claims the House was important because it showed colonists expected a voice in government, citing that burgesses were chosen by the colonists',
                  correct: true,
                  feedback:
                    'Correct! Claim: the House mattered because colonists expected a say. Evidence: representatives were CHOSEN by the colonists to make laws. Connecting claim to evidence is the core source-reading skill.',
                },
                {
                  text: 'It claims Virginia was the wealthiest colony, citing its tobacco exports',
                  correct: false,
                  feedback:
                    'The passage never mentions wealth or tobacco. Careful — stick to what the source actually says, not what you know from elsewhere.',
                },
                {
                  text: 'It claims the king approved of colonial self-government, citing royal instructions',
                  correct: false,
                  feedback:
                    'The passage doesn\'t discuss the king\'s opinion at all. Its focus is what the assembly SHOWED about the colonists\' expectations.',
                },
              ],
            },
            {
              question: 'Which later development does the principle in this passage MOST directly lead to?',
              options: [
                {
                  text: 'Electing representatives to Congress under the U.S. Constitution',
                  correct: true,
                  feedback:
                    'Correct! The line from 1619 to today: colonists electing burgesses → states electing legislatures → Americans electing Congress. Representative government is the through-line.',
                },
                {
                  text: 'The king appointing royal governors for each colony',
                  correct: false,
                  feedback:
                    'Royal governors were APPOINTED by the king — the opposite of the passage\'s principle that people should choose their leaders.',
                },
                {
                  text: 'Britain\'s policy of taxing the colonies after 1763',
                  correct: false,
                  feedback:
                    'British taxation actually VIOLATED this principle (taxation without representation) — it\'s the counter-example, not the continuation.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief: What You Learned',
        content:
          'Colonial America was a 150-year training camp for self-government. Lock these in:\n\n' +
          '• Self-government = the governed help make the laws.\n' +
          '• 1619 House of Burgesses: the first ELECTED assembly (representative democracy).\n' +
          '• 1620 Mayflower Compact: self-government by written CONSENT.\n' +
          '• Town meetings: DIRECT democracy in New England.\n' +
          '• Colonists kept English traditions too: common law and the rights of Englishmen.\n' +
          '• Salutary neglect let all of this grow — which made later British control feel like theft.\n\n' +
          'These 150 years of practice are why America was ready to govern itself in 1776.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.3 — British Policies and Colonial Reactions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.3',
    title: 'Taxes Without a Voice: The Road to Revolution',
    studentFriendlyTarget:
      'I can explain how British policies after the French and Indian War angered the colonists and how the colonists organized their resistance.',
    body:
      'In 1763, Britain won a long, expensive war against France — and then looked across the ocean at its American colonies and thought: they benefited from our protection, so they should help pay the bill.\n\n' +
      'The colonists saw it completely differently. New taxes were being passed by a Parliament in which the colonists had NO elected voice. To people raised on 150 years of self-government, that broke the most basic rule of English rights. In this mission you\'ll trace how a fight over taxes became a fight over principle — "no taxation without representation" — and how the colonists organized petitions, boycotts, and networks of resistance long before anyone fired a shot.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: A War Bill Comes Due',
        content:
          'The FRENCH AND INDIAN WAR (1754–1763) was a war between Britain and France, fought largely in North America, for control of the continent. Britain won huge territory — and a huge debt, nearly doubling what it owed.\n\n' +
          'Britain\'s leaders made a decision that changed history: the American colonists should help pay for the war and for the British soldiers still stationed in America. Parliament began passing tax laws aimed directly at the colonies — something it had rarely done before.\n\n' +
          'Timing is everything here. Remember salutary neglect from the last mission? For decades Britain had left the colonies alone to govern and tax themselves. Now, suddenly, Parliament was taxing colonists directly AND enforcing trade laws strictly. From London\'s view, this was fair cost-sharing. From the colonies\' view, it was a violation of their rights as Englishmen — because not a single colonist sat in the Parliament passing these laws.\n\n' +
          'Hold on to this cause-and-effect chain, because the EOC loves it: war debt → new British taxes → colonial protest.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Big Picture',
        content: check({
          question: 'After the French and Indian War, why did Britain decide to tax the American colonies?',
          options: [
            {
              text: 'The war left Britain deep in debt, and Parliament wanted the colonies to help pay',
              correct: true,
              feedback:
                'Right — victory was enormously expensive. That decision started the chain of events that led to revolution.',
            },
            {
              text: 'The colonies had refused to fight in the war',
              correct: false,
              feedback:
                'Colonists DID fight — a young George Washington among them. The issue was the war\'s cost, not colonial refusal.',
            },
            {
              text: 'Britain wanted to punish the colonies for the Boston Tea Party',
              correct: false,
              feedback:
                'Careful with the timeline — the Tea Party (1773) happened AFTER years of taxes, not before them.',
            },
            {
              text: 'France demanded that Britain collect taxes as part of the peace treaty',
              correct: false,
              feedback:
                'France lost the war and demanded nothing of the kind — the debt was Britain\'s own problem to solve.',
            },
          ],
        }),
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words of Protest',
        content:
          'Stamp Act — A 1765 law taxing paper goods in the colonies: newspapers, legal documents, even playing cards. "Under the Stamp Act, a colonist buying a newspaper paid a tax to Britain."\n\n' +
          'boycott — An organized refusal to buy certain goods as a protest. "Colonial merchants organized a boycott of British cloth, hitting British businesses in the wallet."\n\n' +
          'petition — A formal written request to those in power. "Before turning to protest, the colonists sent petitions asking the king to repeal the taxes."\n\n' +
          'repeal — To officially cancel a law. "After the boycotts, Parliament repealed the Stamp Act — but replaced it with new taxes."\n\n' +
          'committees of correspondence — Networks of colonial writers who shared news of British actions between colonies. "Thanks to the committees of correspondence, news of events in Boston reached Virginia in days."\n\n' +
          'taxation without representation — Being taxed by a government in which you have no elected voice. "The colonists\' core complaint wasn\'t the cost of the taxes — it was taxation without representation."',
      },
      {
        stepType: 'NOTE',
        title: 'The Taxes That Lit the Fuse',
        content:
          'NAVIGATION ACTS (1650s onward). Old trade laws requiring colonial goods to move on British ships to British ports. For a century these were barely enforced — until now. Strict enforcement was the first shock.\n\n' +
          'STAMP ACT (1765). The game-changer: a DIRECT tax on the colonists\' everyday paper — newspapers, contracts, wills, even playing cards. Every stamped page was a daily reminder of a tax passed without colonial consent. Protest exploded, and after colonial boycotts hurt British merchants, Parliament repealed it in 1766.\n\n' +
          'TOWNSHEND ACTS (1767). Parliament tried again — taxes on imported goods like glass, paint, paper, and TEA. Colonists answered with more boycotts; Britain sent troops to Boston to keep order, raising the temperature further.\n\n' +
          'Why did a few pennies of tax cause an uproar? PRINCIPLE. English rights — going back to Magna Carta and the English Bill of Rights — said taxes require the consent of the taxed, given through their representatives. The colonists elected no one in Parliament. So ANY tax from Parliament, cheap or expensive, was illegitimate. That\'s the meaning of "no taxation without representation" — and notice it\'s really the Enlightenment idea of consent of the governed, applied to money.',
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'How to Untangle a Cause-and-Effect Question',
        content: worked({
          problem:
            'An EOC-style item asks: "Which of the following BEST explains why Britain began taxing the American colonies directly after 1763?"\n\nA. Britain wanted to punish the colonies for the Boston Tea Party\nB. Britain needed revenue to pay debts from the French and Indian War\nC. The colonies requested British military protection and offered to pay for it\nD. Parliament wanted to end salutary neglect as a matter of principle',
          thinkAloud: [
            'The question pins a date: "after 1763." My first move is to ask what happened in 1763 — the French and Indian War ended.',
            'Option A: the Boston Tea Party happened in 1773, ten years AFTER the taxing began. An effect can\'t cause something that came before it. Out.',
            'Option C: the colonies never requested or offered this — Parliament imposed the taxes. Out.',
            'Option D is tempting because salutary neglect DID end. But ending neglect was the METHOD, not the REASON. The question asks WHY.',
            'Option B: the war left Britain deep in debt, and Parliament decided the colonies should share the cost. That\'s the direct cause, and it matches the 1763 date.',
          ],
          answer: 'B. Britain needed revenue to pay debts from the French and Indian War',
          whyItWorks:
            'Cause-and-effect questions are usually won with a timeline. Anchor the date in the question, kick out any option that happened AFTER the event (like the Tea Party), then separate the REASON (war debt) from the HOW (ending neglect, passing acts).',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: British Policies',
        content: check({
          question: 'Why did the Stamp Act (1765) anger the colonists more than the cost of the tax itself?',
          options: [
            {
              text: 'It was passed by a Parliament in which the colonists had no elected representatives',
              correct: true,
              feedback:
                'Correct! The objection was about CONSENT, not cost. Colonists held that only their own elected assemblies could tax them — "no taxation without representation."',
            },
            {
              text: 'The tax was so high that most colonists could not afford paper goods',
              correct: false,
              feedback:
                'The tax itself was relatively small. The fury was over the PRINCIPLE — being taxed without any voice in the decision.',
            },
            {
              text: 'It taxed only the wealthiest colonial merchants',
              correct: false,
              feedback:
                'Actually the Stamp Act touched nearly everyone — newspapers, legal papers, even playing cards — which is partly why protest spread so fast. But the core anger was still about representation.',
            },
            {
              text: 'It banned colonial newspapers from publishing',
              correct: false,
              feedback:
                'The Stamp Act TAXED newspapers; it didn\'t ban them. (Printers, who suddenly owed taxes on every page, became some of the loudest protesters.)',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'How the Colonists Fought Back (Before Any Fighting)',
        content:
          'The colonists\' resistance before 1775 was organized, creative, and mostly PEACEFUL — and the EOC expects you to know the toolkit:\n\n' +
          'PETITIONS. Colonial assemblies and the Stamp Act Congress (1765 — delegates from nine colonies!) sent formal petitions to the king and Parliament asserting that only colonial assemblies could tax colonists. This was resistance through official, legal channels — and an early taste of colonies acting TOGETHER.\n\n' +
          'BOYCOTTS. Colonists refused to buy British goods. Merchants signed non-importation agreements; families spun their own cloth instead of buying British fabric. Boycotts worked because they hit British merchants, who then pressured Parliament — it\'s why the Stamp Act was repealed.\n\n' +
          'SONS OF LIBERTY. Protest groups that organized demonstrations and pressured tax collectors to resign — sometimes with intimidation and destruction of property. Their most famous act: dumping 342 chests of British tea into Boston Harbor in 1773 (the Boston Tea Party).\n\n' +
          'COMMITTEES OF CORRESPONDENCE. Letter-writing networks that spread news of British actions from colony to colony, turning thirteen separate colonies into one connected resistance movement.\n\n' +
          'See the deeper pattern: every one of these tools is the colonists acting on CONSENT OF THE GOVERNED — withdrawing their cooperation from laws they never agreed to. Enlightenment theory had become street-level practice.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Colonial Resistance',
        content: check({
          question: 'How did the committees of correspondence strengthen colonial resistance to British policies?',
          options: [
            {
              text: 'They spread news between colonies, uniting them into a coordinated movement',
              correct: true,
              feedback:
                'Correct! The committees were a communication network — when Britain acted against one colony, all thirteen knew quickly and could respond together. Unity was their superpower.',
            },
            {
              text: 'They trained colonial soldiers for war against Britain',
              correct: false,
              feedback:
                'The committees wrote LETTERS, not battle plans. Military organization (militias, minutemen) was a separate development.',
            },
            {
              text: 'They collected taxes to fund the colonial governments',
              correct: false,
              feedback:
                'Not their job — colonial assemblies handled taxes. The committees\' role was spreading information and coordinating resistance.',
            },
            {
              text: 'They negotiated new trade agreements with France',
              correct: false,
              feedback:
                'Foreign alliances came later, during the Revolutionary War. Before the war, the committees\' work was inter-COLONIAL communication.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'See It: The Chain Reaction',
        content: timeline({
          kind: 'timeline',
          intro: 'Each event pushed the next — follow the chain.',
          connector: 'arrow',
          events: [
            { marker: '1763', label: 'War debt', detail: 'The French and Indian War leaves Britain owing a fortune.' },
            { marker: '1765', label: 'Stamp Act', detail: 'Parliament taxes colonial paper — the first direct tax.' },
            { marker: '1766', label: 'Protest works', detail: 'Petitions and boycotts push Parliament to repeal the Stamp Act.' },
            { marker: '1767', label: 'Townshend Acts', detail: 'New taxes on glass, paint, paper, and tea reignite the conflict.' },
            { marker: '1773', label: 'Boston Tea Party', detail: 'The Sons of Liberty dump 342 chests of tea into the harbor.' },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Read the Chain',
        content: check({
          question: 'What does this chain of events show about the colonists\' boycotts?',
          options: [
            {
              text: 'Economic pressure on British merchants could force Parliament to back down',
              correct: true,
              feedback:
                'Exactly — the Stamp Act repeal proved peaceful economic resistance WORKED, which is why the colonists kept reaching for it.',
            },
            {
              text: 'Boycotts had no effect on British policy',
              correct: false,
              feedback:
                'Look at 1766 — the boycotts hurt British merchants, who pressured Parliament into repealing the Stamp Act. They worked.',
            },
            {
              text: 'Only violence ever changed British policy',
              correct: false,
              feedback:
                'The Stamp Act fell to PEACEFUL pressure — petitions and boycotts — years before the famous confrontations.',
            },
            {
              text: 'Parliament repealed every tax the colonists opposed',
              correct: false,
              feedback:
                'Parliament repealed the Stamp Act but came right back with the Townshend Acts — the conflict kept escalating.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: Reading the Stamp Act',
        content: source({
          sourceTitle: 'The Stamp Act',
          sourceAttribution: 'Adapted from the Stamp Act, British Parliament, 1765',
          passage:
            'In 1765, the British Parliament passed the Stamp Act. It placed a tax on paper goods in the colonies — newspapers, legal documents, and even playing cards.\n\nColonists were angry because they had no representatives in Parliament. They argued they could not be taxed without having a voice in the decision. Their protest slogan was "No taxation without representation."',
          guidingQuestions: [
            {
              question: 'Based on the passage, what was the colonists\' main argument against the Stamp Act?',
              options: [
                {
                  text: 'They could not legitimately be taxed by a body in which they had no voice',
                  correct: true,
                  feedback:
                    'Correct! The passage centers the complaint on representation: "they could not be taxed without having a voice in the decision."',
                },
                {
                  text: 'The tax money would be spent on wars in Europe instead of America',
                  correct: false,
                  feedback:
                    'The passage says nothing about how the money would be spent. Anchor your answer in the text itself.',
                },
                {
                  text: 'Paper goods were already too expensive in the colonies',
                  correct: false,
                  feedback:
                    'Price isn\'t the passage\'s point — the objection is about having no REPRESENTATIVES, not about affordability.',
                },
              ],
            },
            {
              question: 'The slogan "No taxation without representation" is best described as an application of which Enlightenment principle?',
              options: [
                {
                  text: 'Consent of the governed',
                  correct: true,
                  feedback:
                    'Correct! Taxes without elected representatives = government acting WITHOUT the people\'s consent. The slogan is consent of the governed, applied to taxation.',
                },
                {
                  text: 'Separation of powers',
                  correct: false,
                  feedback:
                    'Separation of powers is about dividing government into branches — not about who agrees to taxes. That\'s Montesquieu\'s lane; this slogan lives in Locke\'s.',
                },
                {
                  text: 'Rule of law',
                  correct: false,
                  feedback:
                    'Close cousin, but not the best fit — the Stamp Act WAS technically a law. The complaint was that it lacked the colonists\' CONSENT through representation.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief: What You Learned',
        content:
          'You just traced the road to revolution. Lock these in:\n\n' +
          '• Root cause: French and Indian War debt → Britain taxes the colonies.\n' +
          '• Core objection: not the COST — the lack of CONSENT. No colonist sat in Parliament. "No taxation without representation."\n' +
          '• The resistance toolkit: petitions (formal requests), boycotts (economic pressure), Sons of Liberty (organized protest), committees of correspondence (uniting the colonies).\n' +
          '• Boycotts worked: they forced the Stamp Act\'s repeal in 1766.\n' +
          '• The pattern: British action → colonial resistance → British reaction → deeper resistance.\n\n' +
          'Keep the chain handy: war debt → taxes → protest. EOC questions love it.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.4 — Principles and Ideals of the Declaration of Independence
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.4',
    title: 'Declaring Independence: Ideas Worth a Revolution',
    studentFriendlyTarget:
      'I can explain the main principles of the Declaration of Independence and tell universal principles apart from specific grievances.',
    body:
      'By summer 1776, the colonies were already at war with Britain — but they hadn\'t yet said WHY to the world. The Continental Congress asked a 33-year-old Virginian named Thomas Jefferson to draft the answer.\n\n' +
      'What he wrote is part breakup letter, part philosophy lesson, and part legal argument. The Declaration of Independence took the Enlightenment ideas you\'ve been training on — natural rights, consent of the governed, the right to replace a broken government — and used them to justify revolution. In this mission you\'ll learn the document\'s three-part structure and master the skill the EOC tests hardest here: telling a universal PRINCIPLE from a specific GRIEVANCE.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: Explaining a Revolution to the World',
        content:
          'The Declaration of Independence, adopted July 4, 1776, had a job to do — three jobs, actually.\n\n' +
          'First, ANNOUNCE the break: the thirteen colonies now considered themselves free and independent states.\n\n' +
          'Second, JUSTIFY it. Rebelling against your king was treason, punishable by death. The Declaration had to prove to the world (and to potential allies like France) that this wasn\'t a tantrum — it was a reasoned, rightful act based on principles any Enlightenment reader would recognize.\n\n' +
          'Third, UNITE the colonies. Thirteen quarrelsome colonies needed one shared statement of what they stood for.\n\n' +
          'One crucial thing to understand: the Declaration is NOT a plan of government and NOT law today. It created no congress, no courts, no taxes. It\'s a statement of principles and a justification for independence. (The plan of government comes later — first the Articles of Confederation, then the Constitution.) Keep that straight and you\'ll dodge one of the most common test traps in this unit.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Big Picture',
        content: check({
          question: 'What were the Declaration of Independence\'s three jobs?',
          options: [
            {
              text: 'Announce the break with Britain, justify it with reasons, and unite the colonies',
              correct: true,
              feedback:
                'All three — announce, justify, unite. It\'s a persuasive argument with the highest possible stakes.',
            },
            {
              text: 'Create a president, a congress, and national courts',
              correct: false,
              feedback:
                'That\'s the CONSTITUTION\'s job, thirteen years later. The Declaration set up no government at all.',
            },
            {
              text: 'Declare war, raise taxes, and print money',
              correct: false,
              feedback:
                'The Declaration granted no powers — it\'s a statement of principles and reasons, not a plan of government.',
            },
            {
              text: 'Apologize to the king and request new laws',
              correct: false,
              feedback:
                'No apology anywhere — it\'s a firm breakup letter, and the war continued for seven more years.',
            },
          ],
        }),
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words of the Declaration',
        content:
          'self-evident — Obviously true; needing no proof. "The Declaration calls it self-evident that all men are created equal — a truth you can see without argument."\n\n' +
          'unalienable rights — Rights that cannot be taken away or given up. "Life, liberty, and the pursuit of happiness are named as unalienable rights."\n\n' +
          'grievance — A formal complaint against someone in power. "More than half the Declaration is a list of grievances against King George III."\n\n' +
          'alter or abolish — To change or completely end a government. "The Declaration claims the people\'s right to alter or abolish any government that destroys their rights."\n\n' +
          'consent of the governed — Government power is only legitimate when the people agree to it. "Jefferson wrote that governments derive their just powers from the consent of the governed — pure Locke."',
      },
      {
        stepType: 'NOTE',
        title: 'The Declaration\'s Three-Part Structure',
        content:
          'Think of the Declaration as an argument in three moves:\n\n' +
          'PART 1 — THE PRINCIPLES (the famous part). Universal claims about ALL people and ALL governments: all men are created equal; everyone has unalienable rights (life, liberty, the pursuit of happiness); governments exist to SECURE those rights; government power comes from the consent of the governed; and when a government becomes destructive of rights, the people may alter or abolish it. Notice: no king is named yet. These statements are meant to be true everywhere, forever.\n\n' +
          'PART 2 — THE GRIEVANCES (the longest part). Now the argument turns specific: a list of 27 accusations against King George III. He dissolved colonial legislatures. He kept standing armies in the colonies without consent. He imposed taxes without consent. He cut off colonial trade. Each grievance is EVIDENCE that this particular king broke the social contract described in Part 1.\n\n' +
          'PART 3 — THE DECLARATION ITSELF. The conclusion: therefore, these colonies ARE free and independent states, with full power to make war, peace, and alliances.\n\n' +
          'See the logic? Principles (how government SHOULD work) + Grievances (proof this government DIDN\'T) = Justified independence. It\'s a persuasive essay with the highest stakes imaginable.',
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'How to Tell a Principle from a Grievance',
        content: worked({
          problem:
            'A test item asks: "Which statement from the Declaration of Independence expresses a universal PRINCIPLE rather than a specific grievance?"\n\nA. "He has dissolved Representative Houses repeatedly"\nB. "He has kept among us, in times of peace, Standing Armies"\nC. "Governments are instituted among Men, deriving their just powers from the consent of the governed"\nD. "He has imposed Taxes on us without our Consent"',
          thinkAloud: [
            'My rule of thumb: grievances start with "He has..." — they accuse King George III of a specific action. Principles talk about ALL people or ALL governments, no king needed.',
            'Option A starts with "He has dissolved..." — a specific accusation against the king. Grievance.',
            'Option B: "He has kept... Standing Armies" — again a specific royal action. Grievance.',
            'Option D: "He has imposed Taxes..." — specific accusation. Grievance. (Notice it\'s BUILT on the consent principle, but as stated it\'s a complaint about one king\'s act.)',
            'Option C talks about "Governments" in general and where "just powers" come from — true of any government, anywhere, no king named. That\'s a universal principle.',
          ],
          answer: 'C. "Governments are instituted among Men, deriving their just powers from the consent of the governed"',
          whyItWorks:
            'The "He has..." test is fast and reliable: grievances accuse a specific ruler of a specific act; principles are timeless claims about people and government in general. When an option names or points at one ruler\'s behavior, it\'s a grievance.',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Principles of the Declaration',
        content: check({
          question: 'According to the Declaration of Independence, what is the main PURPOSE of government?',
          options: [
            {
              text: 'To secure the people\'s unalienable rights',
              correct: true,
              feedback:
                'Correct! "To secure these rights, Governments are instituted among Men." Government is the bodyguard of rights — that\'s its job description, straight from Locke.',
            },
            {
              text: 'To expand the nation\'s territory and wealth',
              correct: false,
              feedback:
                'The Declaration never says this. Its claim is that government exists to SECURE RIGHTS — life, liberty, and the pursuit of happiness.',
            },
            {
              text: 'To make sure all citizens are economically equal',
              correct: false,
              feedback:
                '"Created equal" in the Declaration means equal in RIGHTS, not equal in wealth. The stated purpose of government is protecting rights.',
            },
            {
              text: 'To carry out the commands of the lawful monarch',
              correct: false,
              feedback:
                'That\'s the divine-right view the Declaration was written to DEMOLISH. Power flows from the consent of the governed, not from a monarch.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Locke\'s Fingerprints — and Why the Declaration Still Matters',
        content:
          'Put Locke and Jefferson side by side and the borrowing is unmistakable:\n\n' +
          'Locke: people are born with natural rights to life, liberty, and property. → Jefferson: "Life, Liberty and the pursuit of Happiness."\n\n' +
          'Locke: government is a social contract based on the consent of the people. → Jefferson: governments derive "their just powers from the consent of the governed."\n\n' +
          'Locke: if government breaks the contract, the people may replace it. → Jefferson: "it is the Right of the People to alter or to abolish it."\n\n' +
          'Why does this document still matter beyond 1776?\n\n' +
          'It set the STANDARD America would forever be measured against. "All men are created equal" was written in a nation that allowed slavery — a contradiction Americans have wrestled with ever since. Abolitionists quoted the Declaration against slavery. The women\'s rights movement at Seneca Falls (1848) rewrote it: "all men and women are created equal." Abraham Lincoln at Gettysburg and Dr. Martin Luther King Jr. at the Lincoln Memorial both held America to Jefferson\'s words. The Declaration works like a promise the country keeps trying to fully live up to — which is exactly why you\'re still studying it.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Principle or Grievance?',
        content: check({
          question: 'The Declaration states: "He has refused his Assent to Laws, the most wholesome and necessary for the public good." What is this an example of?',
          options: [
            {
              text: 'A grievance — a specific complaint against King George III',
              correct: true,
              feedback:
                'Correct! The "He has..." opener gives it away: this accuses the king of a specific action (blocking colonial laws). It\'s evidence for the argument, not a universal principle.',
            },
            {
              text: 'A universal principle about all governments',
              correct: false,
              feedback:
                'Look at the first two words: "He has..." — that points at one specific ruler\'s behavior. Principles speak about all people or all governments in general.',
            },
            {
              text: 'A declaration that the colonies are independent states',
              correct: false,
              feedback:
                'The formal declaration of independence comes in Part 3, at the end. This sentence is from the list of complaints in Part 2.',
            },
            {
              text: 'A plan for how the new American government will be organized',
              correct: false,
              feedback:
                'Remember: the Declaration contains NO plan of government at all. Plans come later, with the Articles of Confederation and then the Constitution.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'See It: The Argument, Step by Step',
        content: timeline({
          kind: 'timeline',
          intro: 'Jefferson built one logical argument in three moves — each part needs the others.',
          connector: 'arrow',
          events: [
            { marker: 'Part 1', label: 'Universal principles', detail: 'All people have rights; government exists to protect them; power comes from consent.' },
            { marker: 'Part 2', label: '27 grievances', detail: '"He has..." — evidence that King George III broke the deal.' },
            { marker: 'Part 3', label: 'The declaration', detail: 'Therefore, these colonies are free and independent states.' },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: How the Argument Works',
        content: check({
          question: 'How do the grievances (Part 2) support the principles (Part 1)?',
          options: [
            {
              text: 'They provide evidence that the king violated the principles, which justifies independence',
              correct: true,
              feedback:
                'That\'s the logic: principles say what government SHOULD do; grievances prove this one DIDN\'T; conclusion — independence is justified.',
            },
            {
              text: 'They list the rights all people are born with',
              correct: false,
              feedback:
                'The RIGHTS live in Part 1. The grievances are specific accusations against one king.',
            },
            {
              text: 'They describe the structure of the new American government',
              correct: false,
              feedback:
                'No structure is described anywhere in the Declaration — that comes later, with the Articles and then the Constitution.',
            },
            {
              text: 'They are unrelated additions included for length',
              correct: false,
              feedback:
                'They\'re the heart of the argument — without evidence that the king broke the contract, the conclusion wouldn\'t follow.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: We Hold These Truths',
        content: source({
          sourceTitle: 'The Declaration of Independence — Core Principles',
          sourceAttribution: 'Adapted from the Declaration of Independence, Continental Congress, 1776',
          passage:
            'The Declaration of Independence stated that all people are created equal and have certain rights that cannot be taken away. These include life, liberty, and the pursuit of happiness.\n\nIt also said that governments get their power from the consent of the governed — meaning the people. If a government fails to protect these rights, the people have the right to change or replace it.\n\nThese ideas came directly from Enlightenment philosophers like John Locke.',
          guidingQuestions: [
            {
              question: 'According to the passage, when do the people have the right to change or replace their government?',
              options: [
                {
                  text: 'When the government fails to protect their rights',
                  correct: true,
                  feedback:
                    'Correct! The trigger is a broken promise: government exists to protect rights, so failing that job is what justifies changing or replacing it.',
                },
                {
                  text: 'Whenever an election does not go their way',
                  correct: false,
                  feedback:
                    'The passage sets a much higher bar — a government FAILING TO PROTECT RIGHTS, not ordinary political disappointment.',
                },
                {
                  text: 'When a neighboring country offers military support',
                  correct: false,
                  feedback:
                    'Foreign help isn\'t mentioned in the passage at all. The justification is about rights, not opportunity.',
                },
              ],
            },
            {
              question: 'What does the passage identify as the SOURCE of a government\'s power?',
              options: [
                {
                  text: 'The consent of the governed — the people',
                  correct: true,
                  feedback:
                    'Correct! "Governments get their power from the consent of the governed — meaning the people." That\'s popular sovereignty in one sentence.',
                },
                {
                  text: 'The traditions of the British monarchy',
                  correct: false,
                  feedback:
                    'The Declaration breaks with royal authority entirely — the passage locates power in the people\'s consent, not in any crown.',
                },
                {
                  text: 'The military strength of the nation',
                  correct: false,
                  feedback:
                    'Might isn\'t right here — the passage grounds legitimate power in agreement (consent), not force.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief: What You Learned',
        content:
          'You can now read the Declaration like a historian. Lock these in:\n\n' +
          '• Adopted July 4, 1776; drafted by Thomas Jefferson.\n' +
          '• Three parts: universal PRINCIPLES → specific GRIEVANCES ("He has...") → the formal DECLARATION of independence.\n' +
          '• Key principles: all created equal; unalienable rights (life, liberty, the pursuit of happiness); consent of the governed; the right to alter or abolish a destructive government.\n' +
          '• Straight from Locke: natural rights + social contract + the right to replace a broken government.\n' +
          '• It is NOT law and NOT a plan of government — it\'s the promise America keeps trying to live up to.\n\n' +
          'The "He has..." test: specific ruler + specific act = grievance. True everywhere, always = principle.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.5 — Strengths and Weaknesses of the Articles of Confederation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.5',
    title: 'A Government Too Weak to Govern',
    studentFriendlyTarget:
      'I can identify the weaknesses of the Articles of Confederation and explain how Shays\' Rebellion exposed them.',
    body:
      'America had just fought a war to escape a powerful central government — so when it came time to design its own, the states built the weakest national government they could get away with. It had no president, no national courts, and it couldn\'t collect a single dollar of taxes.\n\n' +
      'The result was the Articles of Confederation: America\'s FIRST plan of government, and a fascinating failure. In this mission you\'ll diagnose exactly what the Articles couldn\'t do, and watch a farmers\' uprising in Massachusetts — Shays\' Rebellion — prove to the whole country that the design had to change.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: Afraid of Kings, America Builds a Weak Government',
        content:
          'Put yourself in 1781. You\'ve just fought a bloody war because a distant central government taxed you without consent and sent its army into your towns. What\'s your number-one design goal for your OWN government? Simple: never let that happen again.\n\n' +
          'So the Articles of Confederation (ratified 1781) created a "league of friendship" — thirteen states cooperating like independent countries, with a deliberately feeble national government. The design wasn\'t an accident or stupidity. It was FEAR of tyranny, written into law.\n\n' +
          'And to be fair, the Articles had real achievements: the government under them won the Revolutionary War, negotiated the Treaty of Paris (1783), and passed the Northwest Ordinance (1787), which set fair rules for turning western territory into equal new states.\n\n' +
          'But the same weakness that prevented tyranny also prevented GOVERNING. A government that can\'t tax can\'t pay its debts. A government that can\'t enforce laws can\'t keep order. Over the 1780s, those flaws stacked up into a national crisis — and that\'s the story of this mission.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Big Picture',
        content: check({
          question: 'Why did Americans deliberately design a WEAK national government in 1781?',
          options: [
            {
              text: 'They had just fought a war against a powerful central government and feared building another',
              correct: true,
              feedback:
                'Exactly — the weakness was a FEATURE born of fear of tyranny. It just turned out to prevent governing, too.',
            },
            {
              text: 'They believed government was unnecessary in peacetime',
              correct: false,
              feedback:
                'They wanted government — thirteen strong STATE governments. Only the national layer was kept weak, on purpose.',
            },
            {
              text: 'They could not afford to pay for a stronger government',
              correct: false,
              feedback:
                'Money was tight, but the design choice was about FEAR of concentrated power, not cost.',
            },
            {
              text: 'Britain required a weak government in the peace treaty',
              correct: false,
              feedback:
                'Britain had no say in America\'s design — the caution came from the Americans\' own experience with a king.',
            },
          ],
        }),
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words of the Confederation Era',
        content:
          'confederation — A loose alliance of independent states that keep most of their own power. "Under a confederation, the states, not the national government, held the real power."\n\n' +
          'sovereignty — Supreme power to govern yourself. "Article II said each state retains its sovereignty, freedom, and independence."\n\n' +
          'ratify — To formally approve. "All thirteen states had to ratify the Articles before they took effect."\n\n' +
          'unanimous — Agreed to by everyone, with no exceptions. "Amending the Articles required a unanimous vote — one stubborn state could block any change."\n\n' +
          'rebellion — An armed uprising against authority. "Shays\' Rebellion terrified national leaders because no federal army existed to stop it."',
      },
      {
        stepType: 'NOTE',
        title: 'What the Articles Could NOT Do',
        content:
          'Here\'s the weakness checklist — learn it cold, because the EOC tests it constantly:\n\n' +
          'NO POWER TO TAX. Congress could only REQUEST money from the states. States mostly said no. Result: the national government couldn\'t pay its war debts or its soldiers.\n\n' +
          'NO POWER TO ENFORCE LAWS. Congress could pass laws but had no way to make states or people obey them. A law nobody must follow is a suggestion.\n\n' +
          'NO EXECUTIVE BRANCH. No president. Nobody whose job was to carry out the laws or lead in a crisis.\n\n' +
          'NO NATIONAL COURTS. Disputes between states had no referee.\n\n' +
          'ONE STATE, ONE VOTE — and major laws needed 9 of 13 states to agree, so little got done.\n\n' +
          'AMENDMENTS REQUIRED UNANIMITY. Fixing ANY of the above required all thirteen states to agree. Rhode Island alone could — and did — block reform.\n\n' +
          'NO POWER OVER TRADE. States taxed each other\'s goods and printed their own money; the economy was chaos.\n\n' +
          'Notice the pattern: every weakness traces back to the same root — the states kept sovereignty, so the national government governed only by permission. The design that prevented tyranny also prevented solving any national problem.',
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'How to Trace a Problem Back to Its Structural Cause',
        content: worked({
          problem:
            'An EOC-style item asks: "Under the Articles of Confederation, the national government was unable to pay its Revolutionary War debts. Which weakness of the Articles BEST explains this problem?"\n\nA. Amendments required a unanimous vote of the states\nB. Congress lacked the power to levy taxes\nC. There was no national court system\nD. Each state had only one vote in Congress',
          thinkAloud: [
            'The problem in the question is about MONEY — unpaid debts. I need the weakness most directly connected to money.',
            'Option C, no national courts, is about settling legal disputes. Courts don\'t raise revenue. Not the best link.',
            'Option D, one state one vote, is about how decisions were made — it made lawmaking slow, but it doesn\'t explain an empty treasury by itself.',
            'Option A, unanimous amendments, explains why the weaknesses couldn\'t be FIXED — a real problem, but one step removed from the debt itself.',
            'Option B: no power to tax means no reliable income. No income, no debt payments. That\'s the direct cause-and-effect chain the question wants.',
          ],
          answer: 'B. Congress lacked the power to levy taxes',
          whyItWorks:
            'When a question pairs a PROBLEM with a list of WEAKNESSES, pick the weakness with the shortest, most direct causal chain to that exact problem. Money problems → tax power. Enforcement problems → no executive. Dispute problems → no courts. Match the category first, then confirm.',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Weaknesses of the Articles',
        content: check({
          question: 'Why was it nearly impossible to FIX the Articles of Confederation\'s problems?',
          options: [
            {
              text: 'Amending the Articles required the unanimous approval of all thirteen states',
              correct: true,
              feedback:
                'Correct! Any single state could veto any change — and states like Rhode Island did exactly that. The repair mechanism was itself broken, which is why leaders eventually chose to start over.',
            },
            {
              text: 'The president kept vetoing every proposed amendment',
              correct: false,
              feedback:
                'Trick option — there WAS no president under the Articles. No executive branch existed at all.',
            },
            {
              text: 'The national courts ruled that amendments were unconstitutional',
              correct: false,
              feedback:
                'Another trap — the Articles created no national courts. Nothing could be ruled unconstitutional because no such court existed.',
            },
            {
              text: 'The king of England still had to approve changes to American law',
              correct: false,
              feedback:
                'After independence, Britain had no authority over American government. The obstacle was internal: the unanimity rule.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Shays\' Rebellion: The Wake-Up Call',
        content:
          'In 1786, the weaknesses stopped being abstract.\n\n' +
          'THE SPARK. Massachusetts farmers — many of them Revolutionary War veterans — were drowning in debt and taxes. Courts were seizing their farms when they couldn\'t pay. To these men, it looked like the tyranny they\'d fought against, now wearing American clothes.\n\n' +
          'THE UPRISING. Led by former Continental Army captain Daniel Shays, about 1,200 farmers marched on courthouses to shut down the foreclosure hearings, and eventually moved on the federal arsenal at Springfield.\n\n' +
          'THE TERRIFYING PART. The national government could do... nothing. No money to raise an army (no tax power, remember?), no executive to lead a response, no mechanism at all. Massachusetts had to put down the rebellion with a PRIVATELY funded state militia.\n\n' +
          'THE EFFECT. Leaders across the states were shaken. George Washington wrote anxious letters: what good is a government that cannot keep order? Within months, delegates agreed to meet in Philadelphia in May 1787 — officially to "revise" the Articles. Once in the room, they decided the patient couldn\'t be saved and wrote an entirely new Constitution instead.\n\n' +
          'Cause-and-effect chain for the test: farmers\' debt crisis → Shays\' Rebellion → national government powerless to respond → Constitutional Convention called. That chain IS this benchmark.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Shays\' Rebellion',
        content: check({
          question: 'What did Shays\' Rebellion demonstrate to American leaders?',
          options: [
            {
              text: 'The national government was too weak to maintain order',
              correct: true,
              feedback:
                'Correct! Congress could not fund or field a force to respond — a private militia had to do it. The rebellion turned the Articles\' weaknesses from theory into a visible national emergency, leading directly to the Constitutional Convention.',
            },
            {
              text: 'The states were too weak and needed a king to restore order',
              correct: false,
              feedback:
                'No serious leader proposed a king — and Massachusetts DID eventually stop the rebellion. The lesson was about the NATIONAL government\'s helplessness, not a need for monarchy.',
            },
            {
              text: 'Farmers had no real complaints about the economy',
              correct: false,
              feedback:
                'The farmers\' grievances — crushing debt, taxes, foreclosures — were very real. That\'s what made the crisis so alarming: legitimate problems, and no government able to address them.',
            },
            {
              text: 'The Articles of Confederation were working as intended',
              correct: false,
              feedback:
                'Quite the opposite — the rebellion is THE event that convinced leaders the Articles had failed and a stronger national government was necessary.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'See It: How the Articles Collapsed',
        content: timeline({
          kind: 'timeline',
          intro: 'From hopeful league to national emergency in six years.',
          connector: 'arrow',
          events: [
            { marker: '1781', label: 'Articles ratified', detail: 'A "league of friendship" — the states keep the power.' },
            { marker: '1780s', label: 'Government can\'t function', detail: 'No taxes collected, laws unenforceable, war debts unpaid.' },
            { marker: '1786', label: 'Shays\' Rebellion', detail: 'Armed farmers close courts; the nation can\'t raise a single soldier.' },
            { marker: '1787', label: 'Constitutional Convention', detail: 'Delegates meet to fix the Articles — and replace them instead.' },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Turning Point',
        content: check({
          question: 'What did Shays\' Rebellion prove that years of complaints could not?',
          options: [
            {
              text: 'The national government was too weak to keep order — visibly and dangerously',
              correct: true,
              feedback:
                'The rebellion turned abstract weaknesses into an emergency everyone could see. Within months, delegates were headed to Philadelphia.',
            },
            {
              text: 'Massachusetts farmers were the real threat to America',
              correct: false,
              feedback:
                'The farmers had real grievances — the scare was that NO national force existed to respond to any crisis at all.',
            },
            {
              text: 'The Articles needed only one small amendment',
              correct: false,
              feedback:
                'Amending required all 13 states — practically impossible. The rebellion helped convince leaders to start over entirely.',
            },
            {
              text: 'State militias could handle every emergency',
              correct: false,
              feedback:
                'A PRIVATELY funded militia had to save the day — proof the system had failed, not proof it worked.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: Each State Keeps Its Power',
        content: source({
          sourceTitle: 'The Articles of Confederation on State Power',
          sourceAttribution: 'Adapted from the Articles of Confederation, Article II, 1781',
          passage:
            'Under the Articles of Confederation (1781), each state kept most of its power. The national government was very weak — it could not collect taxes, could not force states to follow its laws, and had no president or courts.\n\nBecause states acted almost like separate countries, the new nation had serious problems: it couldn\'t pay its war debts, defend its borders, or enforce trade agreements.',
          guidingQuestions: [
            {
              question: 'According to the passage, what was the ROOT cause of the national government\'s problems?',
              options: [
                {
                  text: 'Each state kept most of its power, acting almost like a separate country',
                  correct: true,
                  feedback:
                    'Correct! Every listed problem — no taxes, no enforcement, no defense — flows from that first sentence: the states, not the nation, held the power.',
                },
                {
                  text: 'The president refused to enforce the laws Congress passed',
                  correct: false,
                  feedback:
                    'Re-read carefully: the passage says the government "had no president" at all. That absence is part of the weakness, not a stubborn officeholder.',
                },
                {
                  text: 'Britain continued to control American trade after the war',
                  correct: false,
                  feedback:
                    'The passage blames the structure of the Articles — state power and a weak center — not British interference.',
                },
              ],
            },
            {
              question: 'Which statement is a reasonable INFERENCE from this passage?',
              options: [
                {
                  text: 'Fixing these problems would require giving the national government more power than the states wanted to surrender',
                  correct: true,
                  feedback:
                    'Correct inference! If weakness came from states keeping power, the fix means states giving some up — which is exactly the difficult bargain struck at the Constitutional Convention.',
                },
                {
                  text: 'The states were eager to hand over their power to a stronger national government',
                  correct: false,
                  feedback:
                    'The passage suggests the opposite — states kept power because they WANTED it. Surrendering it would be a hard sell, which history confirms.',
                },
                {
                  text: 'The Articles succeeded at everything except collecting taxes',
                  correct: false,
                  feedback:
                    'The passage lists several failures beyond taxes: enforcing laws, defending borders, honoring trade agreements. "Everything except taxes" understates it.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief: What You Learned',
        content:
          'America\'s first plan of government — and why it failed. Lock these in:\n\n' +
          '• The Articles (1781): a deliberate league of sovereign states — fear of kings built a weak center.\n' +
          '• Could NOT: tax, enforce laws, or regulate trade. Had NO president and NO national courts. Amendments needed ALL 13 states.\n' +
          '• Real wins anyway: won the war, Treaty of Paris (1783), Northwest Ordinance (1787).\n' +
          '• Shays\' Rebellion (1786): debt-crushed farmers close courts; the national government can\'t respond — the wake-up call.\n' +
          '• Result: the Constitutional Convention (1787).\n\n' +
          'Trap detector: any answer mentioning an Articles-era president or national court is automatically wrong — neither existed.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SS.7.CG.1.6 — Creating the Constitution
  // ═══════════════════════════════════════════════════════════════════════════
  {
    benchmarkCode: 'SS.7.CG.1.6',
    title: 'Building a Stronger Plan: The Constitution',
    studentFriendlyTarget:
      'I can explain how the Constitution fixed the Articles\' weaknesses and describe the key compromises of the Constitutional Convention.',
    body:
      'In May 1787, fifty-five delegates gathered in Philadelphia — officially just to "revise" the Articles of Confederation. Behind locked doors and sealed windows (secrecy let them speak freely), they made a bolder choice: throw out the Articles and design a new government from scratch.\n\n' +
      'For four sweltering months they argued, bargained, and compromised. Big states versus small states. North versus South. Fans of a strong national government versus defenders of state power. The document they produced — the U.S. Constitution — directly repaired every major weakness of the Articles. In this final Unit 1 mission, you\'ll see how each fix answers a failure, and why the fight to RATIFY the Constitution gave us the Bill of Rights.',
    steps: [
      {
        stepType: 'NOTE',
        title: 'The Big Picture: Fix It or Lose It',
        content:
          'After Shays\' Rebellion, most leaders agreed the national government needed more power. The hard question was: how much more — and how do you give a government real power without recreating the tyranny of a king?\n\n' +
          'The Convention\'s answer was a national government strong enough to tax, enforce laws, and keep order, but CAGED by design: power split among three branches (thank Montesquieu), each able to check the others, with all power ultimately flowing from the people (popular sovereignty — "We the People").\n\n' +
          'Every mission you\'ve completed feeds into this room in Philadelphia. Enlightenment ideas → the theory. Colonial assemblies → the experience. The taxation fight → the fear of unchecked power. The Declaration → the principles. The Articles → the failed first draft. The Constitution is where all of Unit 1\'s threads tie together.\n\n' +
          'As you train, keep asking one question about every feature of the Constitution: "Which failure of the Articles is THIS fixing?" If you can answer that, you\'ve mastered this benchmark.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Big Picture',
        content: check({
          question: 'What was the Constitutional Convention\'s central design challenge?',
          options: [
            {
              text: 'Making the government strong enough to work but limited enough to prevent tyranny',
              correct: true,
              feedback:
                'That\'s the balancing act — enough power to tax and enforce laws, but caged by branches, checks, and popular sovereignty.',
            },
            {
              text: 'Choosing which state would rule over the others',
              correct: false,
              feedback:
                'No state got to rule — the fights were about representation and power-sharing, solved by compromise.',
            },
            {
              text: 'Deciding whether to invite the king back',
              correct: false,
              feedback:
                'Nobody wanted a king — the fear of accidentally recreating one is exactly why the new power came with limits.',
            },
            {
              text: 'Writing the longest constitution possible',
              correct: false,
              feedback:
                'The Constitution is famously SHORT — the challenge was balance, not length.',
            },
          ],
        }),
      },
      {
        stepType: 'VOCABULARY',
        title: 'Words of the Convention',
        content:
          'convention — A formal meeting of delegates for a specific purpose. "The Constitutional Convention met in Philadelphia from May to September 1787."\n\n' +
          'compromise — An agreement where each side gives up part of what it wants. "The Great Compromise gave big states the House and small states the Senate."\n\n' +
          'bicameral — Having two houses or chambers in a legislature. "Congress is bicameral: the House of Representatives and the Senate."\n\n' +
          'ratification — Formal approval to make a document take effect. "The Constitution needed ratification by nine of the thirteen states."\n\n' +
          'Federalists — Supporters of ratifying the Constitution and its stronger national government. "The Federalists argued the Articles had already proven too weak."\n\n' +
          'Anti-Federalists — Opponents who feared the new national government would threaten liberty. "The Anti-Federalists demanded a bill of rights as the price of ratification."',
      },
      {
        stepType: 'NOTE',
        title: 'The Convention\'s Great Debates and Compromises',
        content:
          'REPRESENTATION — THE BIG FIGHT. How many votes should each state get in Congress?\n\n' +
          'The VIRGINIA PLAN (big states\' favorite): representation based on population. More people, more votes. The NEW JERSEY PLAN (small states\' answer): every state equal, one vote each — like the Articles.\n\n' +
          'The GREAT COMPROMISE (also called the Connecticut Compromise) split the difference with a bicameral Congress: a HOUSE OF REPRESENTATIVES where seats depend on population (big states happy), and a SENATE where every state gets exactly two seats (small states happy). Both chambers must agree to pass any law. This is why Congress looks the way it does today.\n\n' +
          'THE THREE-FIFTHS COMPROMISE — A BARGAIN OVER SLAVERY. Southern states wanted enslaved people counted in population totals (more House seats for the South); northern states objected, since enslaved people were denied every right of citizenship. The deal: count three-fifths of the enslaved population for representation and taxation. Understand this plainly — it treated human beings as fractions for political math, gave slaveholding states extra power in Congress, and left slavery itself untouched. The contradiction between "all men are created equal" and this compromise haunted the nation until the Civil War, and the Thirteenth and Fourteenth Amendments erased it from the Constitution.\n\n' +
          'Test tip: if the question is about BIG vs. SMALL states → Great Compromise. If it\'s about counting the ENSLAVED population → Three-Fifths Compromise. Students mix these up constantly; don\'t be one of them.',
      },
      {
        stepType: 'WORKED_EXAMPLE',
        title: 'How to Nail a Compromise Question',
        content: worked({
          problem:
            'A test item asks: "At the Constitutional Convention, delegates from small states feared being dominated by large states. How did the Great Compromise address this fear?"\n\nA. It counted three-fifths of the enslaved population toward representation\nB. It created a Senate in which every state has equal representation\nC. It gave small states the power to veto federal laws\nD. It required a unanimous vote of the states to amend the Constitution',
          thinkAloud: [
            'First, identify the fear in the question: small states worried population-based voting would let big states run everything.',
            'Option A is the Three-Fifths Compromise — that\'s about counting enslaved people, a North–South issue, not big-vs-small states. Classic mix-up bait. Out.',
            'Option C: no state received a veto over federal laws under the Constitution — that sounds more like the Articles\' spirit. Out.',
            'Option D: unanimity for amendments is an Articles of Confederation rule — the Constitution actually made amending EASIER (three-fourths of states). Out.',
            'Option B: the Senate gives every state two senators regardless of size — Delaware equals Virginia there. That\'s precisely the protection small states demanded.',
          ],
          answer: 'B. It created a Senate in which every state has equal representation',
          whyItWorks:
            'Compromise questions hide the answer in WHO was worried about WHAT. Match the worried group (small states) to the feature built for them (equal Senate). And watch for options imported from the WRONG document — unanimity rules belong to the Articles, not the Constitution.',
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Convention Compromises',
        content: check({
          question: 'Which issue did the Three-Fifths Compromise settle?',
          options: [
            {
              text: 'How enslaved people would be counted for representation and taxation',
              correct: true,
              feedback:
                'Correct! Southern states got three-fifths of their enslaved population counted toward House seats — a bargain that increased slaveholding states\' power and treated people as political arithmetic. Keep it distinct from the Great Compromise (big vs. small states).',
            },
            {
              text: 'How many senators each state would send to Congress',
              correct: false,
              feedback:
                'Senate representation was settled by the GREAT Compromise (two per state). The Three-Fifths Compromise was about counting the enslaved population.',
            },
            {
              text: 'Whether the national government could collect taxes',
              correct: false,
              feedback:
                'The Constitution did grant Congress tax power, but that was a direct fix to the Articles — not what the Three-Fifths Compromise addressed.',
            },
            {
              text: 'Which state would host the new national capital',
              correct: false,
              feedback:
                'The capital\'s location was settled later (and by a different deal entirely). The Three-Fifths Compromise concerned representation and the enslaved population.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Every Fix Answers a Failure — and the Ratification Fight',
        content:
          'Line up the Articles\' weaknesses with the Constitution\'s repairs:\n\n' +
          'Couldn\'t tax → Congress gains the power to levy and collect taxes.\n' +
          'Couldn\'t enforce laws → an EXECUTIVE branch (the President) carries out the law.\n' +
          'No national courts → a JUDICIAL branch (Supreme Court and federal courts) settles disputes.\n' +
          'Couldn\'t regulate trade → Congress controls interstate and foreign commerce.\n' +
          'Unanimity to amend → amendments now need 2/3 of Congress to propose and 3/4 of states to approve — hard, but possible.\n' +
          'A league of states → a national government acting directly on the people, with the Constitution as supreme law.\n\n' +
          'But writing the Constitution was only half the battle — it needed RATIFICATION by nine states, and the country split hard.\n\n' +
          'FEDERALISTS (Madison, Hamilton, Jay) argued the Articles had already proven that a weak center fails; the new system\'s checks and balances would protect liberty. They made their case in 85 newspaper essays — the Federalist Papers.\n\n' +
          'ANTI-FEDERALISTS (Patrick Henry, George Mason) saw the ghost of the king in the new national power. Their sharpest argument: WHERE IS THE LIST OF RIGHTS? The Constitution protected structure, not speech, press, or jury trials.\n\n' +
          'The argument ended in a deal that completes Unit 1\'s story: several key states ratified only on the promise that a BILL OF RIGHTS would be added immediately. In 1791, the first ten amendments were ratified — the Anti-Federalists\' lasting gift to every American. Compromise didn\'t stop when the Convention ended; it\'s baked into the whole system.',
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: Fixing the Weaknesses',
        content: check({
          question: 'The Articles of Confederation had no way to carry out or enforce national laws. How did the Constitution fix this weakness?',
          options: [
            {
              text: 'It created an executive branch, headed by the President, to enforce the laws',
              correct: true,
              feedback:
                'Correct! Every fix answers a failure: no enforcement under the Articles → an executive branch whose entire job is to "take Care that the Laws be faithfully executed."',
            },
            {
              text: 'It required all states to approve laws unanimously before they took effect',
              correct: false,
              feedback:
                'Backwards — unanimity was an ARTICLES problem (for amendments), and requiring it for laws would make government weaker, not stronger.',
            },
            {
              text: 'It gave each state its own army to enforce federal laws',
              correct: false,
              feedback:
                'The Constitution did the opposite: it strengthened NATIONAL enforcement rather than depending on the states, whose unreliability was the whole problem.',
            },
            {
              text: 'It abolished state governments so only national laws existed',
              correct: false,
              feedback:
                'States remained powerful and essential — the Constitution created FEDERALISM, sharing power between nation and states, not a takeover.',
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'See It: From Weak League to "We the People"',
        content: timeline({
          kind: 'timeline',
          intro: 'Four years from a locked room in Philadelphia to a Bill of Rights.',
          connector: 'line',
          events: [
            { marker: 'May 1787', label: 'Convention opens', detail: '55 delegates, doors locked, windows sealed for candor.' },
            { marker: 'Jun 1787', label: 'The plans clash', detail: 'Virginia Plan (by population) vs. New Jersey Plan (equal states).' },
            { marker: 'Jul 1787', label: 'Great Compromise', detail: 'House by population + Senate with two per state.' },
            { marker: 'Sep 1787', label: 'Constitution signed', detail: 'The new plan goes out to the states.' },
            { marker: '1787–88', label: 'Ratification fight', detail: 'Federalists vs. Anti-Federalists argue in every state.' },
            { marker: '1791', label: 'Bill of Rights', detail: 'The promised first ten amendments are ratified.' },
          ],
        }),
      },
      {
        stepType: 'INTERACTIVE_CHECK',
        title: 'Quick Check: The Price of Ratification',
        content: check({
          question: 'Why did the Anti-Federalists finally get a Bill of Rights added to the Constitution?',
          options: [
            {
              text: 'Key states would only ratify with the promise that one would be added',
              correct: true,
              feedback:
                'Ratification was the leverage — several states effectively said "no rights list, no Constitution." The first ten amendments arrived in 1791.',
            },
            {
              text: 'The Supreme Court ordered Congress to write one',
              correct: false,
              feedback:
                'The Supreme Court barely existed yet — the pressure came from the ratification debate, not a court ruling.',
            },
            {
              text: 'George Washington refused to be president without one',
              correct: false,
              feedback:
                'Washington supported ratification as written — the demand came from Anti-Federalists in the state conventions.',
            },
            {
              text: 'Britain required it in the peace treaty',
              correct: false,
              feedback:
                'Britain had nothing to do with it — this was an all-American argument about protecting liberty from the new government.',
            },
          ],
        }),
      },
      {
        stepType: 'SOURCE_ANALYSIS',
        title: 'Source Quest: We the People',
        content: source({
          sourceTitle: 'The Preamble to the U.S. Constitution',
          sourceAttribution: 'Adapted from the U.S. Constitution, Preamble, 1787',
          passage:
            'The Preamble is the introduction to the U.S. Constitution. It lists the six goals of the government:\n1. Form a more perfect union\n2. Establish justice\n3. Ensure peace at home\n4. Provide for the nation\'s defense\n5. Promote the general welfare\n6. Secure liberty for future generations\n\nThe phrase "We the People" shows that power comes from the citizens — a key idea of popular sovereignty.',
          guidingQuestions: [
            {
              question: 'Why is the phrase "We the People" significant, according to the passage?',
              options: [
                {
                  text: 'It shows the government\'s power comes from the citizens — popular sovereignty',
                  correct: true,
                  feedback:
                    'Correct! Compare it to the Articles, a compact between STATES. The Constitution opens in the voice of the PEOPLE themselves — the Enlightenment idea of popular sovereignty, carved into the first three words.',
                },
                {
                  text: 'It means only the states, acting together, created the government',
                  correct: false,
                  feedback:
                    'That describes the ARTICLES of Confederation. The Constitution deliberately begins with the people, not the states — that\'s the whole point of the phrase.',
                },
                {
                  text: 'It grants every citizen the right to vote in federal elections',
                  correct: false,
                  feedback:
                    'The Preamble states goals and the source of power — it grants no specific rights. Voting rights developed through later amendments.',
                },
              ],
            },
            {
              question: 'A city builds a new fire station using government funds. Which Preamble goal does this action BEST reflect?',
              options: [
                {
                  text: 'Promote the general welfare',
                  correct: true,
                  feedback:
                    'Correct! Public services that benefit the whole community — fire protection, roads, schools — are the "general welfare" in action. Applying the Preamble\'s goals to real examples is exactly how the EOC tests it.',
                },
                {
                  text: 'Provide for the nation\'s defense',
                  correct: false,
                  feedback:
                    'Defense refers to protecting the country from external threats — armies and national security, not local fire stations.',
                },
                {
                  text: 'Form a more perfect union',
                  correct: false,
                  feedback:
                    '"A more perfect union" is about binding the states into one working nation — closer to interstate cooperation than to a city service.',
                },
              ],
            },
          ],
        }),
      },
      {
        stepType: 'NOTE',
        title: 'Mission Debrief: What You Learned',
        content:
          'You\'ve reached the end of Unit 1\'s story — from ideas to a working government. Lock these in:\n\n' +
          '• Every fix answers a failure: no taxes → Congress taxes; no enforcement → a President; no courts → federal judiciary; unanimous amendments → 2/3 of Congress + 3/4 of states.\n' +
          '• Great Compromise = big vs. small states → House by population + equal Senate.\n' +
          '• Three-Fifths Compromise = North vs. South → counted 3/5 of the enslaved population for representation; a bargain over human beings that haunted the nation until the Civil War.\n' +
          '• Federalists (Madison, Hamilton) vs. Anti-Federalists (Henry, Mason) → ratification passed on the PROMISE of a Bill of Rights (1791).\n' +
          '• "We the People": power flows from the people — popular sovereignty in three words.\n\n' +
          'That completes Unit 1: Enlightenment ideas → colonial practice → revolution → a failed first draft → the Constitution. On to the Readiness Check!',
      },
    ],
  },
]
