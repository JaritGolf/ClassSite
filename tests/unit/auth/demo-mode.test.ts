/**
 * Unit — isMockAuthEnabled(): the mock-auth / open-login gate.
 *
 * The regression this pins down: DEMO_OPEN_LOGIN must be honoured on its own,
 * INDEPENDENTLY of NODE_ENV. Webpack substitutes process.env.NODE_ENV at build
 * time, so ANDing the demo flag with a NODE_ENV check compiles to dead code in
 * the production bundle and the flag silently never works — in exactly the
 * environment it exists to serve.
 */

import { isMockAuthEnabled } from '@/lib/auth/demo-mode'

type MutableEnv = Record<string, string | undefined>

describe('isMockAuthEnabled', () => {
  const original = {
    MOCK_AUTH: process.env.MOCK_AUTH,
    DEMO_OPEN_LOGIN: process.env.DEMO_OPEN_LOGIN,
    NODE_ENV: process.env.NODE_ENV,
  }

  const setEnv = (key: string, value: string | undefined) => {
    if (value === undefined) delete (process.env as MutableEnv)[key]
    else (process.env as MutableEnv)[key] = value
  }

  beforeEach(() => {
    setEnv('MOCK_AUTH', undefined)
    setEnv('DEMO_OPEN_LOGIN', undefined)
  })

  afterEach(() => {
    setEnv('MOCK_AUTH', original.MOCK_AUTH)
    setEnv('DEMO_OPEN_LOGIN', original.DEMO_OPEN_LOGIN)
    setEnv('NODE_ENV', original.NODE_ENV)
  })

  describe('closed by default', () => {
    it('is off when neither flag is set', () => {
      setEnv('NODE_ENV', 'development')
      expect(isMockAuthEnabled()).toBe(false)
    })

    it('is off in production when neither flag is set', () => {
      setEnv('NODE_ENV', 'production')
      expect(isMockAuthEnabled()).toBe(false)
    })
  })

  describe('MOCK_AUTH — the dev path (unchanged)', () => {
    it('is on with MOCK_AUTH=true outside production', () => {
      setEnv('NODE_ENV', 'development')
      setEnv('MOCK_AUTH', 'true')
      expect(isMockAuthEnabled()).toBe(true)
    })

    it('is OFF with MOCK_AUTH=true in production — rule #8 still holds', () => {
      setEnv('NODE_ENV', 'production')
      setEnv('MOCK_AUTH', 'true')
      expect(isMockAuthEnabled()).toBe(false)
    })

    it('is off for any value other than "true"', () => {
      setEnv('NODE_ENV', 'development')
      setEnv('MOCK_AUTH', 'false')
      expect(isMockAuthEnabled()).toBe(false)
      setEnv('MOCK_AUTH', '1')
      expect(isMockAuthEnabled()).toBe(false)
    })
  })

  describe('DEMO_OPEN_LOGIN — the public-demo escape hatch', () => {
    it('is on in PRODUCTION with DEMO_OPEN_LOGIN=true and MOCK_AUTH unset', () => {
      setEnv('NODE_ENV', 'production')
      setEnv('DEMO_OPEN_LOGIN', 'true')
      expect(isMockAuthEnabled()).toBe(true)
    })

    it('overrides an explicit MOCK_AUTH=false in production', () => {
      setEnv('NODE_ENV', 'production')
      setEnv('MOCK_AUTH', 'false')
      setEnv('DEMO_OPEN_LOGIN', 'true')
      expect(isMockAuthEnabled()).toBe(true)
    })

    it('is off for any value other than "true"', () => {
      setEnv('NODE_ENV', 'production')
      setEnv('DEMO_OPEN_LOGIN', 'false')
      expect(isMockAuthEnabled()).toBe(false)
      setEnv('DEMO_OPEN_LOGIN', '1')
      expect(isMockAuthEnabled()).toBe(false)
    })

    it('falls through to the MOCK_AUTH path when set to a non-"true" value', () => {
      setEnv('NODE_ENV', 'development')
      setEnv('DEMO_OPEN_LOGIN', 'false')
      setEnv('MOCK_AUTH', 'true')
      expect(isMockAuthEnabled()).toBe(true)
    })
  })
})
