/**
 * Test-Taking Strategy Track (spec §19.2).
 *
 * Seven EOC strategy missions, not tied to any benchmark. Each mission now
 * carries an interactive "apply-it" round: the student answers the mission's
 * check question(s), and one *correct* round counts as one **use** of the
 * strategy. Mission content is authored in-code (instructional scaffolding,
 * like lesson interactive checks — ADR 0013). Rounds are graded server-side
 * and the correct answers never leave the server before submission (rule #2).
 *
 * The server grades a round and forgets it. The count of uses is kept on the
 * student's own device (src/lib/local-progress).
 *
 * A teacher may set a target number of uses per strategy on a class
 * (Class.strategyUsesRequired, 0 = none). It is a soft nudge shown to every
 * student — nothing blocks mastery progression, and there are no per-student
 * overrides because there are no per-student records.
 */


// ── Content types ──────────────────────────────────────────────────────────

export interface StrategyCheckOption {
  id: string
  text: string
}

/** Authored apply-it question. `correctOptionId` is SERVER-ONLY. */
export interface StrategyCheck {
  prompt: string
  stimulus?: string
  options: StrategyCheckOption[]
  correctOptionId: string
  feedback: string
}

export interface StrategyMission {
  code: string
  title: string
  objective: string
  instructions: string
  tip: string
  checks: StrategyCheck[]
}

/** A check as served to the student — no answer key, options shuffled. */
export interface StrategyCheckServed {
  prompt: string
  stimulus?: string
  options: StrategyCheckOption[]
}

export interface StrategyMissionServed {
  code: string
  title: string
  objective: string
  instructions: string
  tip: string
  checks: StrategyCheckServed[]
}

const MISSIONS: StrategyMission[] = [
  {
    code: 'eliminate-distractor',
    title: 'Eliminate the Distractor',
    objective: 'Practice crossing out answers you know are wrong.',
    instructions: 'For each item, find the choice that is clearly wrong and eliminate it first.',
    tip: 'Getting rid of even one wrong answer raises your odds on every question.',
    checks: [
      {
        prompt:
          'A question asks which power belongs to the legislative branch. Which choice can you eliminate FIRST as clearly wrong?',
        options: [
          { id: 'a', text: 'Passing new laws' },
          { id: 'b', text: 'Deciding whether a law is constitutional' },
          { id: 'c', text: 'Setting the federal budget' },
          { id: 'd', text: 'Approving federal spending' },
        ],
        correctOptionId: 'b',
        feedback:
          'Deciding whether a law is constitutional is a job of the courts (judicial branch), so it is the fastest choice to cross out.',
      },
      {
        prompt:
          'The stem asks for a right protected by the First Amendment. Which option is safest to eliminate?',
        options: [
          { id: 'a', text: 'Freedom of speech' },
          { id: 'b', text: 'Freedom of religion' },
          { id: 'c', text: 'The right to a speedy trial' },
          { id: 'd', text: 'Freedom of the press' },
        ],
        correctOptionId: 'c',
        feedback:
          'A speedy trial is protected by the Sixth Amendment, not the First — eliminate it right away.',
      },
    ],
  },
  {
    code: 'evidence-based',
    title: 'Evidence-Based Answers',
    objective: 'Point to the part of the stimulus that supports your choice.',
    instructions: 'Before picking an answer, underline the sentence in the source that proves it.',
    tip: 'If you cannot find evidence, the answer is probably a distractor.',
    checks: [
      {
        stimulus:
          '"Congress shall make no law respecting an establishment of religion, or prohibiting the free exercise thereof."',
        prompt: 'Which claim does this sentence DIRECTLY support?',
        options: [
          { id: 'a', text: 'The government cannot set up an official national religion.' },
          { id: 'b', text: 'Citizens are required to attend religious services.' },
          { id: 'c', text: 'States may tax churches to raise revenue.' },
          { id: 'd', text: 'The president appoints religious leaders.' },
        ],
        correctOptionId: 'a',
        feedback:
          'The words "make no law respecting an establishment of religion" are your evidence: government can\'t establish an official religion.',
      },
      {
        stimulus:
          '"All bills for raising revenue shall originate in the House of Representatives."',
        prompt: 'Which statement is backed by this text?',
        options: [
          { id: 'a', text: 'Tax bills must start in the House of Representatives.' },
          { id: 'b', text: 'The Senate writes all tax laws.' },
          { id: 'c', text: 'The president raises taxes alone.' },
          { id: 'd', text: 'Only states can raise revenue.' },
        ],
        correctOptionId: 'a',
        feedback:
          '"Originate in the House of Representatives" is the evidence — revenue (tax) bills must start there.',
      },
    ],
  },
  {
    code: 'watch-the-words',
    title: 'Watch the Words',
    objective: 'Spot stem keywords like BEST, EXCEPT, and MOST LIKELY.',
    instructions: 'Circle the keyword in the question stem and let it guide your choice.',
    tip: '"EXCEPT" flips the question — you are looking for the one that does NOT fit.',
    checks: [
      {
        prompt:
          'Read the stem: "Which of the following is NOT a power of the federal government?" What is the keyword telling you to do?',
        options: [
          { id: 'a', text: 'Find the choice that is not a federal power.' },
          { id: 'b', text: 'Find the best federal power.' },
          { id: 'c', text: 'Pick any federal power.' },
          { id: 'd', text: 'Choose two powers.' },
        ],
        correctOptionId: 'a',
        feedback: 'NOT flips the question — you want the one choice that does NOT fit.',
      },
      {
        prompt:
          '"Which action is the BEST example of civic participation?" What does the word BEST signal?',
        options: [
          { id: 'a', text: 'More than one answer may be true — pick the strongest example.' },
          { id: 'b', text: 'Only one answer is even close to correct.' },
          { id: 'c', text: 'The first answer listed is always best.' },
          { id: 'd', text: 'You should pick the shortest answer.' },
        ],
        correctOptionId: 'a',
        feedback:
          'BEST warns you that several choices look right — compare them and pick the strongest.',
      },
    ],
  },
  {
    code: 'flag-and-return',
    title: 'Flag and Return',
    objective: 'Practice the discipline of flagging hard items and coming back.',
    instructions: 'If an item takes too long, flag it, move on, and return after the easy ones.',
    tip: 'Do not let one hard question eat the time you need for five easy ones.',
    checks: [
      {
        prompt:
          "You've spent two minutes on one hard question and 15 questions remain. What is the smartest move?",
        options: [
          { id: 'a', text: 'Flag it, answer the rest, then come back to it.' },
          { id: 'b', text: 'Keep working only on it until you solve it.' },
          { id: 'c', text: 'Guess and never return to it.' },
          { id: 'd', text: 'Skip the rest of the test.' },
        ],
        correctOptionId: 'a',
        feedback: 'Flag it and move on — protect the time you need for the questions you can answer.',
      },
      {
        prompt: 'When is flagging-and-returning the right call?',
        options: [
          { id: 'a', text: 'When an item is taking far longer than the others.' },
          { id: 'b', text: 'On the very first question, every time.' },
          { id: 'c', text: 'Only when you have finished the whole test.' },
          { id: 'd', text: 'Never — you must answer in order.' },
        ],
        correctOptionId: 'a',
        feedback: 'Flag the time-eaters; come back once the quick points are banked.',
      },
    ],
  },
  {
    code: 'time-management',
    title: 'Time Management',
    objective: 'Practice steady pacing — not rushing, not stalling.',
    instructions: 'Aim for a steady rhythm; check the clock at the halfway mark.',
    tip: 'Most missed questions come from rushing the end, not from thinking too long.',
    checks: [
      {
        prompt:
          'A test has 50 questions in 60 minutes. About where should you be at the 30-minute mark?',
        options: [
          { id: 'a', text: 'About halfway — roughly 25 questions.' },
          { id: 'b', text: 'Nearly finished.' },
          { id: 'c', text: 'Just getting started.' },
          { id: 'd', text: 'Completely done.' },
        ],
        correctOptionId: 'a',
        feedback: 'Halfway through the time should mean about halfway through the questions.',
      },
      {
        prompt: 'Where are most points usually lost on a timed test?',
        options: [
          { id: 'a', text: 'Rushing the final questions after stalling early.' },
          { id: 'b', text: 'Thinking too carefully on easy questions.' },
          { id: 'c', text: 'Finishing with time to spare.' },
          { id: 'd', text: 'Reading the directions.' },
        ],
        correctOptionId: 'a',
        feedback: 'Steady pacing beats a slow start and a panicked finish.',
      },
    ],
  },
  {
    code: 'two-pass',
    title: 'Two-Pass Strategy',
    objective: 'Do the easy items first, then the harder ones.',
    instructions: 'First pass: answer everything you know quickly. Second pass: tackle the rest.',
    tip: 'Banking the easy points first protects your score if time runs short.',
    checks: [
      {
        prompt: 'What do you do on your FIRST pass through the test?',
        options: [
          { id: 'a', text: 'Answer every question you know quickly.' },
          { id: 'b', text: 'Solve only the hardest items first.' },
          { id: 'c', text: 'Answer questions in random order.' },
          { id: 'd', text: 'Skip everything that looks easy.' },
        ],
        correctOptionId: 'a',
        feedback: 'First pass = grab all the quick, sure points.',
      },
      {
        prompt: 'Why bank the easy points first?',
        options: [
          { id: 'a', text: 'It protects your score if you run out of time.' },
          { id: 'b', text: 'It uses up the clock faster.' },
          { id: 'c', text: 'Hard questions are worth fewer points.' },
          { id: 'd', text: 'The easy ones come last on the EOC.' },
        ],
        correctOptionId: 'a',
        feedback: 'If time runs short, you have already secured the points you were sure of.',
      },
    ],
  },
  {
    code: 'misconception-spotter',
    title: 'Misconception Spotter',
    objective: 'Identify why a wrong answer is tempting.',
    instructions: 'Given a wrong choice, explain the misconception that makes it look right.',
    tip: 'Naming the trap makes you less likely to fall for it on the real EOC.',
    checks: [
      {
        prompt:
          'A student picks "The Bill of Rights created the three branches of government." Why is this wrong answer tempting?',
        options: [
          { id: 'a', text: 'The Bill of Rights is famous, so people assume it did everything important.' },
          { id: 'b', text: 'It is actually the correct answer.' },
          { id: 'c', text: 'Because the three branches do not exist.' },
          { id: 'd', text: 'There is no reason anyone would pick it.' },
        ],
        correctOptionId: 'a',
        feedback:
          'The three branches come from the main Constitution (Articles I–III). The Bill of Rights added protections — it did not create the branches.',
      },
      {
        prompt:
          'Why might someone WRONGLY choose "The Declaration of Independence is our supreme law"?',
        options: [
          { id: 'a', text: "It's a famous founding document, so it's easy to confuse with the Constitution." },
          { id: 'b', text: 'The Declaration really is the supreme law.' },
          { id: 'c', text: 'Because it was written most recently.' },
          { id: 'd', text: 'Because courts cite it in every case.' },
        ],
        correctOptionId: 'a',
        feedback:
          'The Constitution is the supreme law of the land; the Declaration is a famous statement of ideals, which is what makes the mix-up tempting.',
      },
    ],
  },
]

// ── Errors ─────────────────────────────────────────────────────────────────

export class StrategyTrackError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNKNOWN_MISSION'
  ) {
    super(message)
    this.name = 'StrategyTrackError'
  }
}

// ── Mission accessors ──────────────────────────────────────────────────────

export function getStrategyMissions(): StrategyMission[] {
  return MISSIONS
}

export function getStrategyMission(code: string): StrategyMission | null {
  return MISSIONS.find((m) => m.code === code) ?? null
}

export function getStrategyMissionCodes(): string[] {
  return MISSIONS.map((m) => m.code)
}

function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Strip the answer key and shuffle options. Built field by field — never a spread. */
function toServed(m: StrategyMission): StrategyMissionServed {
  return {
    code: m.code,
    title: m.title,
    objective: m.objective,
    instructions: m.instructions,
    tip: m.tip,
    checks: m.checks.map((c) => ({
      prompt: c.prompt,
      stimulus: c.stimulus,
      options: shuffled(c.options).map((o) => ({ id: o.id, text: o.text })),
    })),
  }
}

/** Every strategy mission, safe to send to a browser (no answer key). */
export function getStrategyMissionsServed(): StrategyMissionServed[] {
  return MISSIONS.map(toServed)
}

// ── Grading ────────────────────────────────────────────────────────────────

export interface StrategyRoundAnswer {
  checkIndex: number
  optionId: string
}

export interface StrategyCheckResult {
  checkIndex: number
  correct: boolean
  correctOptionId: string
  feedback: string
}

export interface StrategyRoundResult {
  missionCode: string
  /** True only when every check in the round was answered correctly. */
  correct: boolean
  checks: StrategyCheckResult[]
}

/**
 * Grade one apply-it round. Pure: no database, nothing recorded. A correct
 * round is one "use"; the device does the counting.
 */
export function gradeStrategyRound(
  missionCode: string,
  answers: StrategyRoundAnswer[]
): StrategyRoundResult {
  const mission = getStrategyMission(missionCode)
  if (!mission) {
    throw new StrategyTrackError(`Unknown strategy mission: ${missionCode}`, 'UNKNOWN_MISSION')
  }

  const answerByIndex = new Map(answers.map((a) => [a.checkIndex, a.optionId]))
  const checks: StrategyCheckResult[] = mission.checks.map((c, i) => ({
    checkIndex: i,
    correct: answerByIndex.get(i) === c.correctOptionId,
    correctOptionId: c.correctOptionId,
    feedback: c.feedback,
  }))

  return { missionCode, correct: checks.every((c) => c.correct), checks }
}
