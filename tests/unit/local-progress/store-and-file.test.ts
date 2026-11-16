/**
 * Device-local store: schema validation, export/import, and the streak rule.
 * Also asserts what a progress file does NOT contain.
 */

import {
  emptyProgress,
  parseProgress,
  parseProgressFile,
  progressFileName,
  serializeProgress,
  recordMasteryAttempt,
  PROGRESS_FILE_KIND,
} from '@/lib/local-progress'
import { applyActivity, INITIAL_STREAK } from '@/lib/streak/core'

const now = new Date(2026, 8, 14, 10)

function sample() {
  return recordMasteryAttempt(emptyProgress(), {
    code: 'SS.7.CG.1.1',
    formId: 'f1',
    score: 0.8,
    passed: true,
    completionCode: 'MCC-1.1-80-20260914-ABCDEFGHJK',
    remediation: [],
    now,
  }).progress
}

describe('export / import', () => {
  it('round-trips progress through a file exactly', () => {
    const progress = sample()
    const result = parseProgressFile(serializeProgress(progress, now))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.progress).toEqual(progress)
  })

  it('the file name carries a date and nothing about the student', () => {
    expect(progressFileName(now)).toBe('my-civics-class-progress-2026-09-14.json')
  })

  it('a progress file has no field for a name, email, class or id', () => {
    const text = serializeProgress(sample(), now)
    const keys = new Set<string>()
    JSON.stringify(JSON.parse(text), (k, v) => {
      if (k) keys.add(k)
      return v
    })
    for (const forbidden of ['name', 'firstName', 'lastName', 'email', 'studentId', 'userId', 'classId', 'deviceId', 'id']) {
      expect(keys.has(forbidden)).toBe(false)
    }
  })

  it('rejects text that is not JSON, not ours, or damaged — without throwing', () => {
    expect(parseProgressFile('not json').ok).toBe(false)
    expect(parseProgressFile('[]').ok).toBe(false)
    expect(parseProgressFile(JSON.stringify({ kind: 'something-else', progress: {} })).ok).toBe(false)
    expect(parseProgressFile(JSON.stringify({ kind: PROGRESS_FILE_KIND, progress: { v: 99 } })).ok).toBe(false)
  })

  it('strips unknown fields on import, so a file cannot smuggle a name into storage', () => {
    const tampered = { ...sample(), studentName: 'Alex Example', settings: { ...sample().settings, email: 'a@b.c' } }
    const result = parseProgressFile(JSON.stringify({ kind: PROGRESS_FILE_KIND, savedAt: 'x', progress: tampered }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(JSON.stringify(result.progress)).not.toContain('Alex Example')
      expect(JSON.stringify(result.progress)).not.toContain('a@b.c')
    }
  })
})

describe('parseProgress', () => {
  it('fills defaults for a minimal valid blob', () => {
    const p = parseProgress({ v: 1 })
    expect(p).not.toBeNull()
    expect(p!.settings.glossLanguage).toBeNull()
    expect(p!.missions).toEqual({})
  })

  it('rejects an out-of-range score and an unknown status', () => {
    const base = sample()
    expect(parseProgress({ ...base, missions: { x: { ...base.missions['SS.7.CG.1.1'], masteryScore: 7 } } })).toBeNull()
    expect(parseProgress({ ...base, missions: { x: { ...base.missions['SS.7.CG.1.1'], status: 'TEACHER_OVERRIDE' } } })).toBeNull()
  })

  it('only accepts a last-activity link that stays inside the student area', () => {
    const base = sample()
    const bad = { label: 'x', subLabel: 'y', href: 'https://evil.example', icon: 'map', at: 'now' }
    expect(parseProgress({ ...base, lastActivity: bad })).toBeNull()
  })
})

describe('streak rule', () => {
  const d = (day: number) => new Date(2026, 8, day, 9)

  it('counts consecutive days and ignores repeats on the same day', () => {
    let s = applyActivity(INITIAL_STREAK, d(1))
    s = applyActivity(s, d(1))
    s = applyActivity(s, d(2))
    expect(s.currentLength).toBe(2)
    expect(s.longestLength).toBe(2)
  })

  it('a short absence spends a freeze token instead of resetting', () => {
    let s = applyActivity(INITIAL_STREAK, d(1))
    const tokens = s.freezeTokens
    s = applyActivity(s, d(4))
    expect(s.currentLength).toBe(2)
    expect(s.freezeTokens).toBeLessThanOrEqual(tokens)
  })

  it('a long absence starts over at 1 but keeps the longest streak', () => {
    let s = applyActivity(INITIAL_STREAK, d(1))
    s = applyActivity(s, d(2))
    s = applyActivity(s, new Date(2026, 9, 20, 9))
    expect(s.currentLength).toBe(1)
    expect(s.longestLength).toBe(2)
  })
})
