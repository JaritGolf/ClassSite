/**
 * Teacher sign-in allowlist — mandatory, fails closed.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  parseAllowedEmails,
  isEmailAllowed,
  isTeacherEmailAllowed,
  isAllowlistConfigured,
} from '@/lib/auth/allowlist'

const SRC = join(__dirname, '../../../src')

describe('parseAllowedEmails', () => {
  it('returns an empty list for unset, empty and whitespace input', () => {
    expect(parseAllowedEmails(undefined)).toEqual([])
    expect(parseAllowedEmails('')).toEqual([])
    expect(parseAllowedEmails('  ,  , ')).toEqual([])
  })

  it('trims, lower-cases and drops entries that are not addresses', () => {
    expect(parseAllowedEmails(' Teacher@School.org , palmbeachschools.org ,b@x.io')).toEqual([
      'teacher@school.org',
      'b@x.io',
    ])
  })
})

describe('isEmailAllowed — fails closed', () => {
  it('denies everyone when the list is empty', () => {
    expect(isEmailAllowed('teacher@school.org', [])).toBe(false)
  })

  it('denies a missing email', () => {
    expect(isEmailAllowed(null, ['teacher@school.org'])).toBe(false)
    expect(isEmailAllowed(undefined, ['teacher@school.org'])).toBe(false)
  })

  it('matches the whole address, case-insensitively', () => {
    const list = ['teacher@school.org']
    expect(isEmailAllowed('Teacher@School.org', list)).toBe(true)
    expect(isEmailAllowed('student@school.org', list)).toBe(false)
    expect(isEmailAllowed('teacher@school.org.evil.com', list)).toBe(false)
    expect(isEmailAllowed('xteacher@school.org', list)).toBe(false)
  })
})

describe('isTeacherEmailAllowed / isAllowlistConfigured', () => {
  it('denies when TEACHER_ALLOWED_EMAILS is unset', () => {
    expect(isTeacherEmailAllowed('teacher@school.org', {})).toBe(false)
    expect(isAllowlistConfigured({})).toBe(false)
  })

  it('a domain-only value does not open the door to that domain', () => {
    const env = { TEACHER_ALLOWED_EMAILS: 'school.org' }
    expect(isTeacherEmailAllowed('anyone@school.org', env)).toBe(false)
    expect(isAllowlistConfigured(env)).toBe(false)
  })

  it('allows a listed address', () => {
    const env = { TEACHER_ALLOWED_EMAILS: 'teacher@school.org' }
    expect(isTeacherEmailAllowed('teacher@school.org', env)).toBe(true)
    expect(isAllowlistConfigured(env)).toBe(true)
  })
})

describe('sign-in surface', () => {
  const options = readFileSync(join(SRC, 'lib/auth/options.ts'), 'utf8')

  it('has Google as the only provider', () => {
    expect(options).toMatch(/GoogleProvider\(/)
    expect(options).not.toMatch(/CredentialsProvider/)
    expect(options).not.toMatch(/clever/i)
  })

  it('the Clever provider and the demo-login gate are gone', () => {
    expect(existsSync(join(SRC, 'lib/auth/providers/clever.ts'))).toBe(false)
    expect(existsSync(join(SRC, 'lib/auth/demo-mode.ts'))).toBe(false)
  })

  it('no source file reads the demo/mock login switches', () => {
    const walk = (dir: string): string[] => {
      const { readdirSync, statSync } = require('fs') as typeof import('fs')
      return readdirSync(dir).flatMap((e) => {
        const full = join(dir, e)
        return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(e) ? [full] : []
      })
    }
    const offenders = walk(SRC).filter((f) =>
      /DEMO_OPEN_LOGIN|MOCK_AUTH|mock-credentials/.test(readFileSync(f, 'utf8'))
    )
    expect(offenders).toEqual([])
  })
})
