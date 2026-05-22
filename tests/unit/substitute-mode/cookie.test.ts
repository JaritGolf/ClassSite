/**
 * Unit Tests — Substitute Mode Cookie
 *
 * Tests the cookie name constant and guard logic.
 * Cookie set/get require Next.js server context so we test the pure constants
 * and the error class shape here.
 */

import { SUB_MODE_COOKIE } from '@/lib/substitute-mode/cookie'
import { SubModeError } from '@/lib/substitute-mode/guard'

describe('SUB_MODE_COOKIE', () => {
  it('has the expected cookie name', () => {
    expect(SUB_MODE_COOKIE).toBe('cq_sub_mode')
  })
})

describe('SubModeError', () => {
  it('has the correct name', () => {
    const err = new SubModeError('SUB_MODE_READ_ONLY', 'blocked')
    expect(err.name).toBe('SubModeError')
  })

  it('stores the code', () => {
    const err = new SubModeError('SUB_MODE_READ_ONLY', 'test error')
    expect(err.code).toBe('SUB_MODE_READ_ONLY')
  })

  it('stores the message', () => {
    const err = new SubModeError('SUB_MODE_READ_ONLY', 'test message')
    expect(err.message).toBe('test message')
  })

  it('is an instance of Error', () => {
    const err = new SubModeError('SUB_MODE_READ_ONLY', 'test')
    expect(err).toBeInstanceOf(Error)
  })
})
