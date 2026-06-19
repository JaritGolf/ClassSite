/**
 * Audit 17 — Item 1: Audit-log query + export functions work.
 *  - exportAuditLogsCsv reflects rows visible to listAuditLogs
 *  - CSV is well-formed (header + one line per matching row)
 *  - action filter narrows the export
 * Prefix: test-audit17-01-
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { listAuditLogs, exportAuditLogsCsv } from '@/lib/audit'

const prisma = new PrismaClient()

const ACTION = 'TEST_AUDIT17_01_ACTION'
const ENTITY = 'TestAudit17Entity'

beforeAll(async () => {
  await prisma.auditLog.createMany({
    data: [
      { action: ACTION, entityType: ENTITY, entityId: 'e1', metadataJson: { n: 1, note: 'has, comma' } },
      { action: ACTION, entityType: ENTITY, entityId: 'e2', metadataJson: { n: 2 } },
      { action: ACTION, entityType: ENTITY, entityId: 'e3', metadataJson: Prisma.JsonNull },
    ],
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { action: ACTION } })
  await prisma.$disconnect()
})

describe('Audit 17 — Item 1: audit-log export', () => {
  it('exports the rows that listAuditLogs returns for the same filter', async () => {
    const { entries, total } = await listAuditLogs({ action: ACTION, limit: 1000 })
    expect(total).toBe(3)
    expect(entries).toHaveLength(3)

    const csv = await exportAuditLogsCsv({ action: ACTION })
    const lines = csv.split('\r\n')
    // header + 3 data rows
    expect(lines).toHaveLength(4)
    expect(lines[0]).toContain('Action')
    expect(lines[0]).toContain('Metadata')
    // every entity id appears
    expect(csv).toContain('e1')
    expect(csv).toContain('e2')
    expect(csv).toContain('e3')
    // embedded comma in metadata is quoted, not field-splitting
    expect(csv).toContain('"{""n"":1,""note"":""has, comma""}"')
  })

  it('narrows the export when filtered to a non-matching action', async () => {
    const csv = await exportAuditLogsCsv({ action: 'NO_SUCH_ACTION_audit17' })
    // header only
    expect(csv.split('\r\n')).toHaveLength(1)
  })
})
