/**
 * Automated WCAG 2.1 AA check for staff pages.
 *
 * Complements tests/e2e/a11y.test.ts (student pages). Uses the per-role
 * session cookies minted by global-setup.
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function expectNoViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`)
  expect(summary, summary.join('\n')).toEqual([])
}

async function assertReached(page: import('@playwright/test').Page) {
  await expect(page).not.toHaveURL(/\/login|\/unauthorized/)
}

test.describe('teacher pages — WCAG A/AA', () => {
  test.use({ storageState: 'tests/e2e/.auth/teacher.json' })

  for (const path of ['/teacher/dashboard', '/teacher/check-codes', '/teacher/benchmarks']) {
    test(`${path} has no violations`, async ({ page }) => {
      await page.goto(path)
      await assertReached(page)
      await expectNoViolations(page)
    })
  }
})

test.describe('admin pages — WCAG A/AA', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' })

  test('/admin/audit has no violations', async ({ page }) => {
    await page.goto('/admin/audit')
    await assertReached(page)
    await expectNoViolations(page)
  })
})
