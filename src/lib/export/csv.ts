/**
 * CSV Export — shared helper (Phase 17)
 *
 * Hand-rolled RFC-4180 CSV serialization. No external dependency
 * (consistent with the project's no-new-deps precedent — see ADR 0008,
 * Pearson inlined in eoc-analytics/correlation.ts).
 *
 * Privacy: data lives in the response body, never in a URL/query string
 * (spec §25.2 — "No PII in URL parameters or query strings").
 */

import { NextResponse } from 'next/server'

/** A column definition: the source key plus the human-readable header. */
export interface CsvColumn<T> {
  key: keyof T
  header: string
}

/**
 * Escape a single CSV field per RFC 4180.
 *
 * A field is quoted when it contains a comma, double-quote, CR, or LF;
 * embedded double-quotes are doubled. null/undefined become empty strings.
 * A leading =, +, -, or @ is prefixed with a single quote to neutralize
 * spreadsheet formula injection.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''

  let str: string
  if (value instanceof Date) {
    str = value.toISOString()
  } else if (typeof value === 'object') {
    str = JSON.stringify(value)
  } else {
    str = String(value)
  }

  // Formula-injection guard for spreadsheet apps.
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Serialize an array of row objects to a CSV string using the given columns.
 * The header row is always emitted (even for zero rows). Lines are CRLF-joined
 * per RFC 4180.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(',')
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvField(row[c.key])).join(',')
  )
  return [headerLine, ...dataLines].join('\r\n')
}

/**
 * Wrap a CSV string in a downloadable Next.js response.
 * The filename goes in Content-Disposition only — never in the URL.
 */
export function csvResponse(filename: string, csv: string): NextResponse {
  // Strip anything risky from the filename; data is in the body, not the name.
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_')
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
