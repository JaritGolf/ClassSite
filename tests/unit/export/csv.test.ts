/**
 * Unit — CSV helper (Phase 17, audit §36.18 item 2)
 *
 * Pure RFC-4180 quoting/escaping + formula-injection guard.
 */

import { escapeCsvField, toCsv, type CsvColumn } from '@/lib/export/csv'

describe('escapeCsvField', () => {
  it('passes simple values through unquoted', () => {
    expect(escapeCsvField('hello')).toBe('hello')
    expect(escapeCsvField(42)).toBe('42')
  })

  it('renders null/undefined as empty string', () => {
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField(undefined)).toBe('')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"')
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
    expect(escapeCsvField('has "quote"')).toBe('"has ""quote"""')
  })

  it('serializes Date as ISO and objects as JSON', () => {
    const d = new Date('2026-01-02T03:04:05.000Z')
    expect(escapeCsvField(d)).toBe('2026-01-02T03:04:05.000Z')
    expect(escapeCsvField({ a: 1 })).toBe('"{""a"":1}"')
  })

  it('neutralizes formula injection with a leading quote', () => {
    expect(escapeCsvField('=SUM(A1:A2)')).toBe('\'=SUM(A1:A2)')
    expect(escapeCsvField('+1')).toBe("'+1")
    expect(escapeCsvField('@cmd')).toBe("'@cmd")
    // A leading '-' is also guarded, then needs no further quoting.
    expect(escapeCsvField('-5')).toBe("'-5")
  })
})

describe('toCsv', () => {
  interface Row {
    name: string
    score: number
  }
  const columns: CsvColumn<Row>[] = [
    { key: 'name', header: 'Name' },
    { key: 'score', header: 'Score' },
  ]

  it('always emits a header row, even with no data', () => {
    expect(toCsv([], columns)).toBe('Name,Score')
  })

  it('joins rows with CRLF and orders columns as specified', () => {
    const csv = toCsv(
      [
        { name: 'Ada', score: 95 },
        { name: 'Grace, H.', score: 88 },
      ],
      columns
    )
    expect(csv).toBe('Name,Score\r\nAda,95\r\n"Grace, H.",88')
  })
})
