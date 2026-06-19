/**
 * Tier-3 axe — WCAG 2.1 AA check on teacher + admin pages added in Phases 14 & 17.
 *
 * Complements tests/e2e/a11y.test.ts (student pages). Uses per-role storageState
 * written by global-setup (teacher.json / admin.json) and the teacherStudentId
 * fixture. Run with the dev server:
 *   node --env-file-if-exists=.env.local node_modules/.bin/playwright test tests/e2e/a11y-staff.test.ts
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'fs'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

let teacherStudentId = ''
try {
  teacherStudentId = JSON.parse(
    readFileSync('tests/e2e/.auth/fixtures.json', 'utf8')
  ).teacherStudentId
} catch {
  // fixtures written by global-setup; default to empty (test skips gracefully)
}

async function expectNoViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`
  )
  expect(summary, summary.join('\n')).toEqual([])
}

async function assertReached(page: import('@playwright/test').Page) {
  await expect(page).not.toHaveURL(/\/login|\/unauthorized/)
}

test.describe('teacher pages — WCAG A/AA', () => {
  test.use({ storageState: 'tests/e2e/.auth/teacher.json' })

  test('/teacher/reports has no violations', async ({ page }) => {
    await page.goto('/teacher/reports')
    await assertReached(page)
    await expectNoViolations(page)
  })

  test('/teacher/students/[id]/parent-summary has no violations', async ({ page }) => {
    test.skip(!teacherStudentId, 'no teacherStudentId fixture')
    await page.goto(`/teacher/students/${teacherStudentId}/parent-summary`)
    await assertReached(page)
    await expectNoViolations(page)
  })
})

test.describe('admin pages — WCAG A/AA', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })

  test('/admin/audit has no violations', async ({ page }) => {
    await page.goto('/admin/audit')
    await assertReached(page)
    await expectNoViolations(page)
  })

  test('/admin/retention has no violations', async ({ page }) => {
    await page.goto('/admin/retention')
    await assertReached(page)
    await expectNoViolations(page)
  })
})
