/**
 * Shape guarantees for the accommodation enforcement registry.
 *
 * The catalog↔registry reconciliation itself lives in
 * tests/integration/accommodations/registry-catalog.test.ts, because the list a
 * teacher actually sees comes from the seeded Accommodation rows, not from a
 * constant. What is checked here is that every entry is *usable* — a registry
 * with an empty summary would render a status chip whose explainer says nothing,
 * which is the same failure this whole feature exists to remove.
 */

import {
  ACCOMMODATION_ENFORCEMENT,
  REGISTERED_ACCOMMODATION_CODES,
  getAccommodationEnforcement,
  getUnimplementedAccommodationCodes,
} from '@/lib/accommodations'

const VALID_STATUSES = ['enforced', 'satisfied-by-design', 'not-implemented']

describe('accommodation enforcement registry', () => {
  it('gives every code a valid status', () => {
    for (const code of REGISTERED_ACCOMMODATION_CODES) {
      expect(VALID_STATUSES).toContain(ACCOMMODATION_ENFORCEMENT[code].status)
    }
  })

  it('gives every code a non-trivial teacher-facing summary', () => {
    for (const code of REGISTERED_ACCOMMODATION_CODES) {
      const { summary } = ACCOMMODATION_ENFORCEMENT[code]
      expect(summary.trim().length).toBeGreaterThan(20)
    }
  })

  it('lists at least one surface for every enforced code', () => {
    for (const code of REGISTERED_ACCOMMODATION_CODES) {
      const entry = ACCOMMODATION_ENFORCEMENT[code]
      if (entry.status === 'enforced') {
        expect(entry.surfaces.length).toBeGreaterThan(0)
      }
    }
  })

  it('claims no surfaces for codes that change nothing', () => {
    for (const code of REGISTERED_ACCOMMODATION_CODES) {
      const entry = ACCOMMODATION_ENFORCEMENT[code]
      if (entry.status !== 'enforced') {
        expect(entry.surfaces).toEqual([])
      }
    }
  })

  it('says out loud that a not-implemented code changes nothing', () => {
    // The teacher-facing copy is the entire mitigation for a code that does
    // nothing. If it reads like a working feature, the equity gap is back.
    for (const code of getUnimplementedAccommodationCodes()) {
      expect(ACCOMMODATION_ENFORCEMENT[code].summary.toLowerCase()).toMatch(
        /not built|does not change|no effect/
      )
    }
  })

  it('returns null for an unknown code rather than pretending it works', () => {
    expect(getAccommodationEnforcement('ACC-DOES-NOT-EXIST')).toBeNull()
  })

  describe('the specific codes this feature was built to fix', () => {
    it('ACC-REDUCED-CHOICES, ACC-CHUNK and ACC-T2-VOCAB are enforced', () => {
      for (const code of ['ACC-REDUCED-CHOICES', 'ACC-CHUNK', 'ACC-T2-VOCAB']) {
        expect(ACCOMMODATION_ENFORCEMENT[code].status).toBe('enforced')
      }
    })

    it('ACC-EXT-TIME is satisfied by design, not silently missing', () => {
      // There is nothing in the platform to extend — no countdown, no expiry.
      // If a timed activity is ever introduced, this expectation should fail
      // and force a decision about honouring the accommodation.
      expect(ACCOMMODATION_ENFORCEMENT['ACC-EXT-TIME'].status).toBe(
        'satisfied-by-design'
      )
      expect(ACCOMMODATION_ENFORCEMENT['ACC-EXT-TIME'].summary).toMatch(
        /untimed|nothing .* is timed|no time limit|no countdown/i
      )
    })

    it('ACC-CONTEXT-BOOST is the only code still marked not-implemented', () => {
      expect(getUnimplementedAccommodationCodes()).toEqual(['ACC-CONTEXT-BOOST'])
    })
  })
})
