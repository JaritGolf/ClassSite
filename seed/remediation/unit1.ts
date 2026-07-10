/**
 * Unit 1 authored remediation content (ADR 0013, spec §14).
 *
 * One def per (benchmark, skill_tag) pair used by the Unit 1 question banks —
 * each benchmark's 30 questions share a single skill tag, so six defs give
 * Unit 1 full authored coverage. Tone per §14.1: short, focused, encouraging,
 * examples + non-examples with immediate feedback.
 */

import type { RemediationContentDef } from './_content'

export const UNIT1_REMEDIATION: RemediationContentDef[] = [
  {
    benchmarkCode: 'SS.7.CG.1.1',
    skillTag: 'enlightenment-influence',
    title: 'Rebuild It: Enlightenment Ideas',
    remediationType: 'MINI_LESSON_REPLAY',
    content: {
      concept:
        'Let\'s rebuild the big idea. Enlightenment thinkers argued that government power comes from THE PEOPLE, not from God or a crown. The key ideas travel together but are not the same thing:\n\n• NATURAL RIGHTS (Locke) — rights you are BORN with (life, liberty, property). No government gives them, so no government may take them.\n• SOCIAL CONTRACT (Locke, Rousseau) — the deal: people accept government authority IN EXCHANGE for protection of their rights. Break the deal, lose the authority.\n• SEPARATION OF POWERS (Montesquieu) — split government into branches so no one holds all the power.\n• POPULAR SOVEREIGNTY — the people are the ultimate source of government power.\n\nQuick trick for thinker questions: rights & contract → Locke. Branches → Montesquieu. "Will of the people" → Rousseau.',
      examples: [
        {
          text: '"People are born with rights to life, liberty, and property that no king can cancel."',
          isExample: true,
          explanation:
            'This is natural rights, stated correctly — the rights come from being born a person, and government cannot remove them. Pure Locke.',
        },
        {
          text: '"Citizens obey the laws, and in return the government protects their rights. If it stops protecting them, the people can replace it."',
          isExample: true,
          explanation:
            'This is the social contract, both halves: the exchange (obedience for protection) AND the consequence of breaking it (the people may replace the government).',
        },
        {
          text: '"Natural rights are the rights the government gives its citizens, like the right to a driver\'s license."',
          isExample: false,
          explanation:
            'Backwards! If a government GIVES a right, it could also take it away. Natural rights exist BEFORE government — that\'s exactly what makes them natural. (A driver\'s license is a privilege granted by law.)',
        },
        {
          text: '"John Locke\'s most famous idea was separating government into three branches."',
          isExample: false,
          explanation:
            'Thinker mix-up — the most common error on this benchmark. Separation of powers belongs to MONTESQUIEU. Locke\'s signature ideas are natural rights and the social contract.',
        },
      ],
      tryIt: {
        question: 'A country\'s constitution begins: "All authority in this nation flows from its citizens." Which Enlightenment idea is this?',
        options: [
          {
            text: 'Popular sovereignty',
            correct: true,
            feedback: 'Exactly right! Power flowing FROM the people is popular sovereignty. You\'ve got this.',
          },
          {
            text: 'Separation of powers',
            correct: false,
            feedback: 'Not this time — separation of powers is about DIVIDING government into branches. The quote is about where power COMES FROM: the citizens.',
          },
          {
            text: 'Rule of law',
            correct: false,
            feedback: 'Rule of law means everyone (even leaders) must obey the law. The quote is about the SOURCE of authority — the people.',
          },
          {
            text: 'Divine right of kings',
            correct: false,
            feedback: 'Divine right is the OLD idea the Enlightenment replaced — power from God to a king. This quote says power comes from citizens instead.',
          },
        ],
      },
    },
  },
  {
    benchmarkCode: 'SS.7.CG.1.2',
    skillTag: 'colonial-self-governance',
    title: 'Rebuild It: Colonial Self-Government',
    remediationType: 'MINI_LESSON_REPLAY',
    content: {
      concept:
        'Self-government means the people who live under the laws help MAKE the laws. The colonists practiced it for 150+ years before independence:\n\n• HOUSE OF BURGESSES (Virginia, 1619) — the first ELECTED assembly in the colonies. Colonists chose representatives to make local laws.\n• MAYFLOWER COMPACT (1620) — colonists signed an agreement to govern THEMSELVES by "just and equal laws." Self-government by written consent.\n• TOWN MEETINGS (New England) — citizens voted DIRECTLY on local issues. No representatives needed.\n• SALUTARY NEGLECT — Britain\'s loose enforcement let these habits grow strong.\n\nThe test: WHO is deciding? If colonists (directly or through people they elected) → self-government. If a king, royal governor, or Parliament → NOT self-government.',
      examples: [
        {
          text: 'Virginia colonists elect burgesses who vote on a local tobacco tax.',
          isExample: true,
          explanation:
            'Self-government through REPRESENTATIVES: the colonists chose the lawmakers, so the colonists (indirectly) made the law.',
        },
        {
          text: 'A Massachusetts town holds a meeting where every attending citizen votes on building a new road.',
          isExample: true,
          explanation:
            'Self-government in its most DIRECT form — citizens deciding the issue themselves, no representatives in between.',
        },
        {
          text: 'The king appoints a royal governor who vetoes a law the colonial assembly passed.',
          isExample: false,
          explanation:
            'This is OUTSIDE control, not self-government. The governor answers to the king, not to the colonists — nobody in the colony chose him.',
        },
        {
          text: 'Parliament, meeting in London, passes a trade law for all the colonies.',
          isExample: false,
          explanation:
            'The colonists elected NO ONE in Parliament, so this law was made entirely without them. That\'s the opposite of self-government — and exactly what they\'d later protest.',
        },
      ],
      tryIt: {
        question: 'Which colonial institution was the FIRST example of representative self-government in America?',
        options: [
          {
            text: 'The Virginia House of Burgesses',
            correct: true,
            feedback: 'Correct! 1619, Jamestown — the first elected lawmaking assembly in the colonies. Nailed it.',
          },
          {
            text: 'The British Parliament',
            correct: false,
            feedback: 'Parliament was representative — but it represented Britain, and it sat in London. The first elected assembly IN the colonies was the House of Burgesses (1619).',
          },
          {
            text: 'The royal governor\'s council',
            correct: false,
            feedback: 'Governors and their councils were APPOINTED by the king, not elected by colonists. Look for the institution colonists voted for.',
          },
          {
            text: 'The Continental Congress',
            correct: false,
            feedback: 'The Continental Congress came in 1774 — more than 150 years AFTER the first elected colonial assembly. Think earlier: Virginia, 1619.',
          },
        ],
      },
    },
  },
  {
    benchmarkCode: 'SS.7.CG.1.3',
    skillTag: 'british-policies',
    title: 'Rebuild It: Taxes, Consent, and Colonial Resistance',
    remediationType: 'MISCONCEPTION_FIX',
    content: {
      concept:
        'The #1 misconception on this benchmark: "The colonists rebelled because taxes were too HIGH." Not quite! The taxes were actually small. The real objection was about CONSENT: the colonists elected nobody in Parliament, so Parliament taxing them violated their rights as Englishmen — "no taxation without representation."\n\nThe chain of events:\n1. French and Indian War (1754–1763) leaves Britain in debt.\n2. Britain taxes the colonies to help pay (Stamp Act 1765, Townshend Acts 1767).\n3. Colonists resist — with ORGANIZED, mostly peaceful tools: petitions (formal requests), boycotts (refusing to buy British goods), the Sons of Liberty (protest groups), and committees of correspondence (letters uniting the colonies).\n\nRemember: the resistance worked through pressure — boycotts hurt British merchants, who pushed Parliament to repeal the Stamp Act.',
      examples: [
        {
          text: '"The colonists objected to the Stamp Act because they had no representatives in the Parliament that passed it."',
          isExample: true,
          explanation:
            'This is the real complaint, stated correctly — it\'s about representation and consent, not the price of stamps.',
        },
        {
          text: '"Colonial merchants agreed to stop importing British goods until the taxes were repealed."',
          isExample: true,
          explanation:
            'A boycott — organized, economic, and effective. This is exactly the kind of resistance that pressured Parliament to back down.',
        },
        {
          text: '"The colonists rebelled mainly because the Stamp Act tax rates were too expensive for most families to pay."',
          isExample: false,
          explanation:
            'This is THE misconception. The tax was small. The colonists\' own words targeted representation: "no taxation WITHOUT REPRESENTATION" — not "no taxation that costs too much."',
        },
        {
          text: '"The colonies resisted by having their representatives in Parliament vote against the taxes."',
          isExample: false,
          explanation:
            'Impossible — the colonists HAD no representatives in Parliament. That absence was the entire problem, and why they resisted from outside: petitions, boycotts, and protest.',
        },
      ],
      tryIt: {
        question: 'How did the committees of correspondence help the colonial resistance?',
        options: [
          {
            text: 'They spread news between the colonies, helping them act together',
            correct: true,
            feedback: 'Correct! Thirteen separate colonies became one connected movement through those letters. Well done.',
          },
          {
            text: 'They wrote new tax laws to replace Parliament\'s taxes',
            correct: false,
            feedback: 'The committees had no lawmaking power — their weapon was INFORMATION, moving news of British actions from colony to colony.',
          },
          {
            text: 'They collected money to pay the British taxes on time',
            correct: false,
            feedback: 'Quite the opposite — they helped organize RESISTANCE to the taxes, not payment of them.',
          },
          {
            text: 'They negotiated directly with the king for lower tax rates',
            correct: false,
            feedback: 'Petitions went to the king, but that wasn\'t the committees\' job — and the goal was never "lower rates." It was taxation only WITH representation.',
          },
        ],
      },
    },
  },
  {
    benchmarkCode: 'SS.7.CG.1.4',
    skillTag: 'declaration-principles',
    title: 'Rebuild It: Principle or Grievance?',
    remediationType: 'MINI_LESSON_REPLAY',
    content: {
      concept:
        'The Declaration of Independence makes one argument in three parts:\n\n1. PRINCIPLES — universal truths about ALL people and ALL governments: all men are created equal; people have unalienable rights (life, liberty, pursuit of happiness); government exists to SECURE those rights; its power comes from the CONSENT of the governed; a destructive government may be altered or abolished.\n2. GRIEVANCES — specific complaints against King George III ("He has dissolved Representative Houses...", "He has imposed Taxes on us without our Consent...").\n3. THE DECLARATION — therefore, the colonies are free and independent states.\n\nThe skill you\'re rebuilding: telling parts 1 and 2 apart. Use the "He has..." test — if a statement accuses ONE ruler of ONE action, it\'s a grievance. If it\'s true of any government anywhere, anytime, it\'s a principle.',
      examples: [
        {
          text: '"Governments derive their just powers from the consent of the governed."',
          isExample: true,
          explanation:
            'A PRINCIPLE — it describes all governments, everywhere, forever. No king is named, no specific act accused.',
        },
        {
          text: '"All men are created equal and endowed with certain unalienable rights."',
          isExample: true,
          explanation:
            'A PRINCIPLE — a universal claim about all people. This is the Declaration\'s most famous line, and it names no specific ruler or event.',
        },
        {
          text: '"He has cut off our Trade with all parts of the world."',
          isExample: false,
          explanation:
            'A GRIEVANCE, not a principle — "He has..." accuses King George III of a specific act. It\'s EVIDENCE for the argument, not a universal truth.',
        },
        {
          text: '"He has kept among us, in times of peace, Standing Armies without the Consent of our legislatures."',
          isExample: false,
          explanation:
            'Also a GRIEVANCE — specific ruler, specific action. Notice it LEANS on the consent principle, but as written it\'s a complaint about one king\'s behavior.',
        },
      ],
      tryIt: {
        question: 'According to the Declaration, when may the people alter or abolish their government?',
        options: [
          {
            text: 'When the government becomes destructive of the people\'s rights',
            correct: true,
            feedback: 'Correct! Government exists to secure rights — destroying them breaks the deal and justifies change. That\'s Locke\'s social contract in action.',
          },
          {
            text: 'Whenever a majority is unhappy with a single law',
            correct: false,
            feedback: 'The bar is much higher — a government DESTRUCTIVE of rights, not an unpopular law. Ordinary disagreement is what elections are for.',
          },
          {
            text: 'Only when the king grants permission',
            correct: false,
            feedback: 'That would defeat the whole point! The right to alter or abolish belongs to THE PEOPLE — no ruler\'s permission required.',
          },
          {
            text: 'Never — governments are permanent once established',
            correct: false,
            feedback: 'The Declaration says the opposite: government is a tool of the people, and the people may replace a government that destroys their rights.',
          },
        ],
      },
    },
  },
  {
    benchmarkCode: 'SS.7.CG.1.5',
    skillTag: 'articles-weaknesses',
    title: 'Rebuild It: Why the Articles Failed',
    remediationType: 'MINI_LESSON_REPLAY',
    content: {
      concept:
        'The Articles of Confederation (1781) made the national government weak ON PURPOSE — Americans had just escaped a powerful king. But weak had costs. The core weaknesses:\n\n• NO power to tax (could only ask states for money — they said no)\n• NO power to enforce laws (laws were basically suggestions)\n• NO executive branch (no president to carry out laws)\n• NO national courts (no referee between states)\n• Amendments needed ALL 13 states (one state could block any fix)\n\nEvery weakness traces to one root: the STATES kept the power. And SHAYS\' REBELLION (1786) proved the cost — when armed farmers shut down Massachusetts courts, the national government couldn\'t raise a single soldier to respond. That scare led straight to the Constitutional Convention.\n\nWatch for trap answers that mention a president, national courts, or a king under the Articles — none of those existed!',
      examples: [
        {
          text: '"Congress asked the states for money to pay war debts, but most states refused, and Congress could do nothing about it."',
          isExample: true,
          explanation:
            'A true picture of the Articles — no tax power meant ASKING, and no enforcement power meant accepting "no" for an answer.',
        },
        {
          text: '"Shays\' Rebellion showed that the national government could not maintain order, because it had no money and no army to respond."',
          isExample: true,
          explanation:
            'Exactly the lesson leaders drew in 1786–87 — the rebellion turned the Articles\' weaknesses from theory into a national emergency.',
        },
        {
          text: '"Under the Articles, the president vetoed several laws that the states wanted."',
          isExample: false,
          explanation:
            'Trap! There WAS no president under the Articles — no executive branch existed at all. Any answer with an Articles-era president is automatically wrong.',
        },
        {
          text: '"The Articles failed because the national government taxed the states too heavily."',
          isExample: false,
          explanation:
            'Backwards — the national government couldn\'t tax AT ALL. Its problem was too little power, never too much.',
        },
      ],
      tryIt: {
        question: 'Why was it so hard to fix the Articles of Confederation\'s problems?',
        options: [
          {
            text: 'Changing the Articles required the agreement of all thirteen states',
            correct: true,
            feedback: 'Correct! Unanimity meant one state could block any repair — so leaders eventually wrote a new Constitution instead. Great recovery.',
          },
          {
            text: 'The Supreme Court kept striking down proposed amendments',
            correct: false,
            feedback: 'Trap answer — there were NO national courts under the Articles, so no court could strike down anything.',
          },
          {
            text: 'The president refused to sign any amendments',
            correct: false,
            feedback: 'Another trap — no president existed under the Articles. Remember: no executive, no courts, no tax power.',
          },
          {
            text: 'Britain had to approve all changes to American government',
            correct: false,
            feedback: 'After independence, Britain had no say in American government. The obstacle was internal: the all-thirteen-states rule.',
          },
        ],
      },
    },
  },
  {
    benchmarkCode: 'SS.7.CG.1.6',
    skillTag: 'constitutional-convention',
    title: 'Rebuild It: Convention Fixes and Compromises',
    remediationType: 'MISCONCEPTION_FIX',
    content: {
      concept:
        'Two things students mix up most on this benchmark — let\'s untangle them:\n\nTHE TWO COMPROMISES ARE DIFFERENT DEALS.\n• GREAT COMPROMISE = big states vs. SMALL states → bicameral Congress: House by population + Senate with two per state.\n• THREE-FIFTHS COMPROMISE = North vs. SOUTH → counted three-fifths of the enslaved population for representation and taxation.\nAsk: is the fight about state SIZE (→ Great) or about counting the ENSLAVED population (→ Three-Fifths)?\n\nEVERY CONSTITUTIONAL FIX ANSWERS AN ARTICLES FAILURE.\n• Couldn\'t tax → Congress can tax.\n• Couldn\'t enforce → President (executive) enforces.\n• No courts → federal courts.\n• Unanimous amendments → 2/3 Congress + 3/4 states.\n\nAnd the ratification fight: FEDERALISTS said the new government was needed and safe; ANTI-FEDERALISTS feared it and demanded a BILL OF RIGHTS — which was added in 1791 as the price of ratification.',
      examples: [
        {
          text: '"The Great Compromise created a House based on population and a Senate with equal representation for every state."',
          isExample: true,
          explanation:
            'Correctly matched — the big-state/small-state fight ended with each side winning one chamber of Congress.',
        },
        {
          text: '"The Constitution fixed the Articles\' enforcement problem by creating an executive branch to carry out the laws."',
          isExample: true,
          explanation:
            'A perfect fix-answers-failure pairing: no enforcement under the Articles → a President whose job is executing the law.',
        },
        {
          text: '"The Great Compromise settled how enslaved people would be counted for representation."',
          isExample: false,
          explanation:
            'Mix-up alert — that\'s the THREE-FIFTHS Compromise. The Great Compromise settled the big-state/small-state fight over Congress. This is the single most common error on this benchmark.',
        },
        {
          text: '"The Anti-Federalists supported the Constitution because it created a strong national government."',
          isExample: false,
          explanation:
            'Reversed — Anti-Federalists OPPOSED ratification precisely because they feared strong national power. The supporters were the FEDERALISTS.',
        },
      ],
      tryIt: {
        question: 'What finally helped convince several hesitant states to ratify the Constitution?',
        options: [
          {
            text: 'The promise that a Bill of Rights would be added',
            correct: true,
            feedback: 'Correct! The Anti-Federalists\' demand became the first ten amendments (1791) — the price of ratification, and their lasting gift. You\'ve got this benchmark back.',
          },
          {
            text: 'An agreement to keep the Articles of Confederation alongside the Constitution',
            correct: false,
            feedback: 'The Constitution fully REPLACED the Articles — running both would have recreated the confusion the Convention met to end.',
          },
          {
            text: 'George Washington\'s promise to serve as king',
            correct: false,
            feedback: 'Washington refused anything resembling a crown — and the Constitution creates a president, never a king.',
          },
          {
            text: 'A rule letting any state veto federal laws',
            correct: false,
            feedback: 'No such rule exists — state vetoes would have rebuilt the Articles\' weakness. The real deal-closer was the promised Bill of Rights.',
          },
        ],
      },
    },
  },
]
