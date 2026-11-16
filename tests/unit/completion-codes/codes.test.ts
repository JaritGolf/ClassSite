/**
 * Completion codes and readiness tokens: sign, verify, tamper.
 */

import {
  issueCompletionCode,
  verifyCompletionCode,
  extractCodes,
  normalizeCode,
  CODE_SHAPE,
  issueReadinessToken,
  verifyReadinessToken,
} from '@/lib/completion-codes'

const env = { SESSION_SECRET: 'unit-test-secret-0123456789abcdef' }
const otherEnv = { SESSION_SECRET: 'a-different-secret-0123456789abcd' }
const now = new Date('2026-09-14T15:00:00Z')

describe('completion code', () => {
  const code = issueCompletionCode({ benchmarkCode: 'SS.7.CG.1.1', score: 0.8, now }, env)!

  it('has the documented shape and carries benchmark, score and date', () => {
    expect(code).toMatch(/^MCC-1\.1-80-20260914-[0-9A-HJKMNP-TV-Z]{10}$/)
    expect(code).toMatch(CODE_SHAPE)
  })

  it('a valid code verifies and reports its payload', () => {
    expect(verifyCompletionCode(code, env)).toEqual({
      valid: true,
      code,
      payload: { benchmarkCode: 'SS.7.CG.1.1', scorePercent: 80, dateStamp: '20260914' },
    })
  })

  it('EVERY single-character change fails', () => {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ.-'
    let tried = 0
    for (let i = 0; i < code.length; i++) {
      for (const ch of alphabet) {
        if (ch === code[i]) continue
        const tampered = code.slice(0, i) + ch + code.slice(i + 1)
        tried++
        expect(verifyCompletionCode(tampered, env).valid).toBe(false)
      }
    }
    expect(tried).toBeGreaterThan(900)
  })

  it('changing the score, the benchmark or the date fails', () => {
    expect(verifyCompletionCode(code.replace('-80-', '-100-'), env).valid).toBe(false)
    expect(verifyCompletionCode(code.replace('MCC-1.1-', 'MCC-1.2-'), env).valid).toBe(false)
    expect(verifyCompletionCode(code.replace('20260914', '20260915'), env).valid).toBe(false)
  })

  it('a code signed with another secret does not verify', () => {
    expect(verifyCompletionCode(code, otherEnv)).toMatchObject({ valid: false, reason: 'bad-signature' })
  })

  it('fails closed when the secret is missing', () => {
    expect(() => issueCompletionCode({ benchmarkCode: 'SS.7.CG.1.1', score: 1, now }, {})).toThrow()
    expect(verifyCompletionCode(code, {}).valid).toBe(false)
  })

  it('rejects malformed and non-canonical input', () => {
    for (const bad of ['', 'hello', 'MCC-1.1-80-20260914', 'MCC-1.1-080-20260914-AAAAAAAAAA', 'MCC-1.1-180-20260914-AAAAAAAAAA', 'MCC-1.1-80-20261340-AAAAAAAAAA']) {
      expect(verifyCompletionCode(bad, env)).toMatchObject({ valid: false })
    }
  })

  it('tolerates lower case, surrounding spaces and Crockford look-alikes in the signature', () => {
    expect(verifyCompletionCode(`  ${code.toLowerCase()} `, env).valid).toBe(true)
    const sig = code.slice(code.lastIndexOf('-') + 1)
    if (sig.includes('1')) {
      expect(verifyCompletionCode(code.slice(0, code.lastIndexOf('-') + 1) + sig.replace('1', 'L'), env).valid).toBe(true)
    }
    expect(normalizeCode('mcc-1.1-80-20260914-olib')).toBe('MCC-1.1-80-20260914-011B')
  })

  it('the payload has no identity: same benchmark, score and day give the same code', () => {
    const again = issueCompletionCode({ benchmarkCode: 'SS.7.CG.1.1', score: 0.8, now }, env)
    expect(again).toBe(code)
  })

  it('is only issued for SS.7.CG benchmarks', () => {
    expect(issueCompletionCode({ benchmarkCode: 'TEST.9999', score: 1, now }, env)).toBeNull()
  })

  it('uses the school day in US Eastern time', () => {
    const lateEvening = new Date('2026-09-15T02:30:00Z') // 10:30pm on the 14th, Eastern
    expect(issueCompletionCode({ benchmarkCode: 'SS.7.CG.2.3', score: 1, now: lateEvening }, env)).toContain('-20260914-')
  })
})

describe('extractCodes (runs in the teacher browser)', () => {
  it('pulls codes out of pasted text and leaves everything else behind', () => {
    const a = issueCompletionCode({ benchmarkCode: 'SS.7.CG.1.1', score: 1, now }, env)!
    const b = issueCompletionCode({ benchmarkCode: 'SS.7.CG.1.2', score: 0.8, now }, env)!
    const pasted = `Alex Example\t${a}\nJordan Sample: ${b.toLowerCase()} (late)\nno code here`
    const codes = extractCodes(pasted)
    expect(codes).toEqual([a, b])
    expect(codes.join(' ')).not.toMatch(/ALEX|JORDAN|EXAMPLE|SAMPLE/i)
    for (const c of codes) expect(c).toMatch(CODE_SHAPE)
  })

  it('CODE_SHAPE cannot match a name', () => {
    expect(CODE_SHAPE.test('Alex Example')).toBe(false)
    expect(CODE_SHAPE.test('MCC-Alex Example-1-2-3')).toBe(false)
  })
})

describe('readiness token', () => {
  const token = issueReadinessToken('SS.7.CG.1.1', now, env)

  it('verifies for its own benchmark only', () => {
    expect(verifyReadinessToken(token, 'SS.7.CG.1.1', env)).toBe(true)
    expect(verifyReadinessToken(token, 'SS.7.CG.1.2', env)).toBe(false)
  })

  it('fails on tampering, a different secret, and empty input', () => {
    expect(verifyReadinessToken(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A'), 'SS.7.CG.1.1', env)).toBe(false)
    expect(verifyReadinessToken(token, 'SS.7.CG.1.1', otherEnv)).toBe(false)
    expect(verifyReadinessToken(token, 'SS.7.CG.1.1', {})).toBe(false)
    expect(verifyReadinessToken(null, 'SS.7.CG.1.1', env)).toBe(false)
    expect(verifyReadinessToken('', 'SS.7.CG.1.1', env)).toBe(false)
  })
})
