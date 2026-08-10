/**
 * The catalog and the registry must not drift apart.
 *
 * This is the guard for the root cause of the whole accommodation-enforcement
 * gap: `seed/benchmarks.ts` and the code that acts on a grant were two unrelated
 * lists, so seven codes drifted into being grantable, audit-logged IEP labels
 * that nothing read. Checked against the seeded rows rather than a constant
 * because the rows are what a teacher actually sees in the profile editor.
 *
 * If this fails, do not delete the assertion — either implement the code, or add
 * an honest registry entry saying it is not implemented.
 */

import { PrismaClient } from '@prisma/client'
import { REGISTERED_ACCOMMODATION_CODES } from '@/lib/accommodations'

const prisma = new PrismaClient()

let catalogCodes: string[]

beforeAll(async () => {
  const rows = await prisma.accommodation.findMany({ select: { code: true } })
  catalogCodes = rows.map((r) => r.code)
  if (catalogCodes.length === 0) {
    throw new Error('No accommodations seeded — run npm run db:seed')
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('accommodation catalog ↔ enforcement registry', () => {
  it('has an enforcement entry for every accommodation a teacher can grant', () => {
    const missing = catalogCodes.filter(
      (code) => !REGISTERED_ACCOMMODATION_CODES.includes(code)
    )
    expect(missing).toEqual([])
  })

  it('does not register enforcement for codes that are not in the catalog', () => {
    const orphaned = REGISTERED_ACCOMMODATION_CODES.filter(
      (code) => !catalogCodes.includes(code)
    )
    expect(orphaned).toEqual([])
  })
})
