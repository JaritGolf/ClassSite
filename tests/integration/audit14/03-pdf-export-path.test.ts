/**
 * Audit 14 — Item 3: The report can be exported as PDF.
 *
 * Phase 14 uses the browser print → "Save as PDF" path (matching teacher/reports;
 * a server-side PDF library is deferred to Phase 17). This static test asserts the
 * print wiring exists: the actions component calls window.print(), and the page +
 * toolbar use `print:` utilities so the printed output is clean.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const ACTIONS = join(ROOT, 'src/components/teacher/parent-summary/ParentSummaryActions.tsx')
const PAGE = join(ROOT, 'src/app/teacher/students/[studentId]/parent-summary/page.tsx')

describe('Audit 14 — Item 3: PDF export path (browser print)', () => {
  it('actions component triggers window.print()', () => {
    const src = readFileSync(ACTIONS, 'utf8')
    expect(src).toContain('window.print()')
  })

  it('toolbar is hidden when printing', () => {
    const src = readFileSync(ACTIONS, 'utf8')
    expect(src).toContain('print:hidden')
  })

  it('report page uses print utilities for clean output', () => {
    const src = readFileSync(PAGE, 'utf8')
    expect(src).toMatch(/print:/)
  })
})
