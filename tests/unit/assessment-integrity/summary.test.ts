/**
 * Pure threshold tests for the integrity summary.
 *
 * These encode a teacher-facing judgement — "is this worth looking at" — so
 * the boundaries are asserted explicitly rather than left to whatever the
 * implementation happens to do.
 */

import {
  summarizeIntegrityEvents,
  describeIntegritySummary,
  NOTABLE_FOCUS_LOSS_COUNT,
  NOTABLE_TOTAL_AWAY_MS,
  NOTABLE_BLOCKED_ACTION_COUNT,
  NOTABLE_FULLSCREEN_EXIT_COUNT,
  type IntegrityEventLike,
} from '@/lib/assessment-integrity'

const away = (durationMs: number): IntegrityEventLike => ({
  eventType: 'VISIBILITY_HIDDEN',
  durationMs,
})
const blocked = (): IntegrityEventLike => ({ eventType: 'COPY_BLOCKED' })
const fsExit = (): IntegrityEventLike => ({ eventType: 'FULLSCREEN_EXIT' })

describe('summarizeIntegrityEvents', () => {
  it('an empty record is "none" — the overwhelmingly common case', () => {
    const s = summarizeIntegrityEvents([])
    expect(s).toEqual({
      focusLossCount: 0,
      fullscreenExitCount: 0,
      totalAwayMs: 0,
      blockedActionCount: 0,
      level: 'none',
    })
  })

  it('counts BLUR and VISIBILITY_HIDDEN as departures and sums their durations', () => {
    const s = summarizeIntegrityEvents([
      { eventType: 'BLUR', durationMs: 1000 },
      { eventType: 'VISIBILITY_HIDDEN', durationMs: 2500 },
    ])
    expect(s.focusLossCount).toBe(2)
    expect(s.totalAwayMs).toBe(3500)
  })

  it('counts fullscreen exits separately from departures', () => {
    const s = summarizeIntegrityEvents([fsExit(), away(1000)])
    expect(s.fullscreenExitCount).toBe(1)
    expect(s.focusLossCount).toBe(1)
  })

  it('counts every blocked-input type', () => {
    const s = summarizeIntegrityEvents([
      { eventType: 'COPY_BLOCKED' },
      { eventType: 'CUT_BLOCKED' },
      { eventType: 'PASTE_BLOCKED' },
      { eventType: 'CONTEXT_MENU_BLOCKED' },
      { eventType: 'PRINT_BLOCKED' },
    ])
    expect(s.blockedActionCount).toBe(5)
  })

  // ── Level boundaries ────────────────────────────────────────────────────────

  it('a single brief departure is "minor", NOT notable', () => {
    // The whole point: one accidental click must not read as cheating.
    expect(summarizeIntegrityEvents([away(1000)]).level).toBe('minor')
  })

  it('becomes notable exactly at the departure-count threshold', () => {
    const under = Array.from({ length: NOTABLE_FOCUS_LOSS_COUNT - 1 }, () => away(100))
    const at = Array.from({ length: NOTABLE_FOCUS_LOSS_COUNT }, () => away(100))
    expect(summarizeIntegrityEvents(under).level).toBe('minor')
    expect(summarizeIntegrityEvents(at).level).toBe('notable')
  })

  it('becomes notable exactly at the total-away threshold, even on one departure', () => {
    expect(summarizeIntegrityEvents([away(NOTABLE_TOTAL_AWAY_MS - 1)]).level).toBe('minor')
    expect(summarizeIntegrityEvents([away(NOTABLE_TOTAL_AWAY_MS)]).level).toBe('notable')
  })

  it('becomes notable exactly at the blocked-action threshold', () => {
    const under = Array.from({ length: NOTABLE_BLOCKED_ACTION_COUNT - 1 }, blocked)
    const at = Array.from({ length: NOTABLE_BLOCKED_ACTION_COUNT }, blocked)
    expect(summarizeIntegrityEvents(under).level).toBe('minor')
    expect(summarizeIntegrityEvents(at).level).toBe('notable')
  })

  it('becomes notable exactly at the fullscreen-exit threshold', () => {
    const under = Array.from({ length: NOTABLE_FULLSCREEN_EXIT_COUNT - 1 }, fsExit)
    const at = Array.from({ length: NOTABLE_FULLSCREEN_EXIT_COUNT }, fsExit)
    expect(summarizeIntegrityEvents(under).level).toBe('minor')
    expect(summarizeIntegrityEvents(at).level).toBe('notable')
  })

  // ── Untrusted input ─────────────────────────────────────────────────────────

  it('ignores negative, null, and missing durations rather than skewing the total', () => {
    const s = summarizeIntegrityEvents([
      { eventType: 'BLUR', durationMs: -5000 },
      { eventType: 'BLUR', durationMs: null },
      { eventType: 'BLUR' },
      { eventType: 'BLUR', durationMs: 1000 },
    ])
    expect(s.focusLossCount).toBe(4)
    expect(s.totalAwayMs).toBe(1000)
  })

  it('ignores unknown event types instead of throwing', () => {
    // A future client emitting a type this build has not heard of must not
    // break a teacher's page render.
    const s = summarizeIntegrityEvents([
      { eventType: 'SOMETHING_NEW' },
      away(1000),
    ])
    expect(s.focusLossCount).toBe(1)
    expect(s.level).toBe('minor')
  })
})

describe('describeIntegritySummary', () => {
  it('says nothing happened when nothing happened', () => {
    expect(describeIntegritySummary(summarizeIntegrityEvents([]))).toBe(
      'No interruptions recorded'
    )
  })

  it('describes each recorded dimension', () => {
    const text = describeIntegritySummary(
      summarizeIntegrityEvents([away(4000), fsExit(), blocked()])
    )
    expect(text).toContain('left the page 1×')
    expect(text).toContain('4s away')
    expect(text).toContain('exited Focus Mode 1×')
    expect(text).toContain('1 blocked copy/paste')
  })
})
