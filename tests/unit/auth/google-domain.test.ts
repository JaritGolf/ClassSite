import {
  parseAllowedDomains,
  isEmailDomainAllowed,
  isGoogleEmailAllowed,
} from '@/lib/auth/google-domain'

describe('parseAllowedDomains', () => {
  it('returns an empty list for unset or blank input', () => {
    expect(parseAllowedDomains(undefined)).toEqual([])
    expect(parseAllowedDomains('')).toEqual([])
    expect(parseAllowedDomains('   ')).toEqual([])
    expect(parseAllowedDomains(',,')).toEqual([])
  })

  it('splits, trims, and lower-cases', () => {
    expect(parseAllowedDomains(' PalmBeachSchools.org , Example.COM ')).toEqual([
      'palmbeachschools.org',
      'example.com',
    ])
  })
})

describe('isEmailDomainAllowed', () => {
  const allow = ['palmbeachschools.org']

  it('allows everything when the allowlist is empty (documented default)', () => {
    expect(isEmailDomainAllowed('anyone@gmail.com', [])).toBe(true)
    expect(isEmailDomainAllowed(null, [])).toBe(true)
  })

  it('allows an exact domain match, case-insensitively', () => {
    expect(isEmailDomainAllowed('teacher@palmbeachschools.org', allow)).toBe(true)
    expect(isEmailDomainAllowed('Teacher@PalmBeachSchools.ORG', allow)).toBe(true)
  })

  it('rejects a non-listed domain', () => {
    expect(isEmailDomainAllowed('someone@gmail.com', allow)).toBe(false)
  })

  it('rejects a missing or malformed address once an allowlist is set', () => {
    expect(isEmailDomainAllowed(null, allow)).toBe(false)
    expect(isEmailDomainAllowed(undefined, allow)).toBe(false)
    expect(isEmailDomainAllowed('no-at-sign', allow)).toBe(false)
    expect(isEmailDomainAllowed('trailing@', allow)).toBe(false)
  })

  // The load-bearing case: a suffix match would accept these. Exact match must not.
  it('rejects look-alike domains that merely END WITH an allowed domain', () => {
    expect(isEmailDomainAllowed('attacker@evilpalmbeachschools.org', allow)).toBe(false)
    expect(isEmailDomainAllowed('attacker@palmbeachschools.org.evil.com', allow)).toBe(false)
  })

  // Subdomains are not implied — documented as the safe direction to be wrong in.
  it('does not imply subdomains', () => {
    expect(isEmailDomainAllowed('staff@mail.palmbeachschools.org', allow)).toBe(false)
    expect(
      isEmailDomainAllowed('staff@mail.palmbeachschools.org', [
        'palmbeachschools.org',
        'mail.palmbeachschools.org',
      ])
    ).toBe(true)
  })

  it('uses the LAST @ so an address-in-local-part cannot smuggle a domain', () => {
    expect(
      isEmailDomainAllowed('"teacher@palmbeachschools.org"@gmail.com', allow)
    ).toBe(false)
  })

  it('supports multiple allowed domains', () => {
    const multi = ['palmbeachschools.org', 'palmbeach.k12.fl.us']
    expect(isEmailDomainAllowed('a@palmbeachschools.org', multi)).toBe(true)
    expect(isEmailDomainAllowed('b@palmbeach.k12.fl.us', multi)).toBe(true)
    expect(isEmailDomainAllowed('c@gmail.com', multi)).toBe(false)
  })
})

describe('isGoogleEmailAllowed', () => {
  it('reads GOOGLE_ALLOWED_DOMAINS from the supplied env', () => {
    const env = { GOOGLE_ALLOWED_DOMAINS: 'palmbeachschools.org' }
    expect(isGoogleEmailAllowed('teacher@palmbeachschools.org', env)).toBe(true)
    expect(isGoogleEmailAllowed('someone@gmail.com', env)).toBe(false)
  })

  it('is a no-op when the variable is absent — preserves prior behaviour', () => {
    expect(isGoogleEmailAllowed('someone@gmail.com', {})).toBe(true)
  })
})
