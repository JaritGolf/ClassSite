/**
 * Lesson-bank shape (pure, no DB) — ADR 0013 / spec §10.4.
 *
 * Every authored lesson must deliver the full guided-training template: enough
 * steps, at least one of each instructional type, and structured steps whose
 * JSON actually parses against the lesson-content contracts (a structured step
 * that falls back to text would silently degrade the student experience).
 * Registry-driven: new unit lesson banks are validated with zero test edits.
 */

import { ALL_LESSON_BANKS } from '../../../seed/lessons'
import { parseStepContent } from '@/lib/lesson-content'

const EXPECTED_KIND: Record<string, string> = {
  WORKED_EXAMPLE: 'worked-example',
  INTERACTIVE_CHECK: 'interactive-check',
  SOURCE_ANALYSIS: 'source-analysis',
}

describe('Lesson banks — guided-training template shape', () => {
  it('registry declares at least one bank', () => {
    expect(ALL_LESSON_BANKS.length).toBeGreaterThanOrEqual(1)
  })

  it('benchmark codes are unique across banks', () => {
    const codes = ALL_LESSON_BANKS.flatMap((b) => b.lessons.map((l) => l.benchmarkCode))
    expect(new Set(codes).size).toBe(codes.length)
  })

  for (const bank of ALL_LESSON_BANKS) {
    describe(bank.unitId, () => {
      for (const lesson of bank.lessons) {
        describe(lesson.benchmarkCode, () => {
          it('has a title, briefing body, and student-friendly target', () => {
            expect(lesson.title.trim()).not.toBe('')
            expect(lesson.body.trim().length).toBeGreaterThan(100)
            expect(lesson.studentFriendlyTarget.trim()).toMatch(/^I can /)
          })

          it('has at least 10 steps', () => {
            expect(lesson.steps.length).toBeGreaterThanOrEqual(10)
          })

          it('includes every instructional step type of the template', () => {
            const types = new Set(lesson.steps.map((s) => s.stepType))
            expect(types.has('NOTE')).toBe(true)
            expect(types.has('VOCABULARY')).toBe(true)
            expect(types.has('WORKED_EXAMPLE')).toBe(true)
            expect(types.has('INTERACTIVE_CHECK')).toBe(true)
            expect(types.has('SOURCE_ANALYSIS')).toBe(true)
          })

          it('has at least 4 interactive checks (retrieval after every chunk)', () => {
            const checks = lesson.steps.filter((s) => s.stepType === 'INTERACTIVE_CHECK')
            expect(checks.length).toBeGreaterThanOrEqual(4)
          })

          it('has at least one timeline visual organizer', () => {
            const timelines = lesson.steps.filter(
              (s) =>
                s.stepType === 'NOTE' &&
                parseStepContent(s.stepType, s.content).kind === 'timeline'
            )
            expect(timelines.length).toBeGreaterThanOrEqual(1)
          })

          it('ends with a Mission Debrief recap note', () => {
            const last = lesson.steps[lesson.steps.length - 1]
            expect(last.stepType).toBe('NOTE')
            expect(last.title).toMatch(/Debrief/)
          })

          it('every structured step parses against its contract (no silent text fallback)', () => {
            for (const step of lesson.steps) {
              const expected = EXPECTED_KIND[step.stepType]
              if (!expected) continue
              const parsed = parseStepContent(step.stepType, step.content)
              expect(`${step.stepType}:${step.title}:${parsed.kind}`).toBe(
                `${step.stepType}:${step.title}:${expected}`
              )
            }
          })

          it('NOTE steps carrying JSON parse as timelines (no raw JSON shown to students)', () => {
            for (const step of lesson.steps) {
              if (step.stepType !== 'NOTE' || !step.content.trimStart().startsWith('{')) continue
              const parsed = parseStepContent(step.stepType, step.content)
              expect(`${step.title}:${parsed.kind}`).toBe(`${step.title}:timeline`)
            }
          })

          it('every step has a title and non-trivial content', () => {
            for (const step of lesson.steps) {
              expect(step.title.trim()).not.toBe('')
              expect(step.content.trim().length).toBeGreaterThan(40)
            }
          })
        })
      }
    })
  }
})
