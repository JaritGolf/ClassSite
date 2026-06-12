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
