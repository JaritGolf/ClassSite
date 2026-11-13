/**
 * Source Decoder Track
 *
 * A parallel 4-level mini-progression teaching stimulus-reading skills.
 * Mission definitions are hardcoded (not stored in DB — they are
 * instructional scaffolding, not content that varies per student).
 * Which levels a student has finished is remembered on the student's device
 * (src/lib/local-progress), not in the database.
 *
 * Spec reference: Section 16.4
 */


// ── Types ──────────────────────────────────────────────────────────────────

export type SourceDecoderActivityType =
  | 'HIGHLIGHT_ANSWER'
  | 'PARAPHRASE_CLAIM'
  | 'AUTHOR_PURPOSE'
  | 'COMPARE_SOURCES'

export interface SourceDecoderMission {
  level: 1 | 2 | 3 | 4
  title: string
  objective: string
  activityType: SourceDecoderActivityType
  instructions: string
  scaffoldingHint: string
}

// ── Hardcoded mission definitions ─────────────────────────────────────────

const MISSIONS: SourceDecoderMission[] = [
  {
    level: 1,
    title: 'Find the Evidence',
    objective:
      'Read the passage and highlight the sentence that best answers the question.',
    activityType: 'HIGHLIGHT_ANSWER',
    instructions:
      'Read the passage. The question is shown below it. Find and highlight the exact sentence that answers the question.',
    scaffoldingHint:
      'Look for key words from the question inside the passage. They often appear close to the answer sentence.',
  },
  {
    level: 2,
    title: 'Claim vs. Evidence',
    objective:
      "Identify the author's main claim and find one piece of evidence that supports it.",
    activityType: 'PARAPHRASE_CLAIM',
    instructions:
      "In your own words, write what the author is arguing (the claim). Then find one sentence from the passage that proves it (the evidence).",
    scaffoldingHint:
      'A claim answers "what does the author believe?" Evidence answers "how do they know?"',
  },
  {
    level: 3,
    title: "Author's Purpose",
    objective:
      "Determine whether the author is trying to inform, persuade, or explain — and whether the conclusion is stated or implied.",
    activityType: 'AUTHOR_PURPOSE',
    instructions:
      "Choose the author's purpose (inform, persuade, or explain). Then decide: does the author state the conclusion directly, or do they expect you to figure it out?",
    scaffoldingHint:
      'Look at the last sentence. Authors often state their conclusion there — or deliberately leave it for the reader.',
  },
  {
    level: 4,
    title: 'Source Showdown',
    objective:
      'Compare two sources on the same topic. Find one agreement and one disagreement.',
    activityType: 'COMPARE_SOURCES',
    instructions:
      'Read both passages about the same event. Write one thing both authors agree on. Write one thing they disagree about.',
    scaffoldingHint:
      'Look for the same event described in both. Do they say the same thing happened? Or do they explain it differently?',
  },
]

// ── Pure mission accessors ─────────────────────────────────────────────────

/** Return all 4 mission definitions. Pure function — no DB. */
export function getSourceDecoderMissions(): SourceDecoderMission[] {
  return MISSIONS
}

/** Return the mission for a specific level, or null if out of range. Pure function. */
export function getSourceDecoderMission(
  level: number
): SourceDecoderMission | null {
  return MISSIONS.find((m) => m.level === level) ?? null
}
