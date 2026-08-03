/**
 * Parent Summary — privacy allowlist (pure, no DB).
 *
 * The list of fields a teacher shares with a parent is an explicit allowlist.
 * This test pins it so a future edit that adds a forbidden section (calibration,
 * distractor analysis, internal flags) fails loudly. Spec §23.
 */

import { PARENT_SUMMARY_FIELDS } from '@/lib/parent-summary'

const FORBIDDEN_TOKENS = [
  'calibration',
  'confidence',
  'distractor',
  'override',
  'decay',
  'accommodation',
  'answerkey',
  'answer_key',
  'iscorrect',
  'option',
  'questionbank',
  'itembank',
  // Focus Mode records (ADR 0020). Whether behavioural monitoring is
  // parent-appropriate is a district policy call, not a default — and a
  // "your child left the page 4 times" line in a progress summary is exactly
  // the kind of context that misleads without a teacher present to frame it.
  'integrity',
  'focusloss',
  'securemode',
]

describe('Parent Summary — field allowlist (spec §23)', () => {
  it('exposes exactly the parent-appropriate sections', () => {
    expect([...PARENT_SUMMARY_FIELDS]).toEqual([
      'currentMission',
      'mastery',
      'remediation',
      'recentAssessments',
      'eocReadiness',
      'suggestedReview',
      'positiveIndicators',
    ])
  })

  it('contains no forbidden field tokens', () => {
    for (const field of PARENT_SUMMARY_FIELDS) {
      const lower = field.toLowerCase()
      for (const token of FORBIDDEN_TOKENS) {
        expect(lower).not.toContain(token)
      }
    }
  })
})
