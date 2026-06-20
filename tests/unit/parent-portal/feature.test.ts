/**
 * Unit — FEATURE_PARENT_PORTAL flag (Phase 18).
 */

import { isParentPortalEnabled } from '@/lib/parent-portal/feature'

describe('isParentPortalEnabled', () => {
  const original = process.env.FEATURE_PARENT_PORTAL
  afterEach(() => {
    process.env.FEATURE_PARENT_PORTAL = original
  })

  it('is off by default / when unset', () => {
    delete process.env.FEATURE_PARENT_PORTAL
    expect(isParentPortalEnabled()).toBe(false)
  })

  it('is off for any value other than "true"', () => {
    process.env.FEATURE_PARENT_PORTAL = 'false'
    expect(isParentPortalEnabled()).toBe(false)
    process.env.FEATURE_PARENT_PORTAL = '1'
    expect(isParentPortalEnabled()).toBe(false)
  })

  it('is on only for the exact string "true"', () => {
    process.env.FEATURE_PARENT_PORTAL = 'true'
    expect(isParentPortalEnabled()).toBe(true)
  })
})
